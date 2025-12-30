#!/bin/bash
set -eo pipefail

# CyberMem Universal Deployment Script
# Deploys to: local (docker-compose) | rpi (ansible) | vps (helm)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
TARGET=""
ACTION="up"
ENV_FILE=""

usage() {
    cat <<EOF
Usage: ./deploy.sh --target <local|rpi|vps> [OPTIONS]

Targets:
  local   Deploy locally using docker-compose
  rpi     Deploy to Raspberry Pi using Ansible
  vps     Deploy to VPS using Helm (Kubernetes)

Options:
  --action <up|down|logs>  Action to perform (default: up)
  --help                   Show this help message

Examples:
  ./deploy.sh --target local
  ./deploy.sh --target vps --action up
  ./deploy.sh --target rpi --action down

Environment files:
  local: .env.local (SQLite + Ollama)
  rpi:   .env.rpi (SQLite + Ollama, resource limits)
  vps:   values-vps.yaml (PostgreSQL + OpenAI)
EOF
    exit 0
}

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}


# Helper: Wait for Docker to start
wait_for_docker() {
    echo -e "${BLUE}Waiting for Docker daemon to start...${NC}"
    local counter=0

    while ! docker info > /dev/null 2>&1; do
        printf "."
        sleep 2
        counter=$((counter+1))

        if [ $((counter % 5)) -eq 0 ]; then
             echo ""
             echo -e "${YELLOW}Docker is not running yet. Please start Docker Desktop.${NC}"
             if [[ "$OSTYPE" == "darwin"* ]]; then
                open -a Docker 2>/dev/null || true
             fi
        fi
    done
    echo ""
    echo -e "${GREEN}Docker is running!${NC}"
}

check_prerequisites() {
    local target=$1

    case "$target" in
        local)
            command -v docker >/dev/null 2>&1 || log_error "docker not found. Install: https://docs.docker.com/get-docker/"
            command -v docker-compose >/dev/null 2>&1 || log_error "docker-compose not found"

            if ! docker info > /dev/null 2>&1; then
                wait_for_docker
            fi
            ;;
        rpi)
            command -v ansible >/dev/null 2>&1 || log_error "ansible not found. Install: brew install ansible"
            [[ -f "ansible/inventory/hosts.ini" ]] || log_error "Ansible inventory not found"
            ;;
        vps)
            command -v helm >/dev/null 2>&1 || log_error "helm not found. Install: brew install helm"
            command -v kubectl >/dev/null 2>&1 || log_error "kubectl not found. Install: brew install kubectl"
            kubectl cluster-info >/dev/null 2>&1 || log_error "kubectl not connected to cluster"
            ;;
    esac
}

deploy_local() {
    log_info "Deploying to local environment"

    if [[ -f ".env.local" ]]; then
        ENV_FILE=".env.local"
        log_info "Using .env.local"
    elif [[ -f ".env" ]]; then
        ENV_FILE=".env"
        log_info "Using .env (fallback)"
    else
        log_error "Environment file not found. Create .env.local or .env"
    fi

    case "$ACTION" in
        up)
            log_info "Generating Documentation..."
            (cd docs && npm install && npm run build) || log_error "Failed to build documentation"

            log_info "Starting services with Ollama..."

            # Auto-detect ARM architecture (e.g. Raspberry Pi local install)
            local arch
            arch=$(uname -m)
            if [[ "$arch" == "aarch64" || "$arch" == "arm64" ]]; then
                log_info "Detected ARM architecture ($arch). Configuring for linux/arm64..."
                export DOCKER_PLATFORM="linux/arm64"
            fi

            # Use pre-built images if USE_PREBUILT=1, otherwise build locally
            if [[ "${USE_PREBUILT:-0}" == "1" ]]; then
                log_info "Using pre-built images from GHCR"
                docker-compose -f docker-compose.prod.yml --env-file "$ENV_FILE" --profile ollama up -d --pull always
            else
                log_info "Building images locally"
                docker-compose --env-file "$ENV_FILE" --profile ollama up -d --remove-orphans --force-recreate
            fi
            log_info "Waiting for services to be ready..."
            sleep 5
            docker-compose ps
            log_info "✅ Local deployment complete!"
            log_info "Access points:"
            log_info "  - OpenMemory:  http://localhost:8080"
            log_info "  - Traefik:     http://localhost:8081"
            log_info "  - Prometheus:  http://localhost:9090"
            log_info "  - Dashboard:   http://localhost:3000 (admin/admin)"
            ;;
        down)
            log_info "Stopping services..."
            docker-compose --env-file "$ENV_FILE" --profile ollama down
            log_info "✅ Services stopped"
            ;;
        logs)
            docker-compose --env-file "$ENV_FILE" logs -f
            ;;
        *)
            log_error "Unknown action: $ACTION"
            ;;
    esac
}

deploy_rpi() {
    log_info "Deploying to Raspberry Pi"

    if [[ ! -f "ansible/inventory/hosts.ini" ]]; then
        log_error "Ansible inventory not found. Create ansible/inventory/hosts.ini first"
    fi

    case "$ACTION" in
        up)
            log_info "Running Ansible playbook..."
            ansible-playbook -i ansible/inventory/hosts.ini \
                ansible/playbooks/deploy-cybermem.yml \
                -e "env_file=.env.rpi"
            log_info "✅ RPi deployment complete!"
            ;;
        down)
            ansible-playbook -i ansible/inventory/hosts.ini \
                ansible/playbooks/stop-cybermem.yml
            log_info "✅ Services stopped on RPi"
            ;;
        *)
            log_error "Action $ACTION not supported for RPi"
            ;;
    esac
}

interactive_vps_wizard() {
    log_info "Welcome to CyberMem VPS Setup"
    echo "---------------------------------"

    local VALUES_FILE="charts/cybermem/values-vps.yaml"

    if [[ -f "$VALUES_FILE" ]]; then
        read -p "Configuration file exists. Overwrite? [y/N] " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return
        fi
    fi

    # Domain
    read -p "Enter Domain (e.g. cybermem.example.com): " DOMAIN

    # Keys
    read -p "Enter CyberMem API Key [Leave empty to generate]: " OM_KEY
    if [[ -z "$OM_KEY" ]]; then
        OM_KEY=$(openssl rand -hex 16)
        echo "Generated Key: $OM_KEY"
    fi

    read -p "Enter OpenAI API Key [Optional]: " OPENAI_KEY

    # Write Config
    cat > "$VALUES_FILE" <<EOF
# Generated by deploy.sh wizard
openmemory:
  image:
    repository: ghcr.io/mikhailkogan17/cybermem-openmemory
    pullPolicy: Always
  service:
    type: ClusterIP

dashboard:
  image:
    repository: ghcr.io/mikhailkogan17/cybermem-dashboard
    pullPolicy: Always

env:
  OPENMEMORY_API_KEY: "$OM_KEY"
  OPENAI_API_KEY: "$OPENAI_KEY"
EOF
    log_info "Configuration saved to $VALUES_FILE"
}

deploy_vps() {
    log_info "Deploying to VPS (Kubernetes)"

    local CHART_DIR="charts/cybermem"
    local VALUES_FILE="$CHART_DIR/values-vps.yaml"
    local RELEASE_NAME="cybermem"

    # Wizard Check
    if [[ ! -f "$VALUES_FILE" ]]; then
        interactive_vps_wizard
    else
        read -p "Run configuration wizard? [y/N] " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            interactive_vps_wizard
        fi
    fi

    [[ -f "$VALUES_FILE" ]] || log_error "Values file $VALUES_FILE not found"

    case "$ACTION" in
        up)
            log_info "Installing/Upgrading Helm chart..."
            helm upgrade --install "$RELEASE_NAME" "$CHART_DIR" \
                -f "$VALUES_FILE" \
                --create-namespace \
                --namespace cybermem

            log_info "Waiting for pods to be ready..."
            kubectl wait --for=condition=ready pod \
                -l app.kubernetes.io/name=cybermem \
                -n cybermem \
                --timeout=120s || log_warn "Some pods not ready yet"

            log_info "✅ VPS deployment complete!"
            log_info "Getting service status..."
            kubectl get pods,svc -n cybermem
            ;;
        down)
            log_info "Uninstalling Helm chart..."
            helm uninstall "$RELEASE_NAME" -n cybermem
            log_info "✅ Services removed from VPS"
            ;;
        logs)
            log_info "Streaming logs from openmemory pod..."
            kubectl logs -f -n cybermem -l app.kubernetes.io/name=openmemory
            ;;
        *)
            log_error "Unknown action: $ACTION"
            ;;
    esac
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --target)
            TARGET="$2"
            shift 2
            ;;
        --action)
            ACTION="$2"
            shift 2
            ;;
        --help)
            usage
            ;;
        *)
            log_error "Unknown option: $1. Use --help for usage"
            ;;
    esac
done

# Validate target
if [[ -z "$TARGET" ]]; then
    log_error "Target not specified. Use --target <local|rpi|vps>"
fi

if [[ ! "$TARGET" =~ ^(local|rpi|vps)$ ]]; then
    log_error "Invalid target: $TARGET. Must be: local, rpi, or vps"
fi

# Check prerequisites
log_info "Checking prerequisites for target: $TARGET"
check_prerequisites "$TARGET"

# Deploy
case "$TARGET" in
    local)
        deploy_local
        ;;
    rpi)
        deploy_rpi
        ;;
    vps)
        deploy_vps
        ;;
esac

log_info "🚀 Done!"
echo ""
echo "---------------------------------------------------"
echo "  CYBERMEM DEPLOYMENT COMPLETE"
echo "---------------------------------------------------"
if [[ "$TARGET" == "local" ]]; then
    echo "  Dashboard:   http://localhost:3000"
    echo "  MCP Config:  http://localhost:8080/mcp"
elif [[ "$TARGET" == "rpi" ]]; then
    echo "  Dashboard:   http://<RPi_IP>:3000"
    echo "  MCP Config:  http://<RPi_IP>:8080/mcp"
elif [[ "$TARGET" == "vps" ]]; then
    echo "  Check your Ingress/Service IP via: kubectl get svc -n cybermem"
fi
echo "---------------------------------------------------"
echo "Use this URL in Cursor/Claude as your MCP Server."
echo ""
