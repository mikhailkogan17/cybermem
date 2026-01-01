#!/bin/bash
set -e

echo "🚀 Preparing release for @cybermem/cli..."

# Navigate to cli directory
cd "$(dirname "$0")/../cli"

# Ensure clean state
rm -rf dist

# Build
echo "📦 Building package..."
npm install
npm run build

# Check if logged in to npm
if ! npm whoami >/dev/null 2>&1; then
    echo "❌ Error: You are not logged in to npm. Please run 'npm login' first."
    exit 1
fi

# Publish
echo "📤 Publishing to npm..."
npm publish

echo "✨ Release successful!"
