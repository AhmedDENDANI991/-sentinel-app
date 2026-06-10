# Rapport de tests de calcul (Calculation Guardian)

**Statut : VERT.** Exécuté avec `pytest` sur `apps/workers/svc-calcul`.

```
31 passed
Couverture genie_calc : 93 %
```

## Détail par module

| Fichier de test | Cas | Couvre |
|---|---:|---|
| `test_loads.py` | 9 | MCC (G/Q, W=G+βQ, β par usage, piscine), MRF (catalogue, custom, matériau inconnu), NaN |
| `test_seismic.py` | 10 | MCS2 (table A, η, T, D 3 plages, V, distribution Fi, ΣF=V, V=tranchant base, Ft, P-Δ) |
| `test_foundations_predim.py` | 10 | MD (poteau/poutre/dalle/voile), MF (isolée, filante, sélection pieux/radier/isolée) |
| `test_pipeline_el_achour.py` | 2 | Cascade complète, absence NaN/inf récursive, ordres de grandeur, renversement |

## Cas de référence — El Achour R+4 (Alger, zone III)

Hypothèses : zone III, groupe d'usage 2, site S3, q_adm = 200 kPa, R+4
(5 niveaux × 3,06 m), système mixte portiques-voiles, 240 m²/niveau, 12 poteaux.

Résultats obtenus (vérifiés par `run_full_study` / `process_job`) :

| Grandeur | Valeur |
|---|---|
| A (zone III, groupe 2) | 0,25 |
| R (mixte) | 5,0 |
| Période empirique T | ≈ 0,387 s |
| **Effort tranchant base V** | **≈ 1083 kN** |
| Type de fondation retenu | semelle isolée |
| Ratio σ_sol/q_adm | 0,97 (≤ 1 ✅) |
| Erreur bloquante MVR | aucune |

## Garde-fous numériques

- `genie_calc.utils.ensure_finite` rejette tout NaN/inf en entrée comme en sortie.
- Le test pipeline parcourt récursivement le résultat sérialisé et échoue sur
  toute valeur non finie (« NaN interdit » du CDC).

## Reproduire

```bash
cd apps/workers/svc-calcul
python -m venv .venv && . .venv/bin/activate
pip install -e ".[dev]"
pytest --cov=genie_calc --cov-report=term-missing
```
