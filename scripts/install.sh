#!/bin/bash
set -u

# CyberMem Installer
# Installs CyberMem to ~/.cybermem and sets up a CLI alias.

CYBERMEM_DIR="$HOME/.cybermem"
REPO_URL="https://github.com/mikhailkogan17/cybermem.git"
BRANCH="main"

# Colors
GREEN='\033[1;32m' # Emerald Neon
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}"
echo "   ______      __              __  ___"
echo "  / ____/_  __/ /_  ___  _____/  |/  /___  ____ ___"
echo " / /   / / / / __ \/ _ \/ ___/ /|_/ / _ \/ __ \`__ \\"
echo "/ /___/ /_/ / /_/ /  __/ /  / /  / /  __/ / / / / /"
echo "\____/\__, /_.___/\___/_/  /_/  /_/\___/_/ /_/ /_/"
echo "     /____/                                       "
echo -e "${NC}"
echo "Installing CyberMem..."

# Helper: Wait for Docker to start
wait_for_docker() {
    echo -e "${BLUE}Waiting for Docker daemon to start...${NC}"
    local counter=0
    local max_attempts=30 # 30 * 2s = 60s timeout usually enough, or loop forever with prompt

    while ! docker info >/dev/null 2>&1; do
        printf "."
        sleep 2
        counter=$((counter+1))

        # Every 10 seconds, remind user
        if [ $((counter % 5)) -eq 0 ]; then
             echo ""
             echo -e "${YELLOW}Docker is not running yet. Please start Docker Desktop.${NC}"
             # Try to open it for them on Mac
             if [[ "$OSTYPE" == "darwin"* ]]; then
                open -a Docker 2>/dev/null || true
             fi
        fi
    done
    echo ""
    echo -e "${GREEN}Docker is running!${NC}"
}

install_docker() {
    echo -e "${BLUE}Docker not found. Attempting to install...${NC}"
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command -v curl >/dev/null 2>&1; then
            echo "Running Docker automated installer..."
            curl -fsSL https://get.docker.com | sh
            # Linux usually needs explicit start depending on distro, but get-docker script attempts it
            # We will rely on wait_for_docker to catch if it didn't start
        else
             echo -e "${RED}Error: curl required for auto-install.${NC}"
             exit 1
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v brew >/dev/null 2>&1; then
            echo "Installing Docker via Homebrew..."
            brew install --cask docker
            echo -e "${YELLOW}Docker installed.${NC}"
            echo "Attempting to launch Docker Desktop..."
            open -a Docker || echo -e "${YELLOW}Please open 'Docker' from your Applications folder manually.${NC}"
        else
            echo -e "${RED}Homebrew not found.${NC}"
            echo "Please install Docker Desktop manually: https://www.docker.com/products/docker-desktop/"
            read -p "Press Enter once you have installed and started Docker..."
        fi
    else
        echo -e "${RED}OS not supported for auto-install.${NC}"
        echo "Please install Docker manually: https://www.docker.com/get-started"
        exit 1
    fi
}

# 1. Check Prerequisites
if ! command -v git >/dev/null 2>&1; then
    echo -e "${RED}Error: git is not installed. Please install git.${NC}"
    exit 1
fi

# Check if Docker exists
if ! command -v docker >/dev/null 2>&1; then
    echo -e "${YELLOW}Docker is missing.${NC}"
    read -p "Install Docker now? [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        install_docker
    else
        echo "Docker is required for CyberMem. Aborting."
        exit 1
    fi
fi

# Check if Docker is running (even if installed)
if ! docker info >/dev/null 2>&1; then
    wait_for_docker
fi

# 2. Clone/Update Repo
if [ -d "$CYBERMEM_DIR" ]; then
    echo -e "${BLUE}Updating existing installation in $CYBERMEM_DIR...${NC}"
    cd "$CYBERMEM_DIR" || exit
    git pull
else
    echo -e "${BLUE}Cloning into $CYBERMEM_DIR...${NC}"
    if ! git clone --recursive "$REPO_URL" "$CYBERMEM_DIR"; then
        echo -e "${RED}Error: Failed to clone repository.${NC}"
        echo "Please check your internet connection or the repository URL."
        exit 1
    fi
    cd "$CYBERMEM_DIR" || exit
fi

# 3. Setup Environment
if [ ! -f .env.local ]; then
    echo -e "${BLUE}Creating default configuration (.env.local)...${NC}"
    cp .env.example .env.local
fi

# 4. Create Alias/CLI Wrapper
SHELL_CONFIG=""
case "$SHELL" in
    */zsh) SHELL_CONFIG="$HOME/.zshrc" ;;
    */bash) SHELL_CONFIG="$HOME/.bashrc" ;;
    *) SHELL_CONFIG="$HOME/.profile" ;;
esac

if [ -n "$SHELL_CONFIG" ]; then
    if ! grep -q "alias cybermem=" "$SHELL_CONFIG"; then
        echo -e "${BLUE}Adding 'cybermem' alias to $SHELL_CONFIG...${NC}"
        echo "" >> "$SHELL_CONFIG"
        echo "# CyberMem CLI" >> "$SHELL_CONFIG"
        echo "alias cybermem='cd $CYBERMEM_DIR && ./deploy.sh --target local'" >> "$SHELL_CONFIG"
        echo "alias cybermem-update='cd $CYBERMEM_DIR && git pull && ./deploy.sh --target local'" >> "$SHELL_CONFIG"
    fi
fi

# 5. Launch
echo -e "${GREEN}Installation Complete!${NC}"
echo "Starting CyberMem with pre-built images..."

# Use pre-built images for faster startup
export USE_PREBUILT=1

# Default to local if no target specified
if [ $# -eq 0 ]; then
    ./deploy.sh --target local
else
    ./deploy.sh "$@"
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}                    🎉 SUCCESS! 🎉                          ${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📊 Dashboard:${NC}  http://localhost:3000"
echo -e "${BLUE}🔌 MCP Server:${NC} http://localhost:8080/mcp"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}           Connect Your AI Assistant                       ${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}🤖 Claude Desktop:${NC}"
echo "   1. Open Claude Desktop"
echo "   2. Go to Settings → Developer → Edit Config"
echo "   3. Add this configuration:"
echo ""
echo -e "${GREEN}   {\"mcpServers\": {\"cybermem\": {\"url\": \"http://localhost:8080/mcp\", \"type\": \"sse\"}}}${NC}"
echo ""
echo -e "${BLUE}💻 Cursor:${NC}"
echo "   1. Open Settings (Cmd+,)"
echo "   2. Go to Features → MCP"
echo "   3. Click 'Add New MCP Server'"
echo "   4. Enter URL: http://localhost:8080/mcp"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}💡 Quick Commands:${NC}"
echo "   ${GREEN}cybermem${NC}        - Start/restart CyberMem"
echo "   ${GREEN}cybermem-update${NC} - Update to latest version"
echo ""
echo -e "${BLUE}📚 Full setup guide:${NC} http://localhost:3000"
echo ""
echo -e "${BLUE}ℹ️  Note:${NC} You may need to restart your terminal or run:"
echo "   source $SHELL_CONFIG"
echo ""
