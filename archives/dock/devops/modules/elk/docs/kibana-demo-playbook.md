# Kibana Demo Playbook

## Start

From the DevOps root:

```bash
docker compose -f compose/compose.yml --profile elk up -d
```

This profile now starts:

- Elasticsearch
- Kibana
- Logstash
- Filebeat
- demo-app
- elk-setup
- kibana-setup
- elk-snapshot-scheduler

## Access

- Kibana: `http://localhost:5601`
- Demo app UI: `http://localhost:8088`

## Preloaded Kibana assets

The bootstrap flow creates:

- data view `OPC Logs`
- default time field `@timestamp`
- saved queries:
  - `OPC Demo Errors`
  - `OPC Demo Slow Requests`
  - `OPC Demo Security Events`
  - `OPC Demo Order Flow`

## Suggested walkthrough

1. Open the demo app UI.
2. Trigger `GET /api/catalog` and `POST /api/orders`.
3. Open Kibana Discover and choose `OPC Logs`.
4. Run saved query `OPC Demo Order Flow`.
5. Trigger `GET /api/slow?delayMs=2400`.
6. Run saved query `OPC Demo Slow Requests`.
7. Trigger `GET /api/error`.
8. Run saved query `OPC Demo Errors`.
9. Trigger `GET /api/security?outcome=failure`.
10. Run saved query `OPC Demo Security Events`.

## Useful KQL examples

```text
service.name : "demo-app"
service.name : "demo-app" and log.level : "error"
service.name : "demo-app" and labels.demo_scenario : "slow-request"
event.category : "authentication" and security.outcome : "failure"
event.category : "order" and order.amount >= 1000
```

## What to teach in Discover

- pin `service.name`, `log.level`, `event.category`, `event.action`
- expand a document and inspect nested `order`, `error`, and `security` fields
- compare the same time window across normal and error scenarios
- save a new query before building any dashboard

## Operational takeaway

Kibana answers:

- what happened
- which request or scenario failed
- which fields are stable enough for dashboards or alerts later

This is why ELK is the first observability layer to stabilize before Grafana and Prometheus are added.
