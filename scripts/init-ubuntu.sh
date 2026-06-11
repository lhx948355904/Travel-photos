#!/usr/bin/env bash
set -euo pipefail

PROJECT_PATH="${PROJECT_PATH:-/opt/travel-photo-map}"
REPO_URL="${REPO_URL:-git@github.com:lhx948355904/Travel-photos.git}"
APP_USER="${SUDO_USER:-$USER}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run with sudo: sudo bash scripts/init-ubuntu.sh"
  exit 1
fi

echo "[init] updating apt packages"
apt update
apt install -y git ca-certificates curl gnupg ufw

echo "[init] installing Docker Engine from Docker's apt repository"
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

cat >/etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable --now docker
systemctl enable containerd

echo "[init] adding ${APP_USER} to docker group"
groupadd -f docker
usermod -aG docker "$APP_USER"

echo "[init] configuring UFW firewall"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

if [ ! -d "$PROJECT_PATH/.git" ]; then
  echo "[init] cloning repository into ${PROJECT_PATH}"
  mkdir -p "$(dirname "$PROJECT_PATH")"
  chown -R "$APP_USER:$APP_USER" "$(dirname "$PROJECT_PATH")"
  sudo -u "$APP_USER" git clone "$REPO_URL" "$PROJECT_PATH"
else
  echo "[init] repository already exists: ${PROJECT_PATH}"
fi

echo "[init] done"
echo "Next:"
echo "  1. Re-login SSH so docker group permissions take effect."
echo "  2. cd ${PROJECT_PATH}"
echo "  3. cp .env.example .env && nano .env"
echo "  4. bash scripts/deploy-server.sh"
