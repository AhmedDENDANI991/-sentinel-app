# svc-robot — connecteur Autodesk Robot Structural Analysis

## Modes
- `ROBOT_MODE=mock` (défaut) — aucune licence requise. `generate_str_model()`
  produit un `.str`, `analyze()` renvoie des résultats simulés cohérents.
- `ROBOT_MODE=live` — **prérequis** : Windows + Robot installé + API COM
  (`RobotOM`). Non exécutable en CI Linux/conteneur. À brancher dans `analyze()`.

## Prérequis mode live
1. Autodesk Robot Structural Analysis (licence valide).
2. Windows (l'API COM n'existe pas sous Linux).
3. `pywin32` pour piloter `Robot.Application`.

Tant que ces prérequis ne sont pas réunis, le mode mock garantit la continuité
de la chaîne MGM → analyse → vérification.
