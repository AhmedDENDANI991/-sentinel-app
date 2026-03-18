"""
Main Pipeline Processor - Orchestrates all 7 layers (C1-C7)
Processes a single file through the entire pipeline.
"""

import os
import time
from datetime import datetime
from typing import Any

from app.database import get_db
from app.pipeline.c2_router import route_file
from app.pipeline.c3_parser import parse_file
from app.pipeline.c4_enricher import classify_document, generate_accounting_entry
from app.pipeline.c5_dedup import check_dedup
from app.pipeline.c6_archiver import archive_document, generate_uuid


def get_existing_docs() -> list[dict[str, Any]]:
    """Load existing documents for deduplication checking."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT uuid, sha256_hash, original_filename, ocr_text "
            "FROM documents WHERE processing_status != 'ERROR' "
            "ORDER BY created_at DESC LIMIT 1000"
        ).fetchall()
        return [dict(row) for row in rows]


def get_reference_data() -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Load Socle 0 reference data for classification."""
    with get_db() as conn:
        entities = [dict(r) for r in conn.execute("SELECT * FROM entities").fetchall()]
        projects = [dict(r) for r in conn.execute("SELECT * FROM projects").fetchall()]
    return entities, projects


def log_pipeline_step(doc_uuid: str, layer: str, status: str, message: str, duration_ms: int):
    """Log a pipeline processing step."""
    with get_db() as conn:
        conn.execute(
            "INSERT INTO ingestion_log (document_uuid, layer, status, message, duration_ms) "
            "VALUES (?, ?, ?, ?, ?)",
            (doc_uuid, layer, status, message, duration_ms),
        )


def process_file(file_path: str, original_filename: str) -> dict[str, Any]:
    """
    Process a single file through all 7 pipeline layers.
    Returns complete processing result.
    """
    doc_uuid = generate_uuid()
    file_size = os.path.getsize(file_path)
    result: dict[str, Any] = {
        'uuid': doc_uuid,
        'original_filename': original_filename,
        'file_size': file_size,
        'processing_status': 'PENDING',
        'layers': {},
    }

    total_start = time.time()

    # ===== C2: ROUTER =====
    t0 = time.time()
    try:
        routing = route_file(file_path, original_filename)
        result['layers']['C2_ROUTER'] = routing
        result['mime_type'] = routing['mime_type']
        log_pipeline_step(doc_uuid, 'C2_ROUTER', 'OK',
                          f"MIME: {routing['mime_type']}, Parser: {routing['parser']}, Priority: {routing['priority']}",
                          int((time.time() - t0) * 1000))
    except Exception as e:
        log_pipeline_step(doc_uuid, 'C2_ROUTER', 'ERROR', str(e), int((time.time() - t0) * 1000))
        result['processing_status'] = 'ERROR'
        result['error'] = f"C2 Router error: {e}"
        _save_document(result, doc_uuid)
        return result

    # ===== C3: PARSER =====
    t0 = time.time()
    try:
        parsed = parse_file(file_path, routing['mime_type'], routing['parser'])
        result['layers']['C3_PARSER'] = {
            'parser_used': parsed.get('parser_used'),
            'parse_success': parsed.get('parse_success'),
            'text_length': len(parsed.get('text', '')),
            'tables_count': len(parsed.get('tables', [])),
            'has_financial_entities': bool(parsed.get('financial_entities')),
        }
        result['text'] = parsed.get('text', '')
        result['financial_entities'] = parsed.get('financial_entities', {})
        log_pipeline_step(doc_uuid, 'C3_PARSER', 'OK',
                          f"Text: {len(parsed.get('text', ''))} chars, Tables: {len(parsed.get('tables', []))}",
                          int((time.time() - t0) * 1000))
    except Exception as e:
        log_pipeline_step(doc_uuid, 'C3_PARSER', 'ERROR', str(e), int((time.time() - t0) * 1000))
        result['text'] = ''
        result['financial_entities'] = {}

    # ===== C4: ENRICHER =====
    t0 = time.time()
    try:
        entities_ref, projects_ref = get_reference_data()
        classification = classify_document(
            text=result.get('text', ''),
            filename=original_filename,
            metadata=parsed.get('metadata', {}),
            financial_entities=result.get('financial_entities', {}),
            entities_ref=entities_ref,
            projects_ref=projects_ref,
        )
        result['layers']['C4_ENRICHER'] = classification
        result['classification'] = classification
        log_pipeline_step(doc_uuid, 'C4_ENRICHER', 'OK',
                          f"Type: {classification.get('doc_type')}, Entity: {classification.get('entity_code')}, "
                          f"Project: {classification.get('project_code')}, Confidence: {classification.get('confidence_score')}%",
                          int((time.time() - t0) * 1000))
    except Exception as e:
        log_pipeline_step(doc_uuid, 'C4_ENRICHER', 'ERROR', str(e), int((time.time() - t0) * 1000))
        classification = {'confidence_score': 0, 'archive_path': 'NON_CLASSE'}
        result['classification'] = classification

    # ===== C5: DEDUP =====
    t0 = time.time()
    try:
        existing = get_existing_docs()
        dedup = check_dedup(file_path, result.get('text', ''), existing)
        result['layers']['C5_DEDUP'] = {
            'is_duplicate': dedup['is_duplicate'],
            'dedup_level': dedup.get('dedup_level'),
            'similarity_score': dedup.get('similarity_score'),
            'action': dedup['action'],
            'duplicate_of': dedup.get('duplicate_of'),
        }
        result['sha256_hash'] = dedup['sha256_hash']
        result['is_duplicate'] = dedup['is_duplicate']

        if dedup['action'] == 'SUPPRESS':
            result['processing_status'] = 'DUPLICATE'
            log_pipeline_step(doc_uuid, 'C5_DEDUP', 'DUPLICATE',
                              f"Doublon exact de {dedup.get('duplicate_of')}",
                              int((time.time() - t0) * 1000))
            _save_document(result, doc_uuid, dedup_info=dedup)
            return result
        elif dedup['action'] == 'QUARANTINE':
            result['processing_status'] = 'QUARANTINE'

        log_pipeline_step(doc_uuid, 'C5_DEDUP', 'OK',
                          f"Action: {dedup['action']}, Duplicate: {dedup['is_duplicate']}",
                          int((time.time() - t0) * 1000))
    except Exception as e:
        log_pipeline_step(doc_uuid, 'C5_DEDUP', 'ERROR', str(e), int((time.time() - t0) * 1000))
        result['sha256_hash'] = ''

    # ===== C6: ARCHIVER =====
    t0 = time.time()
    try:
        archive_result = archive_document(
            source_path=file_path,
            original_filename=original_filename,
            classification=classification,
            doc_uuid=doc_uuid,
        )
        result['layers']['C6_ARCHIVER'] = archive_result
        result['storage_path'] = archive_result['storage_path']
        result['canonical_filename'] = archive_result['canonical_filename']
        log_pipeline_step(doc_uuid, 'C6_ARCHIVER', 'OK',
                          f"Archived: {archive_result['canonical_filename']}",
                          int((time.time() - t0) * 1000))
    except Exception as e:
        log_pipeline_step(doc_uuid, 'C6_ARCHIVER', 'ERROR', str(e), int((time.time() - t0) * 1000))
        result['storage_path'] = file_path

    # ===== C7: FEEDER =====
    t0 = time.time()
    try:
        accounting_entry = generate_accounting_entry(classification)
        result['layers']['C7_FEEDER'] = {
            'has_accounting_entry': accounting_entry is not None,
            'entry': accounting_entry,
        }
        if accounting_entry:
            _save_accounting_entry(doc_uuid, accounting_entry)
        log_pipeline_step(doc_uuid, 'C7_FEEDER', 'OK',
                          f"Accounting entry: {'YES' if accounting_entry else 'NO'}",
                          int((time.time() - t0) * 1000))
    except Exception as e:
        log_pipeline_step(doc_uuid, 'C7_FEEDER', 'ERROR', str(e), int((time.time() - t0) * 1000))

    # Final status
    if result['processing_status'] not in ('DUPLICATE', 'QUARANTINE', 'ERROR'):
        result['processing_status'] = 'PROCESSED'

    total_duration = int((time.time() - total_start) * 1000)
    result['total_duration_ms'] = total_duration

    # Save to database
    _save_document(result, doc_uuid)

    return result


def _save_document(result: dict[str, Any], doc_uuid: str, dedup_info: dict[str, Any] | None = None):
    """Save processed document to database."""
    classification = result.get('classification', {})
    with get_db() as conn:
        conn.execute(
            """INSERT INTO documents (
                uuid, original_filename, canonical_filename, mime_type, file_size,
                entity_code, project_code, doc_type, doc_subtype,
                doc_date, period_year, period_month,
                amount_ht, amount_tva, amount_ttc,
                counterparty_name, counterparty_nif, invoice_number,
                sha256_hash, storage_path, ocr_text,
                confidence_score, processing_status,
                classification_method, duplicate_of, processed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                doc_uuid,
                result.get('original_filename', ''),
                result.get('canonical_filename', ''),
                result.get('mime_type', ''),
                result.get('file_size', 0),
                classification.get('entity_code'),
                classification.get('project_code'),
                classification.get('doc_type'),
                classification.get('doc_subtype'),
                classification.get('doc_date'),
                classification.get('period_year'),
                classification.get('period_month'),
                classification.get('amount_ht'),
                classification.get('amount_tva'),
                classification.get('amount_ttc'),
                classification.get('counterparty_name'),
                classification.get('counterparty_nif'),
                classification.get('invoice_number'),
                result.get('sha256_hash', ''),
                result.get('storage_path', ''),
                result.get('text', '')[:50000],  # Limit text storage
                classification.get('confidence_score', 0),
                result.get('processing_status', 'ERROR'),
                classification.get('classification_method', ''),
                dedup_info.get('duplicate_of') if dedup_info else None,
                datetime.now().isoformat(),
            ),
        )

        # Log dedup if applicable
        if dedup_info and dedup_info.get('is_duplicate'):
            conn.execute(
                "INSERT INTO dedup_log (document_uuid, duplicate_uuid, dedup_level, similarity_score, action_taken) "
                "VALUES (?, ?, ?, ?, ?)",
                (
                    doc_uuid,
                    dedup_info.get('duplicate_of'),
                    dedup_info.get('dedup_level'),
                    dedup_info.get('similarity_score'),
                    dedup_info.get('action'),
                ),
            )


def _save_accounting_entry(doc_uuid: str, entry: dict[str, Any]):
    """Save accounting entry to database."""
    with get_db() as conn:
        conn.execute(
            """INSERT INTO accounting_entries (
                document_uuid, entry_date, journal,
                account_debit, account_credit, label, amount,
                entity_code, project_code, confidence_score, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                doc_uuid,
                entry.get('entry_date'),
                entry.get('journal'),
                entry.get('account_debit'),
                entry.get('account_credit'),
                entry.get('label'),
                entry.get('amount'),
                entry.get('entity_code'),
                entry.get('project_code'),
                entry.get('confidence_score'),
                entry.get('status'),
            ),
        )
