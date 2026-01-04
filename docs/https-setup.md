# HTTPS Setup Guide

Enable HTTPS for CyberMem deployments on RPi or VPS.

## Option 1: mkcert (Local/LAN)

Best for Raspberry Pi on local network.

### Install mkcert

```bash
# macOS
brew install mkcert

# Linux (Debian/Ubuntu)
sudo apt install libnss3-tools
curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/arm64"  # RPi
chmod +x mkcert-*
sudo mv mkcert-* /usr/local/bin/mkcert

# Install local CA
mkcert -install
```

### Generate Certificates

```bash
cd /opt/cybermem
mkcert -key-file key.pem -cert-file cert.pem \
  localhost 127.0.0.1 ::1 \
  raspberrypi.local $(hostname -I | awk '{print $1}')
```

### Configure Dashboard

Update `docker-compose.yml`:

```yaml
services:
  dashboard:
    environment:
      - HTTPS_KEY=/app/certs/key.pem
      - HTTPS_CERT=/app/certs/cert.pem
    volumes:
      - ./key.pem:/app/certs/key.pem:ro
      - ./cert.pem:/app/certs/cert.pem:ro
    ports:
      - "3000:3000"  # HTTPS
```

### Install CA on Other Devices

Copy `~/.local/share/mkcert/rootCA.pem` to other devices and install:

- **macOS**: Double-click → Keychain → Trust
- **iOS**: AirDrop → Settings → Profile Downloaded → Install
- **Android**: Settings → Security → Install certificate

---

## Option 2: Caddy (Production VPS)

Automatic HTTPS with Let's Encrypt.

### Install Caddy

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

### Caddyfile

```
cybermem.yourdomain.com {
    reverse_proxy localhost:3000
}

api.cybermem.yourdomain.com {
    reverse_proxy localhost:8080
}
```

### Run

```bash
sudo systemctl enable caddy
sudo systemctl start caddy
```

---

## Verification

```bash
# Check certificate
curl -I https://localhost:3000  # mkcert
curl -I https://cybermem.yourdomain.com  # Caddy

# Dashboard should load with 🔒 in browser
```

## Troubleshooting

| Issue                             | Solution                             |
| --------------------------------- | ------------------------------------ |
| "NET::ERR_CERT_AUTHORITY_INVALID" | Install mkcert CA on device          |
| "Connection refused"              | Check firewall: `sudo ufw allow 443` |
| Caddy not starting                | Check logs: `journalctl -u caddy`    |
