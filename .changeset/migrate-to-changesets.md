---
"@cybermem/cli": patch
"@cybermem/mcp": patch
"@cybermem/dashboard": patch
---

Migrate version management to changesets

- Remove custom bash scripts (version-bump.sh, release.sh)
- Add changesets for automated versioning and changelog generation
- Update publish workflow to use changesets
- Add documentation for new release process
