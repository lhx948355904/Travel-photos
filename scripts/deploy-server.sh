#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v docker >/dev/null 2>&1; then
  echo "[deploy] Docker is not installed. Run scripts/init-ubuntu.sh first."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "[deploy] Docker Compose plugin is not available. Run scripts/init-ubuntu.sh first."
  exit 1
fi

if [ ! -f .env ]; then
  echo "[deploy] missing .env. Copy .env.example to .env and fill production values first."
  exit 1
fi

read_env_value() {
  local key="$1"
  local default_value="$2"
  local value
  value="$(grep -E "^${key}=" .env | tail -n 1 | cut -d '=' -f 2- | tr -d '\r' || true)"
  if [ -n "$value" ]; then
    printf '%s' "$value"
  else
    printf '%s' "$default_value"
  fi
}

DB_USER_VALUE="$(read_env_value DB_USER photomap)"

echo "[deploy] pulling latest code"
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "[deploy] server working tree has local changes; commit or stash them first"
  git status --short
  exit 1
fi

pull_latest_code() {
  local max_attempts=3
  local attempt=1

  while [ "$attempt" -le "$max_attempts" ]; do
    echo "[deploy] git pull attempt ${attempt}/${max_attempts}"
    if timeout 90s git -c http.lowSpeedLimit=1000 -c http.lowSpeedTime=20 pull --ff-only; then
      return 0
    fi

    echo "[deploy] git pull failed; retrying in 5 seconds"
    attempt=$((attempt + 1))
    sleep 5
  done

  echo "[deploy] git pull failed after ${max_attempts} attempts."
  echo "[deploy] Check GitHub connectivity, or push through a mirror/deploy from a reachable network."
  return 1
}

pull_latest_code

mkdir -p backups
if docker compose ps --status running db 2>/dev/null | grep -q photomap-db; then
  backup_file="backups/photomap-$(date +%Y%m%d-%H%M%S).sql.gz"
  echo "[deploy] backing up database to ${backup_file}"
  docker compose exec -T db pg_dump -U "$DB_USER_VALUE" photomap | gzip > "$backup_file" || {
    echo "[deploy] database backup failed"
    exit 1
  }
else
  echo "[deploy] database is not running yet; skipping backup"
fi

echo "[deploy] rebuilding and restarting containers"
docker compose up -d --build --remove-orphans

echo "[deploy] pruning unused images"
docker image prune -f

echo "[deploy] current containers"
docker compose ps
