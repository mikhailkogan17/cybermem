#!/bin/bash
set -e

RPI_HOST="pi@raspberrypi.local"
IMAGES=(
    "ghcr.io/mikhailkogan17/cybermem-mcp:latest"
    "ghcr.io/mikhailkogan17/cybermem-dashboard:latest"
    "ghcr.io/mikhailkogan17/cybermem-auth-sidecar:latest"
    "ghcr.io/mikhailkogan17/cybermem-db_exporter:latest"
    "ghcr.io/mikhailkogan17/cybermem-log_exporter:latest"
)

echo "🚀 Building/Ensuring images exist locally (ARM64)..."
# We assume local images are already built or we can trigger a build
# Using docker-compose build to be sure, targeting the local config since we are on Mac (ARM64)
# export CYBERMEM_ENV=prod; docker-compose -f packages/cli/templates/docker-compose.yml build

echo "📦 Saving and Pushing images to $RPI_HOST..."

for img in "${IMAGES[@]}"; do
    echo "  ➡️  Processing $img..."
    # Pipe docker save directly to ssh docker load to avoid intermediate files
    docker save "$img" | ssh "$RPI_HOST" "docker load"
done

echo "🔄 Restarting RPi services..."
ssh "$RPI_HOST" "cd /home/pi/cybermem && docker-compose up -d"

echo "✅ RPi Local Push Complete."
