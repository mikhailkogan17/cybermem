# Contributing to CyberMem

Thank you for your interest in contributing to CyberMem! We welcome contributions from the community.

## 🏗 Project Structure

CyberMem is a monorepo managed by NPM Workspaces.

- **packages/cli**: The `@cybermem/cli` tool (Node.js)
- **packages/dashboard**: The Next.js dashboard web interface
- **packages/mcp**: The TypeScript MCP server (uses `openmemory-js` via npm)

## 🚀 Development Setup

### Prerequisites
- Node.js 18+
- Python 3.10+
- Docker & Docker Compose

### Initial Setup

1. **Clone the repository** (recursive for submodules):
   ```bash
   git clone --recursive https://github.com/mikhailkogan17/cybermem.git
   cd cybermem
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

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

1. **Architecture**: CyberMem uses `openmemory-js` (npm) as the core memory engine, with Traefik as the API gateway.
2. **Commit Messages**: Follow [Conventional Commits](https://www.conventionalcommits.org/) (e.g., `feat:`, `fix:`, `docs:`).
3. **Linting**: Ensure `npm run lint` passes before pushing.

## 🔒 Security

If you discover a security vulnerability, please do **NOT** open an issue. Email the maintainer directly or reach out via private channels.

## 📄 License
By contributing, you agree that your contributions will be licensed under the MIT License.
