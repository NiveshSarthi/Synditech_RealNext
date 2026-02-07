#!/bin/bash
set -e

# Trap for graceful shutdown
cleanup() {
  echo "Shutting down services..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
  exit 0
}
trap cleanup SIGTERM SIGINT

if [ -f /app/.env ]; then
  sed -i 's/\r$//' /app/.env
  set -a
  . /app/.env
  set +a
fi

BACKEND_PORT="${PORT_BACKEND:-5050}"
FRONTEND_PORT="${PORT_FRONTEND:-3030}"

echo "Starting Backend on port ${BACKEND_PORT}..."
cd /app/backend && PORT="${BACKEND_PORT}" npm start &
BACKEND_PID=$!

echo "Starting Frontend on port ${FRONTEND_PORT}..."
cd /app/frontend && PORT="${FRONTEND_PORT}" node server.js &
FRONTEND_PID=$!

# Wait for all background processes
wait
