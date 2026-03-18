"""Database setup - SQLite for deployment with persistent volume."""

import os
import sqlite3
from contextlib import contextmanager

DB_PATH = os.environ.get("DATABASE_PATH", "/tmp/gfi-data/gfi.db")


def get_db_path():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    return DB_PATH


@contextmanager
def get_db():
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    """Initialize all database tables."""
    with get_db() as conn:
        conn.executescript("""
            -- Socle 0: Reference data
            CREATE TABLE IF NOT EXISTS entities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                nif TEXT,
                rc TEXT,
                nis TEXT,
                address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                entity_id INTEGER REFERENCES entities(id),
                description TEXT,
                status TEXT DEFAULT 'ACTIF',
                budget REAL DEFAULT 0,
                surface REAL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS associates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                nif TEXT,
                email TEXT,
                phone TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS associate_shares (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                associate_id INTEGER REFERENCES associates(id),
                project_id INTEGER REFERENCES projects(id),
                share_percentage REAL NOT NULL DEFAULT 0,
                capital_amount REAL DEFAULT 0,
                current_account_balance REAL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(associate_id, project_id)
            );

            -- C6: Document archive
            CREATE TABLE IF NOT EXISTS documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                uuid TEXT UNIQUE NOT NULL,
                original_filename TEXT NOT NULL,
                canonical_filename TEXT,
                mime_type TEXT,
                file_size INTEGER,
                entity_code TEXT,
                project_code TEXT,
                doc_type TEXT,
                doc_subtype TEXT,
                doc_date TEXT,
                period_year INTEGER,
                period_month INTEGER,
                amount_ht REAL,
                amount_tva REAL,
                amount_ttc REAL,
                counterparty_name TEXT,
                counterparty_nif TEXT,
                invoice_number TEXT,
                sha256_hash TEXT,
                storage_path TEXT,
                ocr_text TEXT,
                confidence_score REAL DEFAULT 0,
                processing_status TEXT DEFAULT 'PENDING',
                classification_method TEXT,
                classification_details TEXT,
                duplicate_of TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                processed_at TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_documents_hash ON documents(sha256_hash);
            CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(entity_code);
            CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project_code);
            CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(processing_status);
            CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(doc_type);

            -- C5: Deduplication log
            CREATE TABLE IF NOT EXISTS dedup_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_uuid TEXT,
                duplicate_uuid TEXT,
                dedup_level TEXT,
                similarity_score REAL,
                action_taken TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- C7: Accounting entries
            CREATE TABLE IF NOT EXISTS accounting_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_uuid TEXT REFERENCES documents(uuid),
                entry_date TEXT,
                journal TEXT,
                account_debit TEXT,
                account_credit TEXT,
                label TEXT,
                amount REAL,
                entity_code TEXT,
                project_code TEXT,
                confidence_score REAL DEFAULT 0,
                status TEXT DEFAULT 'PROPOSED',
                validated_by TEXT,
                validated_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Pipeline processing log
            CREATE TABLE IF NOT EXISTS ingestion_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_uuid TEXT,
                layer TEXT,
                status TEXT,
                message TEXT,
                duration_ms INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Insert default entities if not exists
            INSERT OR IGNORE INTO entities (code, name) VALUES
                ('DENDANI-PROM', 'Dendani Promotion Immobiliere'),
                ('ELITE-IMM', 'Elite Immobiliere'),
                ('SINEMMAR', 'Sinemmar SARL'),
                ('DENDANI-CONST', 'Dendani Construction'),
                ('DENDANI-INVEST', 'Dendani Investissement'),
                ('DENDANI-HOLDING', 'Dendani Holding');

            -- Insert default projects if not exists
            INSERT OR IGNORE INTO projects (code, name, entity_id) VALUES
                ('IRENE', 'Projet IRENE', 1),
                ('ASTERIA', 'Projet ASTERIA', 2),
                ('SINEMMAR-IND', 'Projet SINEMMAR Industriel', 3),
                ('RESIDENCE-A', 'Residence A', 1),
                ('RESIDENCE-B', 'Residence B', 1),
                ('COMMERCIAL-1', 'Centre Commercial 1', 2);
        """)
