import os
import hashlib
import logging
from sqlalchemy import text
from database.core.connection import engine

logger = logging.getLogger(__name__)

MIGRATIONS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "migrations")

_TRACKING_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS _applied_migrations (
    filename VARCHAR(255) PRIMARY KEY,
    content_hash VARCHAR(64),
    applied_at TIMESTAMP DEFAULT NOW()
);
"""

_ENSURE_HASH_COLUMN = """
ALTER TABLE _applied_migrations
    ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64);
"""


def _file_hash(filepath: str) -> str:
    with open(filepath, "r") as f:
        return hashlib.sha256(f.read().encode()).hexdigest()


def run_sql_migrations():
    """Execute all .sql files from database/migrations/ in alphabetical order.

    Each file is tracked by filename + content hash.
    If a file's content changes, it is re-executed (use IF NOT EXISTS / IF EXISTS).
    """
    if not os.path.isdir(MIGRATIONS_DIR):
        logger.info("No migrations directory found, skipping.")
        return

    sql_files = sorted(f for f in os.listdir(MIGRATIONS_DIR) if f.endswith(".sql"))
    if not sql_files:
        logger.info("No SQL migration files found.")
        return

    try:
        with engine.connect() as conn:
            conn.execute(text(_TRACKING_TABLE_SQL))
            conn.execute(text(_ENSURE_HASH_COLUMN))
            conn.commit()

            for filename in sql_files:
                filepath = os.path.join(MIGRATIONS_DIR, filename)
                current_hash = _file_hash(filepath)

                row = conn.execute(
                    text("SELECT content_hash FROM _applied_migrations WHERE filename = :f"),
                    {"f": filename},
                ).fetchone()

                if row and row[0] == current_hash:
                    continue

                logger.info(f"Applying migration: {filename}")

                with open(filepath, "r", encoding="utf-8") as f:
                    sql_content = f.read().strip()

                if sql_content:
                    try:
                        conn.execute(text(sql_content))
                        if row:
                            conn.execute(
                                text("UPDATE _applied_migrations SET content_hash = :h, applied_at = NOW() WHERE filename = :f"),
                                {"h": current_hash, "f": filename},
                            )
                        else:
                            conn.execute(
                                text("INSERT INTO _applied_migrations (filename, content_hash) VALUES (:f, :h)"),
                                {"f": filename, "h": current_hash},
                            )
                        conn.commit()
                        logger.info(f"Migration applied successfully: {filename}")
                    except Exception as stmt_err:
                        conn.rollback()
                        logger.warning(f"Migration {filename} had an error and was safely rolled back: {stmt_err}")
    except Exception as db_err:
        logger.warning(f"Could not connect or run SQL migrations (non-fatal): {db_err}")

