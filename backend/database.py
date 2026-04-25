"""
Database schema and connection management.
Supports local SQLite (dev) and Turso/libsql via DATABASE_URL (prod).
"""
import sqlite3
import os
import json
from urllib.parse import quote_plus

from sqlalchemy import create_engine

from config import DATABASE_URL, TURSO_AUTH_TOKEN


def _is_sqlite_url(url: str) -> bool:
    return url.startswith("sqlite://")


def _sqlite_path_from_url(url: str) -> str:
    # Supports sqlite:////abs/path and sqlite:///relative/path
    if url == "sqlite:///:memory:":
        return ":memory:"
    return url.replace("sqlite:///", "", 1)


def _build_database_url() -> str:
    url = DATABASE_URL

    # sqlalchemy-libsql expects sqlite+libsql://... dialect URLs.
    if url.startswith("libsql://"):
        url = "sqlite+libsql://" + url[len("libsql://"):]

    if url.startswith("sqlite+libsql://") and TURSO_AUTH_TOKEN and "authToken=" not in url and "auth_token=" not in url:
        separator = "&" if "?" in url else "?"
        token = quote_plus(TURSO_AUTH_TOKEN)
        return f"{url}{separator}authToken={token}"

    return url


_DB_URL = _build_database_url()
_IS_LOCAL_SQLITE = _is_sqlite_url(_DB_URL)
_SQLITE_PATH = _sqlite_path_from_url(_DB_URL) if _IS_LOCAL_SQLITE else None
_ENGINE = None if _IS_LOCAL_SQLITE else create_engine(_DB_URL, pool_pre_ping=True)


def get_db():
    """Get a database connection that works for SQLite and Turso/libsql."""
    if _IS_LOCAL_SQLITE:
        conn = sqlite3.connect(_SQLITE_PATH)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        return conn

    conn = _ENGINE.raw_connection()
    if hasattr(conn, "row_factory"):
        conn.row_factory = sqlite3.Row
    try:
        conn.execute("PRAGMA foreign_keys=ON")
    except Exception:
        pass
    return conn


def dict_row(row):
    """Convert DB row to dict, parsing JSON fields when present."""
    if row is None:
        return None

    if isinstance(row, dict):
        d = dict(row)
    elif isinstance(row, sqlite3.Row):
        d = dict(row)
    elif hasattr(row, "keys"):
        d = {key: row[key] for key in row.keys()}
    else:
        try:
            d = dict(row)
        except Exception:
            return row

    # Auto-parse known JSON columns
    for key in ("graph_data", "config", "metrics", "preprocessing_config"):
        if key in d and isinstance(d[key], str):
            try:
                d[key] = json.loads(d[key])
            except (json.JSONDecodeError, TypeError):
                pass
    return d


def init_db():
    """Create all tables if they don't exist."""
    conn = get_db()
    cursor = conn.cursor()

    statements = [
        """
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now'))
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            template TEXT DEFAULT 'custom',
            graph_data TEXT DEFAULT '{"nodes":[],"edges":[]}',
            preprocessing_config TEXT DEFAULT '{}',
            problem_type TEXT DEFAULT 'classification',
            input_type TEXT DEFAULT 'tabular',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS datasets (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            user_id TEXT NOT NULL REFERENCES users(id),
            file_name TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_size INTEGER DEFAULT 0,
            file_type TEXT DEFAULT 'csv',
            uploaded_at TEXT DEFAULT (datetime('now'))
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS training_jobs (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            user_id TEXT NOT NULL REFERENCES users(id),
            status TEXT DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed')),
            config TEXT DEFAULT '{}',
            metrics TEXT DEFAULT '[]',
            error_message TEXT,
            started_at TEXT,
            completed_at TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS models (
            id TEXT PRIMARY KEY,
            training_job_id TEXT REFERENCES training_jobs(id),
            project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            user_id TEXT NOT NULL REFERENCES users(id),
            model_path TEXT,
            accuracy REAL,
            loss REAL,
            file_size INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now'))
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS deployments (
            id TEXT PRIMARY KEY,
            model_id TEXT,
            user_id TEXT NOT NULL REFERENCES users(id),
            api_key TEXT UNIQUE NOT NULL,
            endpoint_url TEXT NOT NULL,
            is_active INTEGER DEFAULT 1,
            request_count INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now'))
        )
        """,
        "CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_datasets_project ON datasets(project_id)",
        "CREATE INDEX IF NOT EXISTS idx_training_project ON training_jobs(project_id)",
        "CREATE INDEX IF NOT EXISTS idx_deploy_apikey ON deployments(api_key)",
    ]

    for statement in statements:
        cursor.execute(statement)

    conn.commit()
    conn.close()
    backend = "SQLite" if _IS_LOCAL_SQLITE else "Turso/libsql"
    print(f"[OK] Database initialized ({backend})")


def migrate_db():
    """Add any missing columns to existing tables (safe to run on every startup)."""
    conn = get_db()
    cursor = conn.cursor()

    # Get existing columns in projects table
    existing = {row[1] for row in cursor.execute("PRAGMA table_info(projects)").fetchall()}

    migrations = [
        ("preprocessing_config", "TEXT DEFAULT '{}'"),
        ("problem_type",         "TEXT DEFAULT 'classification'"),
        ("input_type",           "TEXT DEFAULT 'tabular'"),
    ]

    for col_name, col_def in migrations:
        if col_name not in existing:
            cursor.execute(f"ALTER TABLE projects ADD COLUMN {col_name} {col_def}")
            print(f"[MIGRATE] Added column projects.{col_name}")

    conn.commit()
    conn.close()


# Auto-init and migrate on import
init_db()
migrate_db()
