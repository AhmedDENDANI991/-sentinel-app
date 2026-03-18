"""
C3 - PARSER: Intelligent Content Extraction
Multi-format parser supporting PDF, Excel, CSV, DOCX, images, JSON, XML, etc.
"""

import csv
import io
import json
import re
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path
from typing import Any


def parse_file(file_path: str, mime_type: str, parser_name: str) -> dict[str, Any]:
    """
    Main parser dispatcher. Routes to the appropriate parser based on parser_name.
    Returns extracted content and metadata.
    """
    parsers = {
        'pdf_parser': parse_pdf,
        'excel_parser': parse_excel,
        'csv_parser': parse_csv,
        'docx_parser': parse_docx,
        'text_parser': parse_text,
        'image_parser': parse_image,
        'json_parser': parse_json,
        'xml_parser': parse_xml,
        'dwg_parser': parse_dwg,
        'revit_parser': parse_technical,
        'ifc_parser': parse_technical,
        'archive_parser': parse_archive,
        'ole_parser': parse_ole,
        'pptx_parser': parse_pptx,
    }

    parser_func = parsers.get(parser_name, parse_unknown)
    try:
        result = parser_func(file_path)
        result['parser_used'] = parser_name
        result['parse_success'] = True

        # Extract financial entities from the text
        if result.get('text'):
            result['financial_entities'] = extract_financial_entities(result['text'])

        return result
    except Exception as e:
        return {
            'parser_used': parser_name,
            'parse_success': False,
            'error': str(e),
            'text': '',
            'metadata': {},
            'tables': [],
            'financial_entities': {},
        }


def parse_pdf(file_path: str) -> dict[str, Any]:
    """Parse PDF files - both native and scanned."""
    try:
        import fitz  # PyMuPDF
    except ImportError:
        return _fallback_text_extract(file_path, "PDF parser (PyMuPDF) not available")

    doc = fitz.open(file_path)
    full_text = ""
    tables: list[list[list[str]]] = []
    metadata = {
        'page_count': len(doc),
        'title': doc.metadata.get('title', ''),
        'author': doc.metadata.get('author', ''),
        'creation_date': doc.metadata.get('creationDate', ''),
    }

    for page in doc:
        text = page.get_text()
        full_text += text + "\n"

        # Try to extract table-like structures
        blocks = page.get_text("dict")["blocks"]
        for block in blocks:
            if "lines" in block:
                for line in block["lines"]:
                    spans = [span["text"].strip() for span in line["spans"] if span["text"].strip()]
                    if len(spans) > 2:
                        tables.append([spans])

    doc.close()

    # If very little text extracted, it might be a scanned PDF
    is_scanned = len(full_text.strip()) < 50 and metadata['page_count'] > 0

    return {
        'text': full_text.strip(),
        'metadata': metadata,
        'tables': tables[:50],
        'is_scanned': is_scanned,
        'needs_ocr': is_scanned,
    }


def parse_excel(file_path: str) -> dict[str, Any]:
    """Parse Excel files (.xlsx, .xls)."""
    try:
        import openpyxl
    except ImportError:
        return _fallback_text_extract(file_path, "Excel parser (openpyxl) not available")

    wb = openpyxl.load_workbook(file_path, data_only=True, read_only=True)
    sheets_data = {}
    all_text = ""
    tables = []

    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
        rows = []
        for row in ws.iter_rows(max_row=5000, values_only=True):
            cleaned = [str(cell) if cell is not None else "" for cell in row]
            if any(c for c in cleaned):
                rows.append(cleaned)
                all_text += " ".join(cleaned) + "\n"

        sheets_data[sheet_name] = rows[:100]
        if rows:
            tables.append(rows[:100])

    wb.close()

    return {
        'text': all_text.strip(),
        'metadata': {'sheet_count': len(wb.sheetnames), 'sheet_names': wb.sheetnames},
        'tables': tables,
        'sheets_data': sheets_data,
    }


def parse_csv(file_path: str) -> dict[str, Any]:
    """Parse CSV/TSV files."""
    # Auto-detect encoding
    encodings = ['utf-8', 'windows-1252', 'iso-8859-1', 'cp1256']
    content = None

    for enc in encodings:
        try:
            with open(file_path, 'r', encoding=enc) as f:
                content = f.read()
            break
        except (UnicodeDecodeError, UnicodeError):
            continue

    if content is None:
        with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()

    # Detect delimiter
    sniffer = csv.Sniffer()
    try:
        dialect = sniffer.sniff(content[:8192])
        delimiter = dialect.delimiter
    except csv.Error:
        delimiter = ',' if ',' in content else '\t'

    reader = csv.reader(io.StringIO(content), delimiter=delimiter)
    rows = []
    for i, row in enumerate(reader):
        if i >= 5000:
            break
        rows.append(row)

    return {
        'text': content[:50000],
        'metadata': {'row_count': len(rows), 'delimiter': delimiter},
        'tables': [rows[:100]],
    }


def parse_docx(file_path: str) -> dict[str, Any]:
    """Parse DOCX files."""
    try:
        from docx import Document
    except ImportError:
        return _fallback_text_extract(file_path, "DOCX parser (python-docx) not available")

    doc = Document(file_path)
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    full_text = "\n".join(paragraphs)

    # Extract tables
    tables = []
    for table in doc.tables:
        rows = []
        for row in table.rows:
            cells = [cell.text.strip() for cell in row.cells]
            rows.append(cells)
        tables.append(rows)

    metadata = {}
    try:
        props = doc.core_properties
        metadata = {
            'title': props.title or '',
            'author': props.author or '',
            'created': str(props.created) if props.created else '',
        }
    except Exception:
        pass

    return {
        'text': full_text,
        'metadata': metadata,
        'tables': tables[:50],
    }


def parse_text(file_path: str) -> dict[str, Any]:
    """Parse plain text files."""
    encodings = ['utf-8', 'windows-1252', 'iso-8859-1', 'cp1256']
    content = None

    for enc in encodings:
        try:
            with open(file_path, 'r', encoding=enc) as f:
                content = f.read()
            break
        except (UnicodeDecodeError, UnicodeError):
            continue

    if content is None:
        with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()

    return {
        'text': content[:100000],
        'metadata': {'encoding': 'detected', 'length': len(content)},
        'tables': [],
    }


def parse_image(file_path: str) -> dict[str, Any]:
    """Parse image files - extract EXIF and attempt OCR."""
    metadata = {}
    ocr_text = ""

    # Try to extract EXIF data
    try:
        from PIL import Image
        from PIL.ExifTags import TAGS

        img = Image.open(file_path)
        metadata['width'] = img.width
        metadata['height'] = img.height
        metadata['format'] = img.format or ''
        metadata['mode'] = img.mode

        exif_data = img._getexif()
        if exif_data:
            for tag_id, value in exif_data.items():
                tag = TAGS.get(tag_id, tag_id)
                if isinstance(value, (str, int, float)):
                    metadata[str(tag)] = value

        img.close()
    except Exception:
        pass

    # Try OCR with pytesseract
    try:
        import pytesseract
        from PIL import Image

        img = Image.open(file_path)
        ocr_text = pytesseract.image_to_string(img, lang='fra+ara')
        img.close()
    except Exception:
        ocr_text = "[OCR non disponible - Tesseract non installe]"

    return {
        'text': ocr_text,
        'metadata': metadata,
        'tables': [],
        'is_image': True,
    }


def parse_json(file_path: str) -> dict[str, Any]:
    """Parse JSON files."""
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    text = json.dumps(data, indent=2, ensure_ascii=False)[:50000]

    return {
        'text': text,
        'metadata': {'type': type(data).__name__, 'keys': list(data.keys()) if isinstance(data, dict) else []},
        'tables': [],
        'structured_data': data if isinstance(data, dict) else {'data': data},
    }


def parse_xml(file_path: str) -> dict[str, Any]:
    """Parse XML files."""
    tree = ET.parse(file_path)
    root = tree.getroot()

    def element_to_text(elem: ET.Element, depth: int = 0) -> str:
        text_parts = []
        if elem.text and elem.text.strip():
            text_parts.append(f"{'  ' * depth}{elem.tag}: {elem.text.strip()}")
        for child in elem:
            text_parts.append(element_to_text(child, depth + 1))
        return "\n".join(text_parts)

    text = element_to_text(root)

    return {
        'text': text[:50000],
        'metadata': {'root_tag': root.tag, 'child_count': len(list(root))},
        'tables': [],
    }


def parse_dwg(file_path: str) -> dict[str, Any]:
    """Parse DWG/DXF technical drawing files."""
    try:
        import ezdxf
        doc = ezdxf.readfile(file_path)
        msp = doc.modelspace()

        metadata = {
            'dxf_version': doc.dxfversion,
            'layers': [layer.dxf.name for layer in doc.layers],
        }

        entities = []
        for entity in msp:
            entities.append(f"{entity.dxftype()}: {entity.dxf.layer}")

        return {
            'text': "\n".join(entities[:1000]),
            'metadata': metadata,
            'tables': [],
            'is_technical': True,
        }
    except Exception:
        return {
            'text': '[Plan technique - extraction DWG/DXF non disponible]',
            'metadata': {'format': Path(file_path).suffix},
            'tables': [],
            'is_technical': True,
        }


def parse_technical(file_path: str) -> dict[str, Any]:
    """Parse Revit/IFC technical files."""
    return {
        'text': '[Fichier technique BIM - extraction via API Forge requise]',
        'metadata': {'format': Path(file_path).suffix},
        'tables': [],
        'is_technical': True,
    }


def parse_archive(file_path: str) -> dict[str, Any]:
    """Parse archive files (ZIP, RAR, 7Z) - list contents."""
    import zipfile

    if zipfile.is_zipfile(file_path):
        with zipfile.ZipFile(file_path, 'r') as zf:
            file_list = zf.namelist()
            return {
                'text': f"Archive contenant {len(file_list)} fichiers:\n" + "\n".join(file_list[:200]),
                'metadata': {'file_count': len(file_list), 'files': file_list[:200]},
                'tables': [],
                'is_archive': True,
                'archive_contents': file_list,
            }

    return {
        'text': '[Archive - format non supporte pour extraction directe]',
        'metadata': {'format': Path(file_path).suffix},
        'tables': [],
        'is_archive': True,
    }


def parse_ole(file_path: str) -> dict[str, Any]:
    """Parse old Office formats (DOC, XLS, PPT)."""
    return parse_text(file_path)


def parse_pptx(file_path: str) -> dict[str, Any]:
    """Parse PowerPoint files."""
    try:
        from pptx import Presentation
        prs = Presentation(file_path)
        texts = []
        for slide in prs.slides:
            for shape in slide.shapes:
                if hasattr(shape, "text") and shape.text:
                    texts.append(shape.text)
        return {
            'text': "\n".join(texts),
            'metadata': {'slide_count': len(prs.slides)},
            'tables': [],
        }
    except Exception:
        return _fallback_text_extract(file_path, "PPTX parser not available")


def parse_unknown(file_path: str) -> dict[str, Any]:
    """Fallback parser for unknown formats."""
    return {
        'text': '',
        'metadata': {'format': Path(file_path).suffix, 'note': 'Format non reconnu'},
        'tables': [],
    }


def _fallback_text_extract(file_path: str, reason: str) -> dict[str, Any]:
    """Fallback: try to read as text."""
    try:
        with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
            text = f.read(50000)
        return {'text': text, 'metadata': {'fallback': reason}, 'tables': []}
    except Exception:
        return {'text': '', 'metadata': {'fallback': reason, 'error': 'unreadable'}, 'tables': []}


# ============================
# Financial Entity Extraction
# ============================

# Algerian-specific patterns
PATTERNS = {
    'nif': re.compile(r'\b\d{15}\b'),
    'rc': re.compile(r'\b\d{2}/\d{2}-\d{7}[A-Z]\d{2}\b'),
    'nis': re.compile(r'\bNIS\s*:?\s*(\d+)', re.IGNORECASE),
    'amount_da': re.compile(r'(\d[\d\s,.]*)\s*(?:DA|DZD|Dinars?)', re.IGNORECASE),
    'amount_ht': re.compile(r'(?:HT|Hors\s*Taxe)\s*:?\s*(\d[\d\s,.]*)', re.IGNORECASE),
    'amount_ttc': re.compile(r'(?:TTC|Toutes\s*Taxes)\s*:?\s*(\d[\d\s,.]*)', re.IGNORECASE),
    'amount_tva': re.compile(r'(?:TVA|Taxe)\s*:?\s*(\d[\d\s,.]*)', re.IGNORECASE),
    'invoice_number': re.compile(r'(?:N[°o]|Ref|Facture|Invoice)\s*:?\s*([A-Z0-9/-]+)', re.IGNORECASE),
    'date_fr': re.compile(r'\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b'),
    'date_iso': re.compile(r'\b(\d{4})-(\d{2})-(\d{2})\b'),
    'iban': re.compile(r'\b(DZ\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4})\b', re.IGNORECASE),
    'capital': re.compile(r'(?:capital|apport|versement)\s*:?\s*(\d[\d\s,.]*)', re.IGNORECASE),
    'rg': re.compile(r'(?:retenue\s*de\s*garantie|RG|5\s*%)\s*:?\s*(\d[\d\s,.]*)', re.IGNORECASE),
}


def clean_amount(amount_str: str) -> float | None:
    """Clean and parse a French-formatted amount string."""
    try:
        cleaned = amount_str.replace(' ', '').replace('\xa0', '')
        # Handle French format: 1.234,56 or 1 234,56
        if ',' in cleaned and '.' in cleaned:
            cleaned = cleaned.replace('.', '').replace(',', '.')
        elif ',' in cleaned:
            cleaned = cleaned.replace(',', '.')
        return float(cleaned)
    except (ValueError, AttributeError):
        return None


def extract_financial_entities(text: str) -> dict[str, Any]:
    """Extract financial entities from text using regex patterns."""
    entities: dict[str, Any] = {}

    # NIF
    nifs = PATTERNS['nif'].findall(text)
    if nifs:
        entities['nif'] = nifs[:5]

    # RC
    rcs = PATTERNS['rc'].findall(text)
    if rcs:
        entities['rc'] = rcs[:5]

    # Amounts
    for key in ['amount_ht', 'amount_ttc', 'amount_tva', 'amount_da']:
        matches = PATTERNS[key].findall(text)
        if matches:
            amounts = [clean_amount(m) for m in matches]
            amounts = [a for a in amounts if a is not None and a > 0]
            if amounts:
                entities[key] = amounts[:10]

    # Invoice numbers
    inv = PATTERNS['invoice_number'].findall(text)
    if inv:
        entities['invoice_number'] = inv[:5]

    # Dates
    dates_fr = PATTERNS['date_fr'].findall(text)
    dates_iso = PATTERNS['date_iso'].findall(text)
    all_dates = []
    for d, m, y in dates_fr:
        try:
            dt = datetime(int(y), int(m), int(d))
            all_dates.append(dt.strftime('%Y-%m-%d'))
        except ValueError:
            pass
    for y, m, d in dates_iso:
        try:
            dt = datetime(int(y), int(m), int(d))
            all_dates.append(dt.strftime('%Y-%m-%d'))
        except ValueError:
            pass
    if all_dates:
        entities['dates'] = list(set(all_dates))[:10]

    # IBAN
    ibans = PATTERNS['iban'].findall(text)
    if ibans:
        entities['iban'] = ibans[:5]

    # Capital / Apports
    capital = PATTERNS['capital'].findall(text)
    if capital:
        amounts = [clean_amount(m) for m in capital]
        entities['capital'] = [a for a in amounts if a is not None and a > 0]

    # Retenue de garantie
    rg = PATTERNS['rg'].findall(text)
    if rg:
        amounts = [clean_amount(m) for m in rg]
        entities['retenue_garantie'] = [a for a in amounts if a is not None and a > 0]

    return entities
