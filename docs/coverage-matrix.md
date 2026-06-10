# Matrice de couverture — modules CDC (Product Guardian)

Statuts : **OK** (implémenté + testé) · **PARTIAL** (squelette/mock fonctionnel) ·
**MISSING** (absent) · **BLOCKED** (dépendance externe indisponible).

| Module | Description CDC | Statut | Emplacement | Tests |
|--------|-----------------|:------:|-------------|-------|
| **MIA** | Import architecture (PDF/DXF/IFC), géométrie, étude sol | PARTIAL | `apps/workers/svc-import` | parseur DXF (LINE) ; PDF/IFC = points d'extension |
| **MSP** | Paramètres projet (zone, site, q_adm, niveaux…) | **OK** | `genie_calc/models.py` | validés Pydantic + Zod |
| **MCC** | Charges G/Q, piscine, cloisons, W = G + βQ | **OK** | `genie_calc/loads.py` | `test_loads.py` |
| **MRF** | Catalogues revêtements, compositions, calcul G | **OK** | `genie_calc/coverings.py` | `test_loads.py` |
| **MCS** | Choix système structurel, R/D/Q | **OK** | `genie_calc/structure.py` | `test_seismic.py` |
| **MD** | Prédimensionnement poteaux/poutres/dalles/voiles | **OK** | `genie_calc/predim.py` | `test_foundations_predim.py` |
| **MCS2** | Sismique RPA, V = A·D·Q·W/R, forces, P-Δ, renversement | **OK** | `genie_calc/seismic.py` | `test_seismic.py` |
| **MF** | Semelles isolées/filantes, radier, pieux | **OK** | `genie_calc/foundations.py` | `test_foundations_predim.py` |
| **MVR** | Vérifications réglementaires, warnings, erreurs bloquantes | **OK** | `genie_calc/regulatory.py` | couvert via pipeline |
| **MGM** | Génération .str / IFC / SAF / JSON | PARTIAL | `svc-robot`, `svc-tekla`, `svc-etabs` | générateurs mock fonctionnels |
| **MPD** | note_calcul / rapport_conformite / dossier_ctc / quantitatif | PARTIAL | `apps/workers/svc-report` | sources MD/CSV ; PDF/XLSX = option |
| **VCCRTV** | Boucle Vérif/Calcul/Contrôle/Révision/Test/Validation | PARTIAL | `orchestrator/` | boucle exécutée (graph.py) |
| **Connecteur Robot** | Export .str + résultats | PARTIAL (mock) | `svc-robot` | mock cohérent ; live = Windows+COM |
| **Connecteur Revit APS** | Interface client + export | PARTIAL (mock) | `svc-revit` | mock ; live = OAuth2 APS |
| **Connecteur Tekla** | Export IFC | PARTIAL (mock) | `svc-tekla` | IFC STEP minimal |
| **Connecteur ETABS** | Analyse + SAF | PARTIAL (mock) | `svc-etabs` | mock |
| **Connecteur Tedds** | Note de calcul élément | PARTIAL (mock) | `svc-tedds` | mock |

## Modules critiques (MISSING interdit)

`MSP`, `MCC`, `MCS2`, `MF`, `MVR` → **tous OK**. Aucun module critique manquant.

## Boucle cascade (Data Contract Guardian)

`MSP → MCC → MCS2 → MD → MF → MVR → MGM → MPD` — validée par
`genie_calc/pipeline.py` (`run_full_study`) et le cas de référence El Achour R+4.
