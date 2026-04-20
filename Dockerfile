# ── Stage 1: Build React frontend ────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# ── Stage 2: Python backend + serve React ────────────────────────────────────
FROM python:3.12-slim
WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

# React build output — Flask lo va a servir como archivos estáticos
COPY --from=frontend-builder /app/dist ./react_build

EXPOSE 8080

# Railway inyecta $PORT; si no está definido usa 8080
CMD gunicorn --bind 0.0.0.0:${PORT:-8080} --workers 2 --timeout 120 run:app
