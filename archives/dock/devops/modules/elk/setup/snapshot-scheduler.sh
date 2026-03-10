#!/bin/sh
set -eu

es_url="${ELASTICSEARCH_URL:-http://elasticsearch:9200}"
repo="${SNAPSHOT_REPOSITORY:-opc_snapshots}"
interval="${SNAPSHOT_INTERVAL_SECONDS:-86400}"
retention="${SNAPSHOT_RETENTION_COUNT:-7}"

wait_for_es() {
  echo "waiting for elasticsearch at ${es_url}"
  until curl -fsS "${es_url}/_cluster/health" >/dev/null 2>&1; do
    sleep 5
  done
}

create_snapshot() {
  snapshot_id="auto-$(date +%Y%m%d%H%M%S)"
  echo "creating snapshot ${snapshot_id}"
  curl -fsS -X PUT "${es_url}/_snapshot/${repo}/${snapshot_id}?wait_for_completion=true" >/dev/null
}

prune_snapshots() {
  snapshots="$(curl -fsS "${es_url}/_cat/snapshots/${repo}?h=id&s=id" || true)"
  count="$(printf '%s\n' "${snapshots}" | sed '/^$/d' | wc -l | tr -d ' ')"

  if [ "${count}" -le "${retention}" ]; then
    echo "snapshot retention within limit: ${count}/${retention}"
    return
  fi

  delete_count=$((count - retention))
  printf '%s\n' "${snapshots}" | sed '/^$/d' | head -n "${delete_count}" | while IFS= read -r snapshot_id; do
    [ -z "${snapshot_id}" ] && continue
    echo "deleting snapshot ${snapshot_id}"
    curl -fsS -X DELETE "${es_url}/_snapshot/${repo}/${snapshot_id}" >/dev/null
  done
}

wait_for_es

while true; do
  create_snapshot
  prune_snapshots
  echo "sleeping ${interval} seconds before next snapshot"
  sleep "${interval}"
done
