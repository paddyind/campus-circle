# Observability (Grafana/Prometheus/Loki/Tempo) for campus-circle

## What this does
This repo can be monitored by the shared `observability-platform` stack running in Docker Desktop.

For baseline monitoring (service uptime + latency), this uses the observability platform’s **blackbox-exporter** to probe HTTP endpoints.

**Container logs (no app code):** **Promtail** ships every container’s stdout/stderr on the Docker host to Loki. In Grafana → **Logs + Traces Correlation**, filter with LogQL such as `{container=~"campus-circle.*"}`.

For distributed traces and OTLP-structured logs, add OpenTelemetry instrumentation (optional).

## Prerequisites
1. Deploy `observability-platform` (which creates the shared Docker network `obs_net`).
2. Ensure the observability platform’s Prometheus blackbox targets include:
   - `campus-circle-backend:8000/api` (container port; host mapping is `localhost:3101`)

## Run-time changes to this repo
This repo’s `infra/docker-compose.yml` now attaches the backend service to `obs_net` so blackbox probing works.

## Expected endpoints
- Health/info: `GET /api` on the backend

## How to verify
1. Start `observability-platform` (Grafana defaults to `http://localhost:23001`; see `observability-platform/docs/ARCHITECTURE.md`).
2. Start campus-circle backend.
3. In Grafana, open **Service Health, Latency, Error Rate** and look for `campus-circle`.

## Next step (optional, for traces/logs)
Add OpenTelemetry env vars to the backend service:
- `OTEL_SERVICE_NAME=campus-circle-backend`
- `OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318`
- `OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf`
- `OTEL_RESOURCE_ATTRIBUTES=tenant.id=<tenant>,service.namespace=campus-circle`

