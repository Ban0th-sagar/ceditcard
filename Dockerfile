FROM node:22-bookworm-slim AS web-build
WORKDIR /app/mobile

COPY mobile/package.json mobile/package-lock.json ./
RUN --mount=type=secret,id=build_ca,target=/tmp/build-ca.pem \
    if [ -s /tmp/build-ca.pem ]; then NODE_EXTRA_CA_CERTS=/tmp/build-ca.pem npm ci; else npm ci; fi

COPY mobile/ ./
ENV EXPO_OFFLINE=1
ENV EXPO_NO_TELEMETRY=1
RUN npm run build:web

FROM python:3.12-slim AS runtime
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY backend/requirements.txt ./backend/requirements.txt
RUN --mount=type=secret,id=build_ca,target=/tmp/build-ca.pem \
    if [ -s /tmp/build-ca.pem ]; then PIP_CERT=/tmp/build-ca.pem pip install --no-cache-dir -r backend/requirements.txt; else pip install --no-cache-dir -r backend/requirements.txt; fi

COPY backend/ ./backend/
COPY --from=web-build /app/mobile/dist ./mobile/dist

EXPOSE 8000
HEALTHCHECK --interval=5s --timeout=3s --start-period=10s --retries=6 \
  CMD python -c "import json,os,urllib.request; assert json.load(urllib.request.urlopen('http://127.0.0.1:'+os.environ.get('PORT','8000')+'/api/health', timeout=2))['status']=='ok'"

CMD ["sh", "-c", "cd backend && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
