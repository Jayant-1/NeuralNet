"""
SQLite Database — Schema and connection management.
Easily swap to PostgreSQL by changing the connection logic.
"""
import sqlite3
import os
import json
from datetime import datetime, timezone

DB_PATH = os.path.join(os.path.dirname(__file__), "layerlab.db")


def get_db():
    """Get a database connection with row_factory enabled."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def dict_row(row):
    """Convert sqlite3.Row to dict, parsing JSON fields."""
    if row is None:
        return None
    d = dict(row)
    # Auto-parse known JSON columns
    for key in ("graph_data", "config", "metrics"):
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

    cursor.executescript("""
        -- Users
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now'))
        );

        -- Projects
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            template TEXT DEFAULT 'custom',
            graph_data TEXT DEFAULT '{"nodes":[],"edges":[]}',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        -- Datasets
        CREATE TABLE IF NOT EXISTS datasets (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            user_id TEXT NOT NULL REFERENCES users(id),
            file_name TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_size INTEGER DEFAULT 0,
            file_type TEXT DEFAULT 'csv',
            uploaded_at TEXT DEFAULT (datetime('now'))
        );

        -- Training Jobs
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
        );

        -- Trained Models
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
        );

        -- Deployments
        CREATE TABLE IF NOT EXISTS deployments (
            id TEXT PRIMARY KEY,
            model_id TEXT,
            user_id TEXT NOT NULL REFERENCES users(id),
            api_key TEXT UNIQUE NOT NULL,
            endpoint_url TEXT NOT NULL,
            is_active INTEGER DEFAULT 1,
            request_count INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now'))
        );

        -- Indexes
        CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
        CREATE INDEX IF NOT EXISTS idx_datasets_project ON datasets(project_id);
        CREATE INDEX IF NOT EXISTS idx_training_project ON training_jobs(project_id);
        CREATE INDEX IF NOT EXISTS idx_deploy_apikey ON deployments(api_key);
    """)

    conn.commit()
    conn.close()
    print("[OK] Database initialized")


# Auto-init on import
init_db()
