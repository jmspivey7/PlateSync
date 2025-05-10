# Database Backups

This directory contains PostgreSQL database backups for the PlateSync application.

## Naming Convention

Backups follow the naming convention: `platesync_backup_YYYYMMDD_HHMMSS.sql`

For example: `platesync_backup_20250510_193124.sql` was created on May 10th, 2025 at 19:31:24.

## Restoring from Backup

To restore the database from a backup file, use the following command:

```bash
# Replace these with your actual database credentials
PGPASSWORD=your_password pg_restore -h hostname -p port -U username -d database_name -c -f backup_file.sql
```

Or for a plain SQL backup:

```bash
PGPASSWORD=your_password psql -h hostname -p port -U username -d database_name < backup_file.sql
```

## Important Notes

1. Database backups contain all application data including:
   - User accounts
   - Members
   - Donations and batches
   - Service options
   - Church settings
   - Planning Center integration data

2. Restoring a backup will overwrite all existing data in the target database.

3. Always create a new backup before making significant changes to the application or database schema.

4. Store these backups in a secure location as they may contain sensitive information.