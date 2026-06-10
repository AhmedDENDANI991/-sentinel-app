"""
MPD — svc-report : génération documentaire.

Produit les livrables à partir de l'étude : note_calcul (Markdown -> PDF),
rapport_conformite, dossier_ctc, quantitatif (CSV -> XLSX). Sans dépendance
lourde, génère des sources Markdown/CSV ; la conversion PDF/XLSX est documentée
(reportlab / openpyxl en option `worker`).
"""
from __future__ import annotations

from typing import Any, Dict


def note_calcul_md(study: Dict[str, Any]) -> str:
    p = study.get("project", {})
    s = study.get("seismic", {})
    f = study.get("foundation", {})
    lines = [
        f"# Note de calcul — {p.get('name', 'Projet')}",
        "",
        "## 1. Paramètres (MSP)",
        f"- Zone sismique : **{p.get('zone')}** — Groupe d'usage : **{p.get('usage_group')}**",
        f"- Site : **{p.get('site')}** — q_adm : **{p.get('q_adm_kpa')} kPa**",
        f"- Système : **{p.get('system')}** — Niveaux : **{p.get('n_levels')}**",
        "",
        "## 2. Sismique (MCS2 — méthode statique équivalente RPA)",
        f"- A = {s.get('A')}, D = {s.get('D')}, Q = {s.get('Q')}, R = {s.get('R')}, η = {s.get('eta')}",
        f"- Période T = {s.get('period_s')} s — Poids total W = {s.get('W_total_kn')} kN",
        f"- **Effort tranchant à la base V = {s.get('base_shear_kn')} kN**",
        f"- Moment de renversement = {s.get('overturning_moment_knm')} kN·m",
        "",
        "### Forces par niveau",
        "| Niveau | h (m) | W (kN) | F (kN) | V cumulé (kN) |",
        "|-------:|------:|-------:|-------:|--------------:|",
    ]
    for sf in s.get("storey_forces", []):
        lines.append(f"| {sf['level']} | {sf['height_m']} | {sf['weight_kn']} | "
                     f"{sf['force_kn']} | {sf['shear_kn']} |")
    lines += [
        "",
        "## 3. Fondations (MF)",
        f"- Type : **{f.get('type')}** — ratio σ_sol/q_adm = {f.get('bearing_check_ratio')} "
        f"({'OK' if f.get('ok') else 'NON VÉRIFIÉ'})",
        "",
        "## 4. Vérification réglementaire (MVR)",
    ]
    for c in study.get("regulatory", {}).get("checks", []):
        lines.append(f"- [{c['severity'].upper()}] {c['code']} — {c['label']} : {c['message']}")
    return "\n".join(lines) + "\n"


def quantitatif_csv(study: Dict[str, Any]) -> str:
    predim = study.get("predim", {})
    col = predim.get("column", {})
    beam = predim.get("beam", {})
    rows = [
        "element,dimension,valeur,unite",
        f"poteau,cote,{col.get('side_m')},m",
        f"poutre,hauteur,{beam.get('h_m')},m",
        f"poutre,largeur,{beam.get('b_m')},m",
        f"dalle,epaisseur,{predim.get('slab_thickness_m')},m",
        f"voile,epaisseur,{predim.get('shear_wall_thickness_m')},m",
    ]
    return "\n".join(rows) + "\n"


def generate(study: Dict[str, Any]) -> Dict[str, str]:
    """Renvoie les sources des livrables (clé = nom de fichier)."""
    return {
        "note_calcul.md": note_calcul_md(study),
        "rapport_conformite.md": note_calcul_md(study),  # vue conformité = mêmes données + MVR
        "quantitatif.csv": quantitatif_csv(study),
    }


if __name__ == "__main__":
    print("svc-report worker prêt (MPD).")
