#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL zorunludur}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
mkdir -p "$BACKUP_DIR"
umask 077
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
target="$BACKUP_DIR/konnektora-$timestamp.dump"

pg_dump --format=custom --no-owner --no-acl --file="$target" "$DATABASE_URL"
sha256sum "$target" > "$target.sha256"
find "$BACKUP_DIR" -type f \( -name 'konnektora-*.dump' -o -name 'konnektora-*.dump.sha256' \) -mtime "+$RETENTION_DAYS" -delete
echo "$target"
