#!/usr/bin/env bash
set -euo pipefail

# Run backend tests with pytest
BACKEND_DIR=$(cd "$(dirname "$0")/../.." && pwd)/backend
PROJECT_ROOT=$(cd "$BACKEND_DIR/.." && pwd)

echo "Running backend tests..."
echo "Backend directory: $BACKEND_DIR"
echo "Project root: $PROJECT_ROOT"
echo ""

cd "$PROJECT_ROOT"

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 not found. Please ensure Python is installed." >&2
  exit 1
fi

echo "Installing dependencies..."
python3 -m pip install --upgrade pip >/dev/null
python3 -m pip install -r "$BACKEND_DIR/requirements.txt" >/dev/null

echo "Running pytest..."
export PYTHONPATH="$PROJECT_ROOT"
python3 -m pytest -v --cov=backend --cov-report=term-missing backend/tests

echo ""
echo "✅ All tests passed!"