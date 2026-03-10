#!/bin/sh
set -eu

ELASTICSEARCH_URL="${ELASTICSEARCH_URL:-http://es-coord01:9200}"
ILM_POLICY_NAME="${ILM_POLICY_NAME:-opc-logs-policy-ha}"
ILM_POLICY_FILE="${ILM_POLICY_FILE:-/assets/ilm-policy-ha.json}"
INDEX_TEMPLATE_NAME="${INDEX_TEMPLATE_NAME:-opc-logs-template-ha}"
INDEX_TEMPLATE_FILE="${INDEX_TEMPLATE_FILE:-/assets/index-template-ha.json}"
export ELASTICSEARCH_URL
export ILM_POLICY_NAME
export ILM_POLICY_FILE
export INDEX_TEMPLATE_NAME
export INDEX_TEMPLATE_FILE

/bin/sh /setup/init-elastic.sh
