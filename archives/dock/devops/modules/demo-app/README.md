# Demo App

This is a zero-dependency Node demo service for the ELK walkthrough.

It serves two purposes:

- generate structured ECS-style JSON logs for Filebeat
- provide a small browser UI for triggering demo scenarios

## Routes

- `GET /`
- `GET /healthz`
- `GET /api/catalog`
- `POST /api/orders`
- `GET /api/slow?delayMs=2400`
- `GET /api/error`
- `GET /api/security?outcome=success|failure`
- `GET /api/batch`
- `POST /api/reset`

## Log design

Each log line includes:

- `@timestamp`
- `service.name`
- `service.environment`
- `log.level`
- `event.category`
- `event.action`
- `event.outcome`
- `trace.id`
- `requestId`
- `labels.demo_scenario`

This makes the logs easy to filter in Kibana Discover and easy to evolve into a real project schema later.
