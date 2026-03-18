"""
C2 - ROUTER: Format Detection & Routing
Detects real MIME type via magic bytes and routes to appropriate parser.
"""

import mimetypes
import struct
from pathlib import Path

# Magic bytes signatures for common formats
MAGIC_SIGNATURES = {
    b'%PDF': 'application/pdf',
    b'PK\x03\x04': 'application/zip',  # Also DOCX, XLSX, PPTX
    b'\xd0\xcf\x11\xe0': 'application/x-ole-storage',  # DOC, XLS, PPT (old)
    b'\x89PNG': 'image/png',
    b'\xff\xd8\xff': 'image/jpeg',
    b'II\x2a\x00': 'image/tiff',
    b'MM\x00\x2a': 'image/tiff',
    b'BM': 'image/bmp',
    b'AC10': 'image/vnd.dwg',  # AutoCAD DWG
    b'Rar!': 'application/x-rar-compressed',
    b'7z\xbc\xaf': 'application/x-7z-compressed',
    b'{\n': 'application/json',
    b'{\r\n': 'application/json',
    b'<?xml': 'application/xml',
    b'ISO-10303': 'application/x-step',  # IFC
}

# Extension to MIME type mapping
EXT_MIME_MAP = {
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc': 'application/msword',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xls': 'application/vnd.ms-excel',
    '.csv': 'text/csv',
    '.tsv': 'text/tab-separated-values',
    '.txt': 'text/plain',
    '.rtf': 'application/rtf',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.tiff': 'image/tiff',
    '.tif': 'image/tiff',
    '.bmp': 'image/bmp',
    '.dwg': 'image/vnd.dwg',
    '.dxf': 'image/vnd.dxf',
    '.rvt': 'application/x-revit',
    '.ifc': 'application/x-step',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.7z': 'application/x-7z-compressed',
}

# Parser assignment by detected type
PARSER_MAP = {
    'application/pdf': 'pdf_parser',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'excel_parser',
    'application/vnd.ms-excel': 'excel_parser',
    'text/csv': 'csv_parser',
    'text/tab-separated-values': 'csv_parser',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx_parser',
    'application/msword': 'docx_parser',
    'application/rtf': 'text_parser',
    'text/plain': 'text_parser',
    'image/jpeg': 'image_parser',
    'image/png': 'image_parser',
    'image/tiff': 'image_parser',
    'image/bmp': 'image_parser',
    'image/vnd.dwg': 'dwg_parser',
    'image/vnd.dxf': 'dwg_parser',
    'application/x-revit': 'revit_parser',
    'application/x-step': 'ifc_parser',
    'application/json': 'json_parser',
    'application/xml': 'xml_parser',
    'application/zip': 'archive_parser',
    'application/x-rar-compressed': 'archive_parser',
    'application/x-7z-compressed': 'archive_parser',
    'application/x-ole-storage': 'ole_parser',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx_parser',
}

# Priority levels
PRIORITY_MAP = {
    'pdf_parser': 1,       # CRITIQUE - documents financiers
    'excel_parser': 1,     # CRITIQUE
    'csv_parser': 1,       # CRITIQUE
    'json_parser': 1,      # CRITIQUE
    'xml_parser': 1,       # CRITIQUE
    'docx_parser': 1,      # CRITIQUE
    'ole_parser': 1,       # CRITIQUE
    'archive_parser': 2,   # ELEVE
    'dwg_parser': 2,       # ELEVE
    'revit_parser': 2,     # ELEVE
    'ifc_parser': 2,       # ELEVE
    'image_parser': 3,     # MOYEN
    'text_parser': 3,      # MOYEN
    'pptx_parser': 3,      # MOYEN
}

# Document type categories
DOC_CATEGORIES = {
    'pdf_parser': 'FINANCIER',
    'excel_parser': 'FINANCIER',
    'csv_parser': 'FINANCIER',
    'docx_parser': 'BUREAUTIQUE',
    'ole_parser': 'BUREAUTIQUE',
    'pptx_parser': 'BUREAUTIQUE',
    'text_parser': 'BUREAUTIQUE',
    'image_parser': 'IMAGE',
    'dwg_parser': 'TECHNIQUE',
    'revit_parser': 'TECHNIQUE',
    'ifc_parser': 'TECHNIQUE',
    'json_parser': 'DONNEES_STRUCTUREES',
    'xml_parser': 'DONNEES_STRUCTUREES',
    'archive_parser': 'ARCHIVE',
}


def detect_mime_by_magic(file_path: str) -> str | None:
    """Detect MIME type by reading magic bytes from file header."""
    try:
        with open(file_path, 'rb') as f:
            header = f.read(16)

        for signature, mime in MAGIC_SIGNATURES.items():
            if header.startswith(signature):
                # Special handling for ZIP-based formats (DOCX, XLSX, PPTX)
                if mime == 'application/zip':
                    ext = Path(file_path).suffix.lower()
                    if ext in ('.docx', '.doc'):
                        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                    elif ext in ('.xlsx', '.xls'):
                        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    elif ext == '.pptx':
                        return 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
                    return mime
                # OLE storage: old Office formats
                if mime == 'application/x-ole-storage':
                    ext = Path(file_path).suffix.lower()
                    if ext == '.doc':
                        return 'application/msword'
                    elif ext == '.xls':
                        return 'application/vnd.ms-excel'
                    return mime
                return mime
        return None
    except Exception:
        return None


def detect_mime_by_extension(filename: str) -> str | None:
    """Detect MIME type by file extension."""
    ext = Path(filename).suffix.lower()
    return EXT_MIME_MAP.get(ext)


def detect_mime(file_path: str, filename: str) -> str:
    """
    Double verification: magic bytes + extension.
    Magic bytes take priority over extension.
    """
    mime_magic = detect_mime_by_magic(file_path)
    mime_ext = detect_mime_by_extension(filename)

    # Magic bytes are more reliable
    if mime_magic:
        return mime_magic
    if mime_ext:
        return mime_ext

    # Fallback to mimetypes library
    guessed, _ = mimetypes.guess_type(filename)
    return guessed or 'application/octet-stream'


def route_file(file_path: str, filename: str) -> dict:
    """
    Route a file to the appropriate parser based on detected MIME type.
    Returns routing info with parser, priority, and category.
    """
    mime_type = detect_mime(file_path, filename)
    parser = PARSER_MAP.get(mime_type, 'unknown_parser')
    priority = PRIORITY_MAP.get(parser, 4)
    category = DOC_CATEGORIES.get(parser, 'INCONNU')

    return {
        'mime_type': mime_type,
        'parser': parser,
        'priority': priority,
        'category': category,
        'filename': filename,
    }
