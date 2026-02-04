# Workflow Tests

This directory contains automated tests for GitHub Actions workflow configurations.

## Available Tests

### check-workflow-triggers.sh

Validates that workflow trigger configurations are correct, specifically:

- `publish.yml` must only have `workflow_dispatch` trigger (manual execution only)
- No automatic triggers like `push` or `pull_request` are allowed in `publish.yml`
- YAML syntax must be valid

**Usage:**

```bash
bash scripts/tests/check-workflow-triggers.sh
```

**Integration:**

This test is automatically run as part of the pre-commit hook (`.hooks/pre-commit`).

## Adding New Tests

When adding new workflow tests:

1. Create a new script in this directory
2. Make it executable: `chmod +x scripts/tests/your-test.sh`
3. Add it to `.hooks/pre-commit` if it should run on every commit
4. Document it here in this README
