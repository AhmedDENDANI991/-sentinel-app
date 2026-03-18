"""
C6 - ARCHIVER: Normalized Storage & GFI Archive Structure
Builds and maintains the canonical Dendani document archive.
"""

import os
import shutil
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any


ARCHIVE_ROOT = os.environ.get("ARCHIVE_ROOT", "/tmp/gfi-archive")


def generate_uuid() -> str:
    """Generate a UUID v4 for document identification."""
    return str(uuid.uuid4())


def build_archive_path(
    entity_code: str | None,
    project_code: str | None,
    archive_subpath: str,
) -> str:
    """
    Build the normalized archive path following GFI structure:
    /DENDANI-ARCHIVE/{ENTITY}/{PROJECT}/{TYPE}/
    """
    parts = [ARCHIVE_ROOT]

    if entity_code:
        parts.append(entity_code)
    else:
        parts.append("NON_CLASSE")

    if project_code:
        parts.append(project_code)
    else:
        parts.append("GENERAL")

    parts.append(archive_subpath)

    return os.path.join(*parts)


def generate_canonical_filename(
    doc_date: str | None,
    entity_code: str | None,
    project_code: str | None,
    doc_type: str | None,
    reference: str | None,
    doc_uuid: str,
    extension: str,
) -> str:
    """
    Generate canonical filename following GFI naming convention:
    {YYYYMMDD}_{ENTITY}_{PROJECT}_{TYPE}_{REF}_{UUID8}.{ext}
    """
    # Date part
    if doc_date:
        try:
            dt = datetime.strptime(doc_date, '%Y-%m-%d')
            date_str = dt.strftime('%Y%m%d')
        except ValueError:
            date_str = datetime.now().strftime('%Y%m%d')
    else:
        date_str = datetime.now().strftime('%Y%m%d')

    # Entity
    entity = entity_code or "INCONNU"

    # Project
    project = project_code or "GENERAL"

    # Type
    dtype = doc_type or "DOC"

    # Reference
    ref = reference or "NOREF"
    ref = ref.replace('/', '-').replace(' ', '-')[:20]

    # UUID short (8 chars)
    uuid_short = doc_uuid[:8]

    # Extension
    ext = extension.lstrip('.')

    return f"{date_str}_{entity}_{project}_{dtype}_{ref}_{uuid_short}.{ext}"


def archive_document(
    source_path: str,
    original_filename: str,
    classification: dict[str, Any],
    doc_uuid: str,
) -> dict[str, str]:
    """
    Archive a document to the normalized GFI structure.
    Returns the storage path and canonical filename.
    """
    extension = Path(original_filename).suffix

    # Generate canonical filename
    canonical_name = generate_canonical_filename(
        doc_date=classification.get('doc_date'),
        entity_code=classification.get('entity_code'),
        project_code=classification.get('project_code'),
        doc_type=classification.get('doc_type'),
        reference=classification.get('invoice_number'),
        doc_uuid=doc_uuid,
        extension=extension,
    )

    # Build archive path
    archive_subpath = classification.get('archive_path', 'NON_CLASSE')
    archive_dir = build_archive_path(
        entity_code=classification.get('entity_code'),
        project_code=classification.get('project_code'),
        archive_subpath=archive_subpath,
    )

    # Create directory structure
    os.makedirs(archive_dir, exist_ok=True)

    # Copy file to archive
    dest_path = os.path.join(archive_dir, canonical_name)
    shutil.copy2(source_path, dest_path)

    return {
        'storage_path': dest_path,
        'canonical_filename': canonical_name,
        'archive_directory': archive_dir,
    }


def get_archive_tree() -> dict[str, Any]:
    """Get the complete archive directory tree."""
    tree: dict[str, Any] = {}

    if not os.path.exists(ARCHIVE_ROOT):
        return tree

    for root, dirs, files in os.walk(ARCHIVE_ROOT):
        rel_path = os.path.relpath(root, ARCHIVE_ROOT)
        if rel_path == '.':
            rel_path = ''

        parts = rel_path.split(os.sep) if rel_path else []
        current = tree
        for part in parts:
            if part not in current:
                current[part] = {}
            current = current[part]

        for f in files:
            current[f] = {
                'type': 'file',
                'size': os.path.getsize(os.path.join(root, f)),
                'path': os.path.join(root, f),
            }

    return tree


def get_archive_stats() -> dict[str, Any]:
    """Get archive statistics."""
    total_files = 0
    total_size = 0
    by_entity: dict[str, int] = {}
    by_type: dict[str, int] = {}

    if not os.path.exists(ARCHIVE_ROOT):
        return {
            'total_files': 0,
            'total_size_bytes': 0,
            'total_size_mb': 0,
            'by_entity': {},
            'by_type': {},
        }

    for root, dirs, files in os.walk(ARCHIVE_ROOT):
        rel_path = os.path.relpath(root, ARCHIVE_ROOT)
        parts = rel_path.split(os.sep)

        for f in files:
            total_files += 1
            fpath = os.path.join(root, f)
            fsize = os.path.getsize(fpath)
            total_size += fsize

            # Count by entity (first directory level)
            if len(parts) >= 1 and parts[0] != '.':
                entity = parts[0]
                by_entity[entity] = by_entity.get(entity, 0) + 1

            # Count by type (third directory level)
            if len(parts) >= 3:
                dtype = parts[2]
                by_type[dtype] = by_type.get(dtype, 0) + 1

    return {
        'total_files': total_files,
        'total_size_bytes': total_size,
        'total_size_mb': round(total_size / (1024 * 1024), 2),
        'by_entity': by_entity,
        'by_type': by_type,
    }
