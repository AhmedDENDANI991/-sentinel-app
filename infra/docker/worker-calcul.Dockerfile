# Worker de calcul Python (svc-calcul) — moteur MCC/MRF/MCS/MD/MCS2/MF/MVR
FROM python:3.11-slim AS base
WORKDIR /app
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1

COPY apps/workers/svc-calcul/pyproject.toml ./
RUN pip install --no-cache-dir pydantic redis fastapi uvicorn

COPY apps/workers/svc-calcul/ ./
RUN pip install --no-cache-dir -e .

# Healthcheck léger : import du module de calcul.
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD python -c "import genie_calc" || exit 1

CMD ["python", "-m", "worker"]
