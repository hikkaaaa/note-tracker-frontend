#!/usr/bin/env bash
#
# backup_pg.sh — daily logical backup of the production PostgreSQL database.
#
# Streams a gzip-compressed pg_dump into backend/backups/ and prunes old snapshots.
# Fully path-relative (resolves its own location) and OS-agnostic — drive it from cron
# or a systemd timer on Linux (see scripts/crontab.example and scripts/systemd/).
#
# Requires: pg_dump (the `postgresql-client` package) and DATABASE_URL in the environment.
#
#   DATABASE_URL='postgresql://user:pass@host:5432/note_tracker' ./scripts/backup_pg.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$BACKEND_DIR/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "$(date '+%F %T') ERROR: DATABASE_URL is not set" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
TS="$(date '+%Y%m%d-%H%M%S')"
DEST="$BACKUP_DIR/note_tracker.pg.$TS.sql.gz"

# pg_dump accepts the connection URL directly; pipe through gzip for a compact dump.
pg_dump "$DATABASE_URL" | gzip > "$DEST"

# A valid gzip'd dump is never empty; drop and fail if it is.
if [[ ! -s "$DEST" ]]; then
  echo "$(date '+%F %T') ERROR: produced an empty dump, removing $DEST" >&2
  rm -f "$DEST"
  exit 1
fi

echo "$(date '+%F %T') OK: wrote $DEST ($(du -h "$DEST" | cut -f1))"

# Prune snapshots older than the retention window.
find "$BACKUP_DIR" -name 'note_tracker.pg.*.sql.gz' -type f -mtime +"$RETENTION_DAYS" -print -delete \
  | sed "s/^/$(date '+%F %T') pruned: /"
