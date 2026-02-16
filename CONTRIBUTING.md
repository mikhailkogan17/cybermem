# Contributing to CyberMem

Thank you for your interest in contributing to CyberMem! We welcome contributions from the community.

## 🏗 Project Structure

CyberMem is a monorepo managed by NPM Workspaces.

- **packages/cli**: The `@cybermem/cli` tool (Node.js)
- **packages/dashboard**: The Next.js dashboard web interface
- **packages/mcp**: The TypeScript MCP server using the `openmemory-js` Core Memory Engine (via npm)

## 🚀 Development Setup

### Prerequisites
- Node.js 18+
- Python 3.10+
- Docker & Docker Compose

### Initial Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/mikhailkogan17/cybermem.git
   cd cybermem
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```
   
   This will automatically set up git hooks from `.hooks/` to `.git/hooks/` via the `prepare` script.

3. **Start local development**:
   The project has a startup workflow to prevent sleep mode on Mac.
   ```bash
   # In VS Code, this should run automatically.
   # Consult the project rules for /startup alias details.
   ```

## 🛠 Working on Components

### Dashboard (`packages/dashboard`)
```bash
cd packages/dashboard
npm run dev
# Dashboard at http://localhost:3000
```

### CLI (`packages/cli`)
```bash
cd packages/cli
npm run build
npm link
# Now you can run `cybermem` locally
```

## 🤝 Rules of Engagement

1. **Architecture**: CyberMem integrates the `openmemory-js` Core Memory Engine (via npm) with Traefik as the API gateway.
2. **Commit Messages**: Follow [Conventional Commits](https://www.conventionalcommits.org/) (e.g., `feat:`, `fix:`, `docs:`).
3. **Linting**: Ensure `npm run lint` passes before pushing.

## 📦 Release Process

CyberMem uses [Changesets](https://github.com/changesets/changesets) for version management and publishing.

### Release Stability Checklist

**Before Triggering Release Workflow:**

- [ ] All PRs have passed E2E tests on both staging (8625) and prod (8626) ports
- [ ] Version consistency check passed (all packages have same version)
- [ ] Changeset configuration is valid (`.changeset/config.json`)
- [ ] NPM publish dry-run succeeded
- [ ] No pending security vulnerabilities (run `npm audit`)
- [ ] SSE transport multi-session tests passed
- [ ] Docker health checks pass within 120s timeout

**During Release:**

- [ ] Monitor publish workflow progress in GitHub Actions
- [ ] Verify NPM packages published successfully
- [ ] Check Docker images built for all architectures (amd64, arm64)
- [ ] Confirm Ansible deployment to RPi completed without errors
- [ ] Verify release PR created and auto-merged

**Post-Release Verification:**

- [ ] Test `npx @cybermem/cli@latest install` on fresh environment
- [ ] Verify RPi production environment running new version
- [ ] Check release notes in GitHub release
- [ ] Monitor Slack notifications for any failures
- [ ] Run smoke tests on production: `curl https://raspberrypi.ts.net/health`

**Common Failure Modes & Solutions:**

| Issue | Solution |
|-------|----------|
| Version already published | Workflow auto-bumps patch version |
| Docker registry 502 | Retry logic handles transient failures (3 attempts) |
| Health check timeout | Check container logs: `docker logs <container-name>` |
| RPi deployment failure | SSH to RPi, check disk space and Docker status |
| Changeset not found | Run `npm run changeset` or use workflow_dispatch with version_type |
| ARM64 build hang/OOM | Reduce parallelism, check QEMU memory limits |
| Finalize job push failure | Ensure GITHUB_TOKEN has write permissions |

### Creating a Changeset

When you make changes that should be included in a release:

```bash
npm run changeset
```

This will prompt you to:
1. Select which packages have changed
2. Choose the version bump type (patch, minor, major)
3. Write a summary of your changes

The changeset will be saved in the `.changeset/` directory and committed with your PR.

### Publishing a Release

Releases are handled automatically by the CI/CD pipeline via GitHub Actions:

1. **Trigger Release Workflow**: Go to Actions → Publish → Run workflow
2. **Versioning**: The workflow uses the committed Changesets in `.changeset/` to determine which packages to release and what version bumps to apply.
3. **Automated Steps**:
   - Validates changeset configuration
   - Checks version consistency
   - Runs E2E tests
   - Builds production images
   - Applies all pending changesets (bumps versions and updates CHANGELOG.md)
   - Publishes packages to NPM
   - Deploys to production
   - Creates GitHub release

### Manual Publishing (Local)

For testing or emergency releases:

```bash
# Apply all pending changesets
npm run version

# Build and publish (requires NPM auth)
npm run release
```

**Note**: All packages in the monorepo are versioned together as linked packages. When any package is bumped, all packages receive the same version number.

## 🔒 Security

If you discover a security vulnerability, please do **NOT** open an issue. Email the maintainer directly or reach out via private channels.

## 📄 License
By contributing, you agree that your contributions will be licensed under the MIT License.
