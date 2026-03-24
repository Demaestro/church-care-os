#!/bin/sh
set -eu

if [ -n "${CARE_DB_PATH:-}" ]; then
  DB_PATH="$CARE_DB_PATH"
elif [ -n "${RAILWAY_VOLUME_MOUNT_PATH:-}" ]; then
  DB_PATH="$RAILWAY_VOLUME_MOUNT_PATH/care.db"
else
  DB_PATH="/app/data/care.db"
fi

DB_DIR="$(dirname "$DB_PATH")"

mkdir -p "$DB_DIR"

exec node server.js
