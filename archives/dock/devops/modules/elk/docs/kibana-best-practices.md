# Kibana Best Practices

This module treats Kibana as the primary log exploration surface for the OPC DevOps stack.

## 1. Keep logs ECS-aligned

The demo app emits:

- `service.name`
- `log.level`
- `event.category`
- `event.action`
- `event.outcome`
- `trace.id`
- `labels.demo_scenario`

This gives Discover stable fields for filtering, charting, and later dashboard work.

## 2. Use one data view for one operational concern

The bootstrap step creates `OPC Logs` for `logs-opc-*`.

For a real company project, keep one data view per main operational surface:

- application logs
- edge or nginx logs
- security and audit logs
- background jobs

Do not overload one view with unrelated data when teams need different field vocabularies.

## 3. Favor saved queries before dashboards

This repo bootstraps four saved queries:

- `OPC Demo Errors`
- `OPC Demo Slow Requests`
- `OPC Demo Security Events`
- `OPC Demo Order Flow`

Saved queries teach teams how to filter first. Dashboards make more sense after field design and query conventions are stable.

## 4. Use demo scenarios to teach field strategy

The demo app intentionally produces:

- normal catalog and order logs
- slow request warnings
- downstream error events
- authentication events
- batch job events

This is enough to teach:

- `log.level`
- `event.category`
- `labels.demo_scenario`
- nested JSON inspection
- KQL filtering

## 5. Normalize ingest, not the app contract

Logstash handles light normalization:

- `service` -> `service.name`
- `level` -> `log.level`
- `env` -> `labels.environment`
- `duration_ms` -> `event.duration`

The app should stay readable and practical. Ingest should absorb minor schema differences.

## 6. Add dashboards after query patterns settle

Recommended order:

1. Data view
2. Saved queries
3. Discover drill-down habits
4. Lens visualizations
5. Dashboard layout

This keeps Kibana assets maintainable and avoids brittle, premature dashboard work.
