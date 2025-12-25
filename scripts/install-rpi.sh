#!/bin/bash
set -e

# CyberMem 'Housewife-Friendly' Installer for Raspberry Pi
# Usage: curl -sL <url> | bash

GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${GREEN}🧠 CyberMem RPi Installer${NC}"
echo "-----------------------------------"

# 1. Install prerequisites
echo "Checking dependencies..."
if ! command -v git &> /dev/null; then
    echo "Installing git..."
    sudo apt-get update && sudo apt-get install -y git
fi

if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    echo "Docker installed. Please re-login or run 'newgrp docker' to use it without sudo."
    echo "Restarting script with sudo..."
    exec sudo "$0" "$@"
fi

# 2. Clone/Update Repo
TARGET_DIR=~/cybermem
if [ -d "$TARGET_DIR" ]; then
    echo "Updating existing installation in $TARGET_DIR..."
    cd $TARGET_DIR
    git pull
else
    echo "Cloning repository..."
    git clone --recursive https://github.com/mikhailkogan/cybermem.git $TARGET_DIR
    cd $TARGET_DIR
fi

# 3. Setup Config
echo "Configuring environment..."
if [ ! -f .env ]; then
    if [ -f .env.rpi ]; then
        cp .env.rpi .env
        echo "Using .env.rpi default configuration."
    else
        echo "Error: .env.rpi template missing!"
        exit 1
    fi
fi

# 4. Deploy
echo "Deploying containers..."
docker compose build --pull
docker compose up -d

# 5. Magic String
IP=$(hostname -I | cut -d' ' -f1)
HOSTNAME=$(hostname).local

echo ""
echo -e "${GREEN}✅ Installation Complete!${NC}"
echo "-----------------------------------"
echo "Access your memory at:"
echo -e "  Dashboard:   ${GREEN}http://$IP:3000${NC} (or http://$HOSTNAME:3000)"
echo -e "  MCP Config:  ${GREEN}http://$IP:8080/mcp${NC}"
echo ""
echo "To stop: cd ~/cybermem && docker compose down"
