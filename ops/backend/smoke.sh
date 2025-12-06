#!/usr/bin/env bash
set -euo pipefail

# Smoke test for friend-finder backend: start the Flask-SocketIO app and test WebSocket connectivity
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
BACKEND_DIR=$(cd "$SCRIPT_DIR/../../backend" && pwd)
PROJECT_ROOT=$(cd "$BACKEND_DIR/.." && pwd)
cd "$PROJECT_ROOT"

echo "Installing dependencies..."
pip install -q -r "$BACKEND_DIR/requirements.txt"

export PYTHONPATH="$PROJECT_ROOT"
PORT=${PORT:-8080}
HOST=127.0.0.1

# Start app in background (using Flask-SocketIO's built-in server for testing)
echo "Starting backend server..."
( python3 -c "
import sys
sys.path.insert(0, '$PROJECT_ROOT')
from backend.main import app, socketio
print('Starting server on $HOST:$PORT', flush=True)
socketio.run(app, host='$HOST', port=$PORT, debug=False, allow_unsafe_werkzeug=True, log_output=True)
" >/tmp/backend_smoke.log 2>&1 ) &
PID=$!

cleanup() {
  echo "Cleaning up..."
  kill "$PID" 2>/dev/null || true
}
trap cleanup EXIT

# Wait for app to be ready
ATTEMPTS=30
echo "Waiting for server to start..."
until nc -z "$HOST" "$PORT" 2>/dev/null || [ $ATTEMPTS -eq 0 ]; do
  ATTEMPTS=$((ATTEMPTS-1))
  sleep 1
  echo "Waiting for app... attempts left: $ATTEMPTS"
  if ! kill -0 "$PID" 2>/dev/null; then
    echo "App process exited unexpectedly:" >&2
    tail -n +1 /tmp/backend_smoke.log || true
    exit 1
  fi
done

if [ $ATTEMPTS -eq 0 ]; then
  echo "Server failed to start in time" >&2
  tail -n +1 /tmp/backend_smoke.log || true
  exit 1
fi

echo "Server is up, testing health endpoint..."

# Test health endpoint
HEALTH_RESPONSE=$(curl -fsS --max-time 5 "http://$HOST:$PORT/health" 2>&1)
if [ $? -ne 0 ]; then
  echo "❌ Health endpoint failed to respond" >&2
  echo "Response: $HEALTH_RESPONSE" >&2
  tail -n +1 /tmp/backend_smoke.log || true
  exit 1
fi

echo "$HEALTH_RESPONSE" | tee /tmp/health.json
echo "✓ Health endpoint responded"

# Validate health response
if ! echo "$HEALTH_RESPONSE" | grep -q '"status"'; then
  echo "❌ Health response missing 'status' field" >&2
  exit 1
fi
echo "✓ Health response valid"

# Test Socket.IO endpoint availability (just check it responds)
echo "Testing Socket.IO endpoint..."
SOCKETIO_RESPONSE=$(curl -fsS --max-time 5 "http://$HOST:$PORT/socket.io/?transport=polling&EIO=4" 2>&1 | head -c 100)
if [ $? -ne 0 ]; then
  echo "❌ Socket.IO endpoint not responding" >&2
  echo "Response: $SOCKETIO_RESPONSE" >&2
  exit 1
fi
echo "✓ Socket.IO endpoint is accessible"

echo ""
echo "  Backend smoke test passed!"
echo "   - Health endpoint: ✓"
echo "   - Socket.IO endpoint: ✓"

