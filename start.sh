#!/bin/bash
echo "Starting OmniDoc application and voice service..."

# Start the voice service in the background
echo "Starting Voice API service..."
# Kill any existing voice processes
pkill -f "python voice_api.py" 2>/dev/null || echo "No existing voice process found"
sleep 1
nohup python voice_api.py > voice_service.log 2>&1 &
VOICE_PID=$!
echo "Voice API service started with PID: $VOICE_PID"

# Start the main application
echo "Starting main application..."
npm run dev

# Cleanup when the script exits
trap 'echo "Shutting down services..."; kill $VOICE_PID 2>/dev/null || true' EXIT