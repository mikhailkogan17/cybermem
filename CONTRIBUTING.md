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

### Pre-Push Validation

Before pushing your changes, run the validation script to catch issues early:

```bash
npm run validate
```

This will:
- Validate changeset configuration
- Check version consistency across packages
- Run NPM publish dry-run

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
4. **Branch Naming**: 
   All branches MUST follow the format: `<type>/CM-<number>-<description>`
   - Types: `feat`, `fix`, `chore`, `docs`, `test`
   - Example: `fix/CM-0-mcp-stdio-attribution`
5. **Pull Requests**:
   Agent PRs MUST use the provided templates and include mandatory headers:
   - **Bugfixes**: `Analysis`, `Symptom`, `Root Cause`, `Fix Strategy`, `Prevention`, `Verification`.
   - **Features**: `Decomposition`, `Verification`.
   - PRs failing these requirements will be blocked by CI.

## 📦 Release Process

CyberMem uses [Changesets](https://github.com/changesets/changesets) for version management and publishing.

### Release Stability Checklist

> See sections 1.3 and 11 of `GEMINI.md` for the full release process, stability checklist, and failure recovery table.
> Run `npm run validate` before pushing to catch issues early.

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
