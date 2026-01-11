#!/bin/bash

echo "Starting Game Server"
echo "=================================================="

# Check if Docker is running
echo "Checking Docker status..."
if ! docker info > /dev/null 2>&1; then
    echo "Docker is not running"
    exit 1
fi
echo "Docker is running"

deno run \
  --allow-net \
  --allow-run \
  --allow-env \
  --allow-read \
  --allow-write \
  src/main.ts

echo ""
echo "Cleaning up..."
docker ps -a --filter "name=game-room-" --format "{{.ID}}" | xargs -r docker rm -f
echo "Done."