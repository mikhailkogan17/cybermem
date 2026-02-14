---
"@cybermem/cli": patch
"@cybermem/mcp": patch
"@cybermem/dashboard": patch
---

Migrate version management to Changesets

- Remove custom bash scripts (version-bump.sh, release.sh)
- Add Changesets for automated versioning and changelog generation
- Update publish workflow to use Changesets
- Add documentation for new release process
