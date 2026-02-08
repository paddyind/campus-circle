# Database backup directory

This directory is used for:

- **Backups**: Schema and/or data dumps created by `python infra/scripts/db.py backup` (e.g. `backup_YYYYMMDD_HHMMSS.sql`).
- **Initial or demo data**: Optional SQL files you can use to seed or restore a known state (e.g. after a reset or for demos).

Backups are created here by default. Restore with:

```bash
python infra/scripts/db.py restore database/backup/backup_YYYYMMDD_HHMMSS.sql
```

You can also place custom seed or demo SQL files here and run them manually or via restore.
