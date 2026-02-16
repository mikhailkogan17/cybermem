# @cybermem/dashboard

## 0.14.13

### Patch Changes

- Automated patch version bump.

## 0.14.12

### Patch Changes

- Automated patch version bump.

## 0.14.11

### Patch Changes

- [#120](https://github.com/mikhailkogan17/cybermem/pull/120) [`2319994`](https://github.com/mikhailkogan17/cybermem/commit/2319994f096e4063e2ca4bc4ca02eb8b33f192ce) Thanks [@mikhailkogan17-antigravity](https://github.com/mikhailkogan17-antigravity)! - fix(mcp): remove redundant transport.start() call causing SSE crash loop; switch to SSEServerTransport for multi-client support
  fix(dashboard): update mcp-config API to support SSE and --allow-http

## 0.14.8

### Patch Changes

- Automated patch version bump.

## 0.14.7

### Patch Changes

- [#114](https://github.com/mikhailkogan17/cybermem/pull/114) [`7871ba9`](https://github.com/mikhailkogan17/cybermem/commit/7871ba96c9008a8188a84bc379e9687e716ed9e9) Thanks [@mikhailkogan17-antigravity](https://github.com/mikhailkogan17-antigravity)! - fix(mcp): switch to SSEServerTransport for multi-client support
  fix(dashboard): update mcp-config API to support SSE and --allow-http

## 0.14.6

### Patch Changes

- Automated release for patch version bump.

## 0.14.5

### Patch Changes

- Automated release for patch version bump.

## 0.14.4

### Patch Changes

- [#86](https://github.com/mikhailkogan17/cybermem/pull/86) [`ffca5dd`](https://github.com/mikhailkogan17/cybermem/commit/ffca5dd374a50f594c1a935f1fe81ee1e1e3c6fe) Thanks [@copilot-swe-agent](https://github.com/apps/copilot-swe-agent)! - Migrate version management to Changesets

  - Remove custom bash scripts (version-bump.sh, release.sh)
  - Add Changesets for automated versioning and changelog generation
  - Update publish workflow to use Changesets
  - Add documentation for new release process
