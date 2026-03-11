#!/usr/bin/env sh
set -eu

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
devops_dir="$(CDPATH= cd -- "${script_dir}/.." && pwd)"

ensure_env() {
  if [ ! -f "${devops_dir}/.env" ]; then
    cp "${devops_dir}/.env.example" "${devops_dir}/.env"
  fi
}

usage() {
  cat <<'EOF'
Usage:
  ./scripts/windows-up.sh elk
  ./scripts/windows-up.sh monitoring
  ./scripts/windows-up.sh full

Notes:
  - Run this script from Git Bash.
  - Windows startup automatically applies compose/compose.windows.yml.
  - The Windows override disables Linux-only host exporters.
EOF
}

mode="${1:-elk}"
ensure_env
cd "${devops_dir}"

case "${mode}" in
  elk)
    docker compose -f modules/elk/compose.yml up -d
    ;;
  monitoring)
    docker compose -f compose/compose.yml -f compose/compose.windows.yml --profile monitoring up -d
    ;;
  full)
    docker compose -f compose/compose.yml -f compose/compose.windows.yml --profile full up -d
    ;;
  gateway|cicd|scm)
    docker compose -f compose/compose.yml -f compose/compose.windows.yml --profile "${mode}" up -d
    ;;
  *)
    usage
    exit 1
    ;;
esac
