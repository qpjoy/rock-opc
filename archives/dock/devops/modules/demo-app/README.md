# Demo App Module

This Node.js demo app is used to teach the full observability flow:

- business logs into ELK
- metrics into Prometheus
- dashboards in Grafana

## Endpoints

- `/healthz`: liveness probe
- `/metrics`: Prometheus metrics
- `/api/catalog`: normal info request
- `/api/orders`: order creation with nested JSON payload
- `/api/slow?delayMs=1800`: slow request simulation
- `/api/error`: error log and `500` response
- `/api/batch`: array and event-style payload
- `/api/reset`: reset demo runtime state

## Demo goals

- Show structured logs in Kibana
- Show request rate and latency in Grafana
- Show service health in Prometheus
