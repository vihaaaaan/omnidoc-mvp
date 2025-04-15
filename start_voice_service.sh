#!/bin/bash
echo "Starting Voice API service..."

# Kill any existing voice API processes
pkill -f "python voice_api.py" || echo "No existing voice process found"

# Wait a moment for processes to terminate
sleep 1

# Start the voice API service in the background
nohup python voice_api.py > voice_service.log 2>&1 &

# Store the PID
PID=$!
echo "Voice API service started with PID: $PID"
echo "Logs are being written to voice_service.log"

# Wait a moment for the service to start
sleep 2

# Check if the process is still running
if ps -p $PID > /dev/null; then
    echo "Voice API service is running successfully"
    echo "Recent logs:"
    tail -5 voice_service.log
else
    echo "Voice API service failed to start"
    echo "Check logs for details:"
    tail -10 voice_service.log
fi
