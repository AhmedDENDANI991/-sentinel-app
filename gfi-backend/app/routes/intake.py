"""
C1 - INTAKE: File Upload & Bulk Ingestion API
Receives files via HTTP upload and processes them through the pipeline.
"""

import os
import shutil
import tempfile
from typing import Any

from fastapi import APIRouter, File, UploadFile, BackgroundTasks

from app.pipeline.processor import process_file

router = APIRouter()

UPLOAD_DIR = "/tmp/gfi-uploads"


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)) -> dict[str, Any]:
    """
    Upload a single file for ingestion through the full pipeline.
    Synchronous processing - returns result immediately.
    """
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    # Save uploaded file
    temp_path = os.path.join(UPLOAD_DIR, file.filename or "unknown")
    with open(temp_path, "wb") as f:
        content = await file.read()
        f.write(content)

    # Process through pipeline
    try:
        result = process_file(temp_path, file.filename or "unknown")

        return {
            "status": "success",
            "document": {
                "uuid": result["uuid"],
                "original_filename": result["original_filename"],
                "canonical_filename": result.get("canonical_filename"),
                "mime_type": result.get("mime_type"),
                "file_size": result.get("file_size"),
                "processing_status": result["processing_status"],
                "classification": result.get("classification", {}),
                "is_duplicate": result.get("is_duplicate", False),
                "total_duration_ms": result.get("total_duration_ms"),
            },
            "pipeline_layers": {
                k: v for k, v in result.get("layers", {}).items()
                if k != "C3_PARSER"  # Don't send raw text in response
            },
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "filename": file.filename,
        }
    finally:
        # Clean up temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)


@router.post("/upload-batch")
async def upload_batch(files: list[UploadFile] = File(...)) -> dict[str, Any]:
    """
    Upload multiple files for batch ingestion.
    Processes all files sequentially and returns results.
    """
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    results = []
    errors = []

    for file in files:
        temp_path = os.path.join(UPLOAD_DIR, file.filename or "unknown")
        try:
            with open(temp_path, "wb") as f:
                content = await file.read()
                f.write(content)

            result = process_file(temp_path, file.filename or "unknown")
            results.append({
                "uuid": result["uuid"],
                "original_filename": result["original_filename"],
                "processing_status": result["processing_status"],
                "doc_type": result.get("classification", {}).get("doc_type"),
                "entity_code": result.get("classification", {}).get("entity_code"),
                "project_code": result.get("classification", {}).get("project_code"),
                "confidence_score": result.get("classification", {}).get("confidence_score"),
                "is_duplicate": result.get("is_duplicate", False),
            })
        except Exception as e:
            errors.append({
                "filename": file.filename,
                "error": str(e),
            })
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    processed = len([r for r in results if r["processing_status"] == "PROCESSED"])
    duplicates = len([r for r in results if r["processing_status"] == "DUPLICATE"])
    quarantine = len([r for r in results if r["processing_status"] == "QUARANTINE"])

    return {
        "status": "success",
        "summary": {
            "total": len(files),
            "processed": processed,
            "duplicates": duplicates,
            "quarantine": quarantine,
            "errors": len(errors),
        },
        "results": results,
        "errors": errors,
    }
