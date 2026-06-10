"""
Worker svc-calcul : consomme les jobs de calcul depuis Redis (BRPOP) et exécute
la cascade complète (genie_calc.pipeline.run_full_study).

Mode dégradé : si Redis est indisponible, expose une fonction `process_job`
utilisable en direct (et par les tests). Lancé via `python -m worker`.
"""
from __future__ import annotations

import json
import os
import sys
from typing import Any, Dict

from genie_calc.models import LevelLoad, ProjectParams
from genie_calc.pipeline import run_full_study

QUEUE = os.environ.get("CALC_SERVICE_QUEUE", "genie:calc")
RESULT_PREFIX = "genie:calc:result:"


def process_job(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Traite un job `full_study` et renvoie l'étude sérialisable."""
    params = ProjectParams(**payload["params"])
    levels = [LevelLoad(**lv) for lv in payload["levels"]]
    study = run_full_study(
        params, levels,
        footprint_m2=float(payload.get("footprint_m2", levels[0].area_m2)),
        n_columns=int(payload.get("n_columns", 1)),
        observed_criteria=payload.get("observed_criteria"),
    )
    return {"projectId": payload.get("projectId"), "study": study}


def main() -> int:
    try:
        import redis  # type: ignore
    except ImportError:
        print("redis non installé — worker en mode inactif (process_job disponible).",
              file=sys.stderr)
        return 0

    url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    client = redis.Redis.from_url(url, decode_responses=True)
    print(f"svc-calcul: écoute de la file {QUEUE} sur {url}")
    while True:
        item = client.brpop(QUEUE, timeout=5)
        if item is None:
            continue
        _, raw = item
        try:
            job = json.loads(raw)
            result = process_job(job)
            if job.get("projectId"):
                client.set(RESULT_PREFIX + str(job["projectId"]),
                           json.dumps(result, ensure_ascii=False), ex=3600)
            print(f"svc-calcul: job traité (projet {job.get('projectId')})")
        except Exception as exc:  # un job invalide ne doit pas tuer le worker
            print(f"svc-calcul: erreur de traitement: {exc}", file=sys.stderr)


if __name__ == "__main__":
    raise SystemExit(main())
