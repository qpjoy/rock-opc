# Prometheus Module

The current integrated stack ships with a minimal Prometheus configuration.

Planned additions:

- Node exporter
- cAdvisor
- Blackbox exporter
- Alertmanager
- Recording and alerting rules

Current baseline includes:

- `node-exporter` for host metrics
- `cadvisor` for container metrics
- `elasticsearch-exporter` for cluster health and shard stats
- `blackbox-exporter` for HTTP endpoint probing
- Prometheus alert rules in `rules/devops-alerts.yml`
