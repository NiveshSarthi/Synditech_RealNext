#!/bin/bash

# Start backend
echo "Starting Backend on port 5050..."
cd /app/backend && npm start &

# Start frontend (standalone mode)
echo "Starting Frontend on port 3030..."
cd /app/frontend && node server.js &

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?
