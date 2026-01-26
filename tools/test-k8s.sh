#!/bin/bash

# automated k3d verification script for CyberMem
set -e

CLUSTER_NAME="cybermem-test-$(date +%s)"
NAMESPACE="cybermem"

echo "🚀 Spinning up temporary k3d cluster: $CLUSTER_NAME"
k3d cluster create "$CLUSTER_NAME" --wait

# Ensure we teardown on exit
trap 'echo "🧹 Tearing down cluster..."; k3d cluster delete "$CLUSTER_NAME"' EXIT

echo "📦 Deploying CyberMem Helm chart..."
kubectl create namespace "$NAMESPACE"

# Use local chart
helm install cybermem ./packages/cli/templates/charts/cybermem \
  --namespace "$NAMESPACE" \
  --set openmemory.persistence.enabled=false \
  --wait

echo "🔍 Validating deployment..."
# Check if services are created
kubectl get svc -n "$NAMESPACE"

# Validate instanceType: "vps" identity logic (if mapped to helm)
# For now, just check if pods are running
kubectl get pods -n "$NAMESPACE"

echo "✅ k3d verification SUCCESSFUL!"
