# ELK Module

This module can run independently and is also the logging foundation for the integrated OPC DevOps stack.

## Current scope

- Elasticsearch single-node baseline
- Kibana UI
- Logstash ingest for Beats and TCP JSON
- Filebeat sample shipper
- ILM and index template bootstrap
- Filesystem snapshot repository bootstrap
- Snapshot scheduler with retention cleanup

## Start

```bash
cd archives/dock/devops/modules/elk
cp ../../.env.example .env
docker compose up -d
```

On Windows with Git Bash, you can also start from the DevOps root:

```bash
cd archives/dock/devops
./scripts/windows-up.sh elk
```

After startup, `elk-setup` registers:

- ILM policy: `opc-logs-policy`
- Index template: `opc-logs-template`
- Snapshot repository: `opc_snapshots`
- Data stream target from Logstash: `logs-opc-default`

The hot/warm overlay registers a separate pair:

- ILM policy: `opc-logs-policy-ha`
- Index template: `opc-logs-template-ha`

## Ingest examples

Send JSON logs to Logstash:

```bash
printf '{"service":"demo","level":"info","message":"hello elk"}\n' | nc localhost 5000
```

If `nc` is unavailable on Windows, use PowerShell:

```powershell
$client = New-Object System.Net.Sockets.TcpClient('127.0.0.1',5000)
$stream = $client.GetStream()
$writer = New-Object System.IO.StreamWriter($stream)
$writer.WriteLine('{"service":"demo","level":"info","message":"hello elk"}')
$writer.Flush()
$writer.Dispose()
$client.Dispose()
```

Filebeat also ships sample NDJSON logs from `samples/logs/`.

## Snapshot example

```bash
curl -X PUT http://localhost:9200/_snapshot/opc_snapshots/manual-001?wait_for_completion=true
```

Automatic snapshots are taken by `elk-snapshot-scheduler`.

Key env vars from `.env`:

- `SNAPSHOT_INTERVAL_SECONDS`
- `SNAPSHOT_RETENTION_COUNT`

## Restore drill

See `docs/restore-drill.md` for the recovery rehearsal flow.

## Hot/Warm overlay

Pre-production topology is available in `overlays/hot-warm-compose.yml`.

Start it with:

```bash
cd archives/dock/devops/modules/elk
cp ../../.env.example .env
docker compose -f overlays/hot-warm-compose.yml up -d
```

In this overlay:

- new data starts on the hot tier
- warm phase begins after 7 days
- rollover keeps daily backing indices manageable
- replica count is raised to `1`

## Evolution direction

- Add Filebeat and Metricbeat sidecars
- Add ILM templates and rollover aliases
- Add snapshot scheduling and restore drills
- Split ingest, hot, warm, and coordinating roles
- Add multi-node fault-tolerant overlay for production
