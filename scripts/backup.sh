#!/bin/bash

# ============================================
# BHARATOS DATABASE BACKUP SCRIPT
# ============================================
# Production-grade backup strategy for multi-tenant SaaS
# Features:
# - Daily automated backups
# - Retention policy (30 days)
# - Compressed archives
# - Backup verification
# - Emergency restore capability

set -e  # Exit on any error

# Configuration
DB_HOST=${DB_HOST:-"localhost"}
DB_PORT=${DB_PORT:-"5432"}
DB_NAME=${DB_NAME:-"shahdolbazaar"}
DB_USER=${DB_USER:-"postgres"}
BACKUP_DIR="./backups"
RETENTION_DAYS=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Timestamp for backup file
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_backup_$TIMESTAMP.sql.gz"

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Function to create backup
create_backup() {
    log "Starting database backup: $DB_NAME"

    # Create compressed backup
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" | gzip > "$BACKUP_FILE"; then
        success "Backup created successfully: $BACKUP_FILE"
    else
        error "Backup failed!"
        exit 1
    fi
}

# Function to verify backup
verify_backup() {
    log "Verifying backup integrity..."

    # Check if file exists and has content
    if [[ ! -f "$BACKUP_FILE" ]]; then
        error "Backup file does not exist!"
        exit 1
    fi

    local file_size=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE" 2>/dev/null)
    if [[ $file_size -lt 1024 ]]; then
        warning "Backup file seems too small ($file_size bytes)"
    fi

    # Test gzip integrity
    if gzip -t "$BACKUP_FILE"; then
        success "Backup file integrity verified"
    else
        error "Backup file is corrupted!"
        exit 1
    fi
}

# Function to clean old backups
cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days..."

    local deleted_count=0
    local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y%m%d 2>/dev/null || date -v-"$RETENTION_DAYS"d +%Y%m%d 2>/dev/null)

    for backup_file in "$BACKUP_DIR"/*.sql.gz; do
        if [[ -f "$backup_file" ]]; then
            local file_date=$(basename "$backup_file" | sed 's/.*backup_\([0-9]\{8\}\).*/\1/')
            if [[ "$file_date" < "$cutoff_date" ]]; then
                rm -f "$backup_file"
                ((deleted_count++))
            fi
        fi
    done

    if [[ $deleted_count -gt 0 ]]; then
        success "Cleaned up $deleted_count old backup files"
    else
        log "No old backups to clean"
    fi
}

# Function to show backup info
show_backup_info() {
    log "Backup Information:"
    echo "  Database: $DB_NAME"
    echo "  Host: $DB_HOST:$DB_PORT"
    echo "  Backup file: $BACKUP_FILE"

    local file_size=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE" 2>/dev/null)
    echo "  Size: $file_size bytes"

    echo "  Recent backups:"
    ls -la "$BACKUP_DIR"/*.sql.gz 2>/dev/null | head -5 || echo "  No backups found"
}

# Function to restore backup
restore_backup() {
    local restore_file="$1"

    if [[ -z "$restore_file" ]]; then
        error "Please specify backup file to restore"
        echo "Usage: $0 restore <backup_file>"
        exit 1
    fi

    if [[ ! -f "$restore_file" ]]; then
        error "Backup file does not exist: $restore_file"
        exit 1
    fi

    warning "⚠️  This will REPLACE the current database!"
    read -p "Are you sure you want to restore from $restore_file? (yes/no): " confirm

    if [[ "$confirm" != "yes" ]]; then
        log "Restore cancelled"
        exit 0
    fi

    log "Restoring database from: $restore_file"

    # Terminate active connections first (be careful in production!)
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();
    " 2>/dev/null || true

    # Drop and recreate database
    dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" --if-exists "$DB_NAME" || true
    createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"

    # Restore from backup
    if gunzip -c "$restore_file" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"; then
        success "Database restored successfully from: $restore_file"
    else
        error "Database restore failed!"
        exit 1
    fi
}

# Main execution
case "${1:-backup}" in
    "backup")
        create_backup
        verify_backup
        cleanup_old_backups
        show_backup_info
        ;;
    "restore")
        restore_backup "$2"
        ;;
    "cleanup")
        cleanup_old_backups
        show_backup_info
        ;;
    "info")
        show_backup_info
        ;;
    *)
        echo "Usage: $0 [backup|restore|cleanup|info]"
        echo "  backup  - Create new backup (default)"
        echo "  restore <file> - Restore from backup file"
        echo "  cleanup - Remove old backups"
        echo "  info    - Show backup information"
        exit 1
        ;;
esac

success "Backup operation completed successfully!"