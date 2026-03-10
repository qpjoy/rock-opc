# ELK Topology Roadmap

## Development

- `compose.yml`
- Single-node Elasticsearch
- Security off
- Low-friction validation and local integration

## Pre-production

- 3 dedicated master nodes
- 2 hot data nodes
- 1 warm data node
- 1 coordinating node
- Logstash as isolated ingest tier
- Reference overlay: `overlays/hot-warm-compose.yml`

## Production

- Dedicated ingest nodes for write traffic
- Coordinating nodes for read traffic
- ILM policies for hot, warm, cold transitions
- Snapshot repository to S3-compatible storage or NAS
- Cross-host anti-affinity and zone spread

## Backup and fault tolerance

- Daily snapshots with retention policy
- Restore drill environment separate from production
- Replica factor based on zone count
- Logstash persistent queue or Kafka buffer before indexing

## Current implementation status

- Development stack includes `elk-snapshot-scheduler`
- Restore drill is documented in `docs/restore-drill.md`
- Pre-production hot/warm/coordinating overlay is available for iterative hardening
- Hot/warm overlay applies dedicated ILM and template assets for tier-aware retention
