#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../../frontend"

echo "Installing dependencies..."
npm ci --silent

echo "Running frontend smoke tests..."
npm run smoke
