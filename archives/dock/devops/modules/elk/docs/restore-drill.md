# ELK Restore Drill

## Goal

Validate that snapshots taken from `opc_snapshots` can be restored into a clean environment and queried through Kibana or Elasticsearch API.

## Preparation

- Stop or isolate writers before a strict point-in-time drill.
- Record the target snapshot id from `_cat/snapshots/opc_snapshots`.
- Run the drill in an isolated environment when testing destructive restore paths.

## Check snapshots

```bash
curl http://localhost:9200/_cat/snapshots/opc_snapshots?v
```

## Create a disposable restore target

If testing locally, prefer a separate Compose project name:

```bash
cd archives/dock/devops/modules/elk
COMPOSE_PROJECT_NAME=opc-elk-restore docker compose up -d
```

## Optional: close conflicting data streams or indices

```bash
curl -X POST http://localhost:9200/logs-opc-default/_close
```

## Restore snapshot

Replace `SNAPSHOT_ID` with the chosen snapshot:

```bash
curl -X POST http://localhost:9200/_snapshot/opc_snapshots/SNAPSHOT_ID/_restore \
  -H 'Content-Type: application/json' \
  -d '{"indices":"*","include_global_state":false,"rename_pattern":"(.+)","rename_replacement":"restore-$1"}'
```

## Validate restore

```bash
curl http://localhost:9200/_cat/indices/restore-*?v
curl http://localhost:9200/restore-logs-opc-default/_search?size=5
```

## Drill exit criteria

- Snapshot metadata is readable.
- Restore completes without shard failures.
- Restored data is searchable.
- Restoration steps and duration are recorded.

## Follow-up

- Remove restored test indices or the temporary environment after validation.
- Review snapshot interval and retention if recovery point or storage cost is unsatisfactory.
