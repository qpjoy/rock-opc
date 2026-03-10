#!/bin/sh
set -eu

es_url="${ELASTICSEARCH_URL:-http://elasticsearch:9200}"
ilm_policy_name="${ILM_POLICY_NAME:-opc-logs-policy}"
ilm_policy_file="${ILM_POLICY_FILE:-/assets/ilm-policy.json}"
index_template_name="${INDEX_TEMPLATE_NAME:-opc-logs-template}"
index_template_file="${INDEX_TEMPLATE_FILE:-/assets/index-template.json}"
snapshot_repository_name="${SNAPSHOT_REPOSITORY_NAME:-opc_snapshots}"
snapshot_repository_file="${SNAPSHOT_REPOSITORY_FILE:-/assets/snapshot-repository.json}"

wait_for_es() {
  echo "waiting for elasticsearch at ${es_url}"
  until curl -fsS "${es_url}/_cluster/health" >/dev/null 2>&1; do
    sleep 5
  done
}

put_json() {
  path="$1"
  file="$2"
  echo "applying ${path} from ${file}"
  curl -fsS -X PUT "${es_url}${path}" \
    -H "Content-Type: application/json" \
    --data @"${file}" >/dev/null
}

wait_for_es
put_json "/_ilm/policy/${ilm_policy_name}" "${ilm_policy_file}"
put_json "/_index_template/${index_template_name}" "${index_template_file}"
put_json "/_snapshot/${snapshot_repository_name}" "${snapshot_repository_file}"
echo "elastic bootstrap complete"
