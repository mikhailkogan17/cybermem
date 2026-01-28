#!/bin/bash
set -e

RPI_HOST="pi@raspberrypi.local"
REMOTE_DIR="/home/pi/cybermem"

echo "🚀 Syncing Source Code to RPi [$RPI_HOST]..."

# Sync source code (excluding heavy deps and artifacts)
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'dist' \
    --exclude '.next' \
    --exclude 'coverage' \
    --exclude 'release-reports' \
    --exclude 'tmp' \
    ./ "$RPI_HOST:$REMOTE_DIR"

echo "✅ Sync complete."

echo "🏗️  Triggering Remote Build on RPi..."
ssh "$RPI_HOST" "cd $REMOTE_DIR && \
    export DOCKER_DEFAULT_PLATFORM=linux/arm64 && \
    PROJECT_NAME=cybermem CYBERMEM_ENV=prod docker-compose -p cybermem -f packages/cli/templates/docker-compose.yml up -d --build --force-recreate"

echo "🎉 RPi Deployment Triggered."
