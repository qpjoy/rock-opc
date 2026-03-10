# OPC DevOps Architecture

## Goals

- One entrypoint for integrated local or single-host deployment.
- Each core module remains independently deployable.
- Production evolution path is explicit, especially for ELK and observability.

## Current layers

- Gateway: Nginx reverse proxy and unified ingress.
- Logging: Elasticsearch, Logstash, Kibana.
- Monitoring: Prometheus, Grafana.
- CI/CD: Jenkins.
- SCM/Dev platform: GitLab.

## ELK evolution path

### Stage 1

- Single-node stack for local development, demos, and low-cost integration.
- Security disabled by default to reduce boot friction.

### Stage 2

- Separate ingest, hot, warm, and coordinating node roles.
- Snapshot repository mounted to object storage gateway or NAS.
- Logstash or Kafka for buffering.

### Stage 3

- Cross-zone replicas and dedicated master nodes.
- Read/write isolation via ingest nodes and coordinating nodes.
- Snapshot lifecycle management plus cold archive tier.

## Reserved extensions

- Alertmanager
- Loki
- Tempo
- MinIO
- Harbor
- SonarQube
- Argo CD
- Vault
