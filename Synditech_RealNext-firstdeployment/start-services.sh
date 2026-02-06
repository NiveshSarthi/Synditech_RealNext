#!/bin/bash

# Start backend
echo "Starting Backend on port 5050..."
cd /app/backend && PORT=5050 npm start &

# Start frontend (standalone mode)
echo "Starting Frontend on port 3030..."
cd /app/frontend && PORT=3030 node server.js &

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?
