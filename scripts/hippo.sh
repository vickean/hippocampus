#!/usr/bin/env bash
# Hippocampus CLI helper. Sources .env then makes API calls.
# Usage:
#   hippo.sh get                              → list deployments
#   hippo.sh get <id>                         → fetch one
#   hippo.sh post '<json>'                    → create
#   hippo.sh patch <id> '<json>'              → update
#   hippo.sh delete <id>                      → delete
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ -f "$REPO_ROOT/.env" ]; then
  set -a
  source "$REPO_ROOT/.env"
  set +a
fi

if [ -z "${HIPPOCAMPUS_API_TOKEN:-}" ] || [ -z "${HIPPOCAMPUS_API_URL:-}" ]; then
  echo "Error: HIPPOCAMPUS_API_TOKEN and HIPPOCAMPUS_API_URL must be set (via .env or env vars)" >&2
  exit 1
fi

case "${1:-}" in
  get)
    if [ -n "${2:-}" ]; then
      curl -sS -H "Authorization: Bearer $HIPPOCAMPUS_API_TOKEN" "$HIPPOCAMPUS_API_URL/$2"
    else
      curl -sS -H "Authorization: Bearer $HIPPOCAMPUS_API_TOKEN" "$HIPPOCAMPUS_API_URL"
    fi
    ;;
  post)
    curl -sS -X POST \
      -H "Authorization: Bearer $HIPPOCAMPUS_API_TOKEN" \
      -H "Content-Type: application/json" \
      -d "$2" "$HIPPOCAMPUS_API_URL"
    ;;
  patch)
    curl -sS -X PATCH \
      -H "Authorization: Bearer $HIPPOCAMPUS_API_TOKEN" \
      -H "Content-Type: application/json" \
      -d "$3" "$HIPPOCAMPUS_API_URL/$2"
    ;;
  delete)
    curl -sS -X DELETE \
      -H "Authorization: Bearer $HIPPOCAMPUS_API_TOKEN" \
      "$HIPPOCAMPUS_API_URL/$2"
    ;;
  *)
    echo "Usage: $0 {get [id]|post '<json>'|patch <id> '<json>'|delete <id>}" >&2
    exit 1
    ;;
esac