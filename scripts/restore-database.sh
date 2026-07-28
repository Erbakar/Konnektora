#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL zorunludur}"
: "${BACKUP_FILE:?BACKUP_FILE zorunludur}"
if [[ "${CONFIRM_RESTORE:-}" != "RESTORE" ]]; then
  echo "Geri yükleme iptal edildi. Devam etmek için CONFIRM_RESTORE=RESTORE ayarlayın." >&2
  exit 1
fi
if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Backup dosyası bulunamadı: $BACKUP_FILE" >&2
  exit 1
fi
if [[ -f "$BACKUP_FILE.sha256" ]]; then
  sha256sum --check "$BACKUP_FILE.sha256"
fi

pg_restore --clean --if-exists --no-owner --no-acl --dbname="$DATABASE_URL" "$BACKUP_FILE"
npm run db:deploy
