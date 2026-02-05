#!/bin/bash
# Setup git hooks by symlinking from .hooks/ to .git/hooks/

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOOKS_SRC="$REPO_ROOT/.hooks"
HOOKS_DEST="$REPO_ROOT/.git/hooks"

echo "Setting up git hooks..."

# Ensure .git/hooks directory exists
mkdir -p "$HOOKS_DEST"

# Sync all hooks from .hooks/ to .git/hooks/
for hook in "$HOOKS_SRC"/*; do
  if [ -f "$hook" ]; then
    hook_name=$(basename "$hook")
    dest_path="$HOOKS_DEST/$hook_name"
    
    # Remove existing hook or symlink
    if [ -e "$dest_path" ] || [ -L "$dest_path" ]; then
      rm "$dest_path"
    fi
    
    # Create symlink to source hook
    ln -s "$hook" "$dest_path"
    chmod +x "$dest_path"
    echo "✅ Linked $hook_name"
  fi
done

echo "✅ Git hooks setup complete"
