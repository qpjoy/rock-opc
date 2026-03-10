# OPC DevOps Module

`archives/dock/devops` is the Docker Compose based operations module for OPC. It is designed as both an integrated solution and a set of independently deployable modules.

## Structure

- `compose/compose.yml`: integrated entrypoint for full-stack or profile-based startup.
- `modules/elk`: standalone ELK module.
- `modules/elk/docs`: ELK production topology evolution notes.
- `modules/elk/assets`: ELK bootstrap assets such as ILM, templates, and snapshot repository definitions.
- `modules/elk/setup`: one-shot initialization scripts.
- `modules/prometheus`: Prometheus configuration.
- `modules/grafana`: Grafana provisioning.
- `modules/nginx`: reverse proxy placeholder and ingress layer.
- `docs/architecture.md`: architecture and evolution path.
- `.env.example`: shared environment template.

## Quick Start

1. Copy `.env.example` to `.env`.
2. Run integrated mode from `archives/dock/devops/compose`.
3. Run standalone mode from the target module directory if you only need one stack.

### Integrated startup

```bash
cd archives/dock/devops
cp .env.example .env
docker compose -f compose/compose.yml --profile elk up -d
docker compose -f compose/compose.yml --profile monitoring up -d
docker compose -f compose/compose.yml --profile cicd up -d
docker compose -f compose/compose.yml --profile scm up -d
docker compose -f compose/compose.yml --profile gateway up -d
```

Run the whole framework:

```bash
docker compose -f compose/compose.yml --profile full up -d
```

### Standalone ELK startup

```bash
cd archives/dock/devops/modules/elk
cp ../../.env.example .env
docker compose -f compose.yml up -d
```

This startup includes `filebeat` and a one-shot `elk-setup` initializer.

## Access

- Elasticsearch: `http://localhost:9200`
- Kibana: `http://localhost:5601`
- Logstash TCP JSON: `localhost:5000`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3000`
- Jenkins: `http://localhost:8080`
- GitLab: `http://localhost:8929`

## Cross-platform notes

- Windows and macOS: use Docker Desktop and allocate at least 8 GB RAM for the full stack, 4 GB for ELK-only.
- Linux: set `vm.max_map_count=262144` before starting Elasticsearch.
- macOS and Windows: bind-mounting the Docker socket into Jenkins depends on Docker Desktop settings. If Docker-in-Docker is preferred later, split Jenkins agents into a separate module.
- Paths in Compose use repository-relative mounts, so the same layout works on Windows, Linux, and macOS as long as startup happens from `archives/dock/devops`.

## ELK best-practice direction

- Current implementation is a low-friction single-node baseline.
- Filebeat, ILM bootstrap, and filesystem snapshot repository are already wired in for the ELK module.
- Automatic snapshots and restore drill documentation are included in the ELK module.
- Reserved production path includes hot/warm/cold tiers, snapshot backup, ingest isolation, and fault-tolerant topology.
- A pre-production hot/warm/coordinating overlay is available under `modules/elk/overlays/hot-warm-compose.yml`.
- Detailed topology notes are in `modules/elk/docs/topology-roadmap.md`.

## Next iterations

- Harden ELK with multi-node overlays and backup automation.
- Add exporters and dashboards for Prometheus and Grafana.
- Externalize Jenkins CasC and seed jobs.
- Split GitLab into a lighter dev profile and a production-oriented profile.
- Add Nginx TLS termination and upstream routing conventions.
