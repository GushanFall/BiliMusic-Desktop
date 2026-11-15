-- Local recovery metadata, deliberately excluded from personal cloud sync.
CREATE TABLE IF NOT EXISTS playlist_import_archives (
    playlist_id TEXT PRIMARY KEY,
    document TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
