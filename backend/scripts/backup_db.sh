#!/usr/bin/env bash
#
# backup_db.sh — take a consistent snapshot of the SQLite note_tracker.db and
# prune old snapshots. Safe to run while the app is running (uses sqlite3's
# online .backup, not a raw file copy).
#
# Run manually:   ./scripts/backup_db.sh
# Scheduled:      loaded as a launchd LaunchAgent (see com.notetracker.backup.plist)
#
set -euo pipefail

# Resolve the backend dir from this script's location, so it works from anywhere.
BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB="$BACKEND_DIR/note_tracker.db"
BACKUP_DIR="$BACKEND_DIR/backups"
RETENTION_DAYS=14   # delete snapshots older than this many days

mkdir -p "$BACKUP_DIR"

if [[ ! -f "$DB" ]]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') ERROR: database not found at $DB" >&2
  exit 1
fi

TS="$(date '+%Y%m%d-%H%M%S')"
DEST="$BACKUP_DIR/note_tracker.$TS.db"

# Consistent online backup (handles WAL/locks correctly).
sqlite3 "$DB" ".backup '$DEST'"

# Verify the snapshot before trusting it; drop it if corrupt.
if [[ "$(sqlite3 "$DEST" 'PRAGMA integrity_check;')" != "ok" ]]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') ERROR: integrity check failed for $DEST" >&2
  rm -f "$DEST"
  exit 1
fi

echo "$(date '+%Y-%m-%d %H:%M:%S') OK: wrote $DEST ($(du -h "$DEST" | cut -f1))"

# Prune snapshots older than RETENTION_DAYS.
find "$BACKUP_DIR" -name 'note_tracker.*.db' -type f -mtime +"$RETENTION_DAYS" -print -delete \
  | sed "s/^/$(date '+%Y-%m-%d %H:%M:%S') pruned: /"
