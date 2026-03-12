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
- `POST /api/import/movielens`
- `GET /api/import/movielens/status`
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

## MovieLens import

The app can also trigger a CSV import demo:

- it copies `feeds/logstash/movielens/movies.csv` into a Logstash import volume
- Logstash reads it through a dedicated file input pipeline
- imported rows land in the `movies` index

This keeps CSV onboarding compatible with the current Beats-based log flow without mixing the two concerns.
