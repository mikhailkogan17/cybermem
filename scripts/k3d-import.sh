#!/bin/bash
set -e

# Target clusters
CLUSTERS=("k3d-staging" "cybermem-vps")
IMAGES=(
    "ghcr.io/mikhailkogan17/cybermem-mcp:latest"
    "ghcr.io/mikhailkogan17/cybermem-dashboard:latest"
    "ghcr.io/mikhailkogan17/cybermem-auth-sidecar:latest"
    "ghcr.io/mikhailkogan17/cybermem-db_exporter:latest"
    "ghcr.io/mikhailkogan17/cybermem-log_exporter:latest"
)

echo "🚀 Starting Universal k3d Image Import..."

for cluster in "${CLUSTERS[@]}"; do
    if k3d cluster list | grep -q "$cluster"; then
        echo "📦 Importing images to [$cluster]..."
        k3d image import "${IMAGES[@]}" -c "$cluster"
        echo "✅ [$cluster] Import complete."
    else
        echo "⚠️  Cluster [$cluster] not found. Skipping."
    fi
done

echo "🎉 All imports finished."
