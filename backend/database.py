"""
Database schema and connection management.
Supports local SQLite (dev) and Turso/libsql via DATABASE_URL (prod).
"""
import sqlite3
import os
import json
from urllib.parse import quote_plus

from config import DATABASE_URL, TURSO_AUTH_TOKEN


def _is_sqlite_url(url: str) -> bool:
    return url.startswith("sqlite://")


def _sqlite_path_from_url(url: str) -> str:
    if url == "sqlite:///:memory:":
        return ":memory:"
    return url.replace("sqlite:///", "", 1)


def _normalize_turso_url(url: str) -> str:
    """Return a libsql_client-compatible Turso URL."""
    if url.startswith("sqlite+libsql://"):
        url = "libsql://" + url[len("sqlite+libsql://"):]

    if url.startswith("libsql://") and TURSO_AUTH_TOKEN and "authToken=" not in url and "auth_token=" not in url:
        separator = "&" if "?" in url else "?"
        token = quote_plus(TURSO_AUTH_TOKEN)
        return f"{url}{separator}authToken={token}"

    return url


def _build_database_url() -> str:
    return _normalize_turso_url(DATABASE_URL)


_DB_URL = _build_database_url()
_IS_LOCAL_SQLITE = _is_sqlite_url(_DB_URL)
_SQLITE_PATH = _sqlite_path_from_url(_DB_URL) if _IS_LOCAL_SQLITE else None
_IS_TURSO = _DB_URL.startswith("libsql://") or DATABASE_URL.startswith("sqlite+libsql://") or DATABASE_URL.startswith("libsql://")
_TURSO_CLIENT = None


def _get_turso_client():
    """Get or create libsql_client connection to Turso."""
    global _TURSO_CLIENT
    if _TURSO_CLIENT is None:
        try:
            import libsql_client
            url = _normalize_turso_url(DATABASE_URL)
            _TURSO_CLIENT = libsql_client.create_client(url, auth_token=TURSO_AUTH_TOKEN)
            print(f"[DB] Connected to Turso via libsql_client")
        except ImportError as e:
            raise RuntimeError(f"libsql_client not installed: {e}")
        except Exception as e:
            raise RuntimeError(f"Turso connection failed: {e}")
    return _TURSO_CLIENT


def get_db():
    """Get a database connection for SQLite (local) or Turso (production)."""
    if _IS_LOCAL_SQLITE:
        conn = sqlite3.connect(_SQLITE_PATH)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        return conn

    if _IS_TURSO:
        try:
            client = _get_turso_client()
            return client
        except Exception as exc:
            raise RuntimeError(f"Failed to get Turso connection: {str(exc)}") from exc

    raise RuntimeError(f"Unknown database URL format: {DATABASE_URL}")


def _is_turso_connection(conn) -> bool:
    return _IS_TURSO and not isinstance(conn, sqlite3.Connection)


async def db_execute(conn, sql: str, params=()):
    if _is_turso_connection(conn):
        return await conn.execute(sql, params)
    return conn.execute(sql, params)


async def db_fetchone(conn, sql: str, params=()):
    result = await db_execute(conn, sql, params)
    if _is_turso_connection(conn):
        rows = getattr(result, "rows", []) or []
        return rows[0] if rows else None
    return result.fetchone()


async def db_fetchall(conn, sql: str, params=()):
    result = await db_execute(conn, sql, params)
    if _is_turso_connection(conn):
        return list(getattr(result, "rows", []) or [])
    return result.fetchall()


async def db_commit(conn):
    if _is_turso_connection(conn):
        return None
    return conn.commit()


async def db_close(conn):
    if _is_turso_connection(conn):
        close_fn = getattr(conn, "close", None)
        if close_fn is None:
            return None
        result = close_fn()
        if hasattr(result, "__await__"):
            return await result
        return result
    return conn.close()


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


async def _init_db_turso():
    """Create all tables for Turso using async libsql client."""
    conn = get_db()
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
        await conn.execute(statement)

    close_fn = getattr(conn, "close", None)
    if close_fn is not None:
        result = close_fn()
        if hasattr(result, "__await__"):
            await result


def init_db():
    """Create all tables if they don't exist."""
    if _IS_TURSO:
        raise RuntimeError("Use initialize_database() for Turso")
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


async def _migrate_db_turso():
    """No-op for Turso; schema is created during init and migration is handled elsewhere."""
    return None


def migrate_db():
    """Add any missing columns to existing tables (safe to run on every startup)."""
    if _IS_TURSO:
        raise RuntimeError("Use initialize_database() for Turso")
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


async def initialize_database():
    """Initialize schema and migrations for the active database backend."""
    if _IS_LOCAL_SQLITE:
        init_db()
        migrate_db()
        return

    await _init_db_turso()
    await _migrate_db_turso()


# Auto-init and migrate on import (best-effort so app can still start and expose logs/health)
print(f"[DB] Using {('SQLite' if _IS_LOCAL_SQLITE else 'Turso/libsql')} backend")
if not _IS_LOCAL_SQLITE:
    print(f"[DB] Connection URL: {_DB_URL[:60]}..." if len(_DB_URL) > 60 else f"[DB] Connection URL: {_DB_URL}")

try:
    if _IS_LOCAL_SQLITE:
        init_db()
        migrate_db()
    else:
        print("[DB] Turso schema initialization deferred to startup")
except Exception as exc:
    print(f"[WARN] Database init deferred to first request: {type(exc).__name__}: {str(exc)[:80]}")
