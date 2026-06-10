# Worker Python générique (svc-import / svc-report / connecteurs) — mode mock par défaut
FROM python:3.11-slim
ARG SERVICE=svc-import
WORKDIR /app
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 SERVICE=${SERVICE}

RUN pip install --no-cache-dir redis pydantic

COPY apps/workers/${SERVICE}/ ./
RUN pip install --no-cache-dir -r requirements.txt 2>/dev/null || true

CMD ["python", "worker.py"]
