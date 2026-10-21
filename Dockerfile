FROM node:22-bookworm-slim AS web-build
WORKDIR /app/mobile

COPY mobile/package.json mobile/package-lock.json ./
RUN npm ci

COPY mobile/ ./
ENV EXPO_OFFLINE=1
ENV EXPO_NO_TELEMETRY=1
RUN npm run build:web

FROM python:3.12-slim AS runtime
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend/ ./backend/
COPY --from=web-build /app/mobile/dist ./mobile/dist

EXPOSE 8000

CMD ["sh", "-c", "cd backend && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
