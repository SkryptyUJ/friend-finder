#!/usr/bin/env bash
set -euo pipefail

# Triggers a deployment of backend Render
# Requires env var RENDER_DEPLOY_HOOK (a Deploy Hook URL from Render)

if [[ -z "${RENDER_DEPLOY_HOOK:-}" ]]; then
  echo "RENDER_DEPLOY_HOOK is not set" >&2
  exit 1
fi

curl -fsS -X POST "$RENDER_DEPLOY_HOOK"
echo "Triggered frontend DEV deploy on Render"
