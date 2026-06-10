"""
MIA — svc-import : extraction de géométrie depuis PDF/DXF/IFC + étude de sol.

Implémente un parseur DXF minimal (entités LINE) sans dépendance lourde, et des
points d'extension documentés pour PDF (OCR) et IFC. Émet des warnings explicites
quand l'extraction est partielle. DWG natif : conversion DXF requise (cf. README).
"""
from __future__ import annotations

import re
from typing import Any, Dict, List

DXF_LINE_RE = re.compile(r"^\s*0\s*\nLINE", re.MULTILINE)


def extract_dxf_lines(content: str) -> List[Dict[str, float]]:
    """Extraction minimale des segments LINE d'un DXF ASCII (groupes 10/20/11/21)."""
    lines: List[Dict[str, float]] = []
    tokens = content.splitlines()
    i = 0
    while i < len(tokens) - 1:
        if tokens[i].strip() == "0" and i + 1 < len(tokens) and tokens[i + 1].strip() == "LINE":
            seg: Dict[str, float] = {}
            j = i + 2
            while j < len(tokens) - 1 and tokens[j].strip() != "0":
                code = tokens[j].strip()
                val = tokens[j + 1].strip()
                if code in {"10", "20", "11", "21"}:
                    try:
                        seg[{"10": "x1", "20": "y1", "11": "x2", "21": "y2"}[code]] = float(val)
                    except ValueError:
                        pass
                j += 2
            if {"x1", "y1", "x2", "y2"} <= seg.keys():
                lines.append(seg)
            i = j
        else:
            i += 1
    return lines


def process(filename: str, content: bytes) -> Dict[str, Any]:
    warnings: List[str] = []
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
    geometry: Dict[str, Any] = {"lines": []}

    if ext == "dxf":
        geometry["lines"] = extract_dxf_lines(content.decode("utf-8", errors="ignore"))
        if not geometry["lines"]:
            warnings.append("DXF : aucune entité LINE détectée (vérifier le format ASCII).")
    elif ext == "dwg":
        warnings.append("DWG natif non supporté : convertir en DXF (ODA File Converter). Voir README.")
    elif ext == "pdf":
        warnings.append("PDF : extraction géométrique nécessite OCR/vectorisation (point d'extension).")
    elif ext == "ifc":
        warnings.append("IFC : parsing structurel complet à implémenter (ifcopenshell).")
    else:
        warnings.append(f"Extension non reconnue: {ext!r}")

    return {
        "filename": filename,
        "format": ext,
        "geometry": geometry,
        "soil_study": {"q_adm_kpa": None, "note": "Étude de sol à renseigner (MSP)."},
        "warnings": warnings,
    }


if __name__ == "__main__":
    print("svc-import worker prêt (MIA).")
