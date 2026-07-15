#!/usr/bin/env bash
set -euo pipefail

domain="${1:-lhxjourney.cn}"
project_path="${2:-/opt/travel-photo-map}"
cert_dir="${project_path}/nginx/certs"
certificate="${cert_dir}/${domain}_bundle.crt"
private_key="${cert_dir}/${domain}.key"

log() {
  printf '[https] %s\n' "$1"
}

fail() {
  printf '[https] ERROR: %s\n' "$1" >&2
  exit 1
}

command -v docker >/dev/null 2>&1 || fail "Docker is not installed"
docker compose version >/dev/null 2>&1 || fail "Docker Compose plugin is not available"
command -v openssl >/dev/null 2>&1 || fail "OpenSSL is not installed"

[ -d "$project_path" ] || fail "Project directory does not exist: ${project_path}"
[ -s "$certificate" ] || fail "Certificate does not exist or is empty: ${certificate}"
[ -s "$private_key" ] || fail "Private key does not exist or is empty: ${private_key}"

log "checking certificate validity and domain"
openssl x509 -in "$certificate" -noout -checkend 86400 >/dev/null \
  || fail "Certificate is expired or expires within 24 hours"
openssl x509 -in "$certificate" -noout -checkhost "$domain" >/dev/null \
  || fail "Certificate does not cover ${domain}"

certificate_public_key="$({
  openssl x509 -in "$certificate" -pubkey -noout \
    | openssl pkey -pubin -outform DER 2>/dev/null \
    | sha256sum
} | awk '{print $1}')"

private_key_public_key="$({
  openssl pkey -in "$private_key" -pubout -outform DER 2>/dev/null \
    | sha256sum
} | awk '{print $1}')"

[ -n "$certificate_public_key" ] || fail "Could not read the certificate public key"
[ "$certificate_public_key" = "$private_key_public_key" ] \
  || fail "Certificate and private key do not match"

chmod 700 "$cert_dir"
chmod 644 "$certificate"
chmod 600 "$private_key"

if command -v ufw >/dev/null 2>&1 && ufw status | grep -q '^Status: active'; then
  log "allowing TCP port 443 in UFW"
  if [ "$(id -u)" -eq 0 ]; then
    ufw allow 443/tcp >/dev/null
  elif sudo -n true 2>/dev/null; then
    sudo ufw allow 443/tcp >/dev/null
  else
    fail "UFW is active, but this user cannot run sudo non-interactively to open port 443"
  fi
else
  log "UFW is not active; skipping the operating-system firewall rule"
fi

cd "$project_path"

grep -q '"443:443"' docker-compose.yml \
  || fail "docker-compose.yml does not expose port 443; push the HTTPS code changes first"
grep -q 'listen 443 ssl' nginx/default.conf \
  || fail "nginx/default.conf does not contain the HTTPS server; push the HTTPS code changes first"

log "building and recreating the frontend container"
docker compose up -d --build frontend

log "checking the active Nginx configuration"
docker compose exec -T frontend nginx -t

log "checking the local HTTPS response"
curl --noproxy '*' --fail --silent --show-error --head \
  --resolve "${domain}:443:127.0.0.1" \
  "https://${domain}/" >/dev/null

log "HTTPS is active for https://${domain}"
