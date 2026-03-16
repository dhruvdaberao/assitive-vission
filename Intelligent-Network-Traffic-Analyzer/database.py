import sqlite3
import threading
import os

DB_PATH = 'traffic.db'
db_lock = threading.Lock()

def init_db():
    """Initializes the SQLite database & tables if they don't exist."""
    with db_lock:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Packets table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS packets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                src_ip TEXT,
                dst_ip TEXT,
                src_port INTEGER,
                dst_port INTEGER,
                protocol TEXT,
                length INTEGER,
                summary TEXT
            )
        ''')
        
        # Alerts table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                alert_type TEXT,
                src_ip TEXT,
                description TEXT
            )
        ''')
        
        # Stats table (simple key-value for bandwidth tracking)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS stats (
                key TEXT PRIMARY KEY,
                value INTEGER
            )
        ''')
        
        conn.commit()
        conn.close()

def insert_packet(src_ip, dst_ip, src_port, dst_port, protocol, length, summary):
    """Inserts a captured packet log into the database."""
    with db_lock:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO packets (src_ip, dst_ip, src_port, dst_port, protocol, length, summary)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (src_ip, dst_ip, src_port, dst_port, protocol, length, summary))
        conn.commit()
        conn.close()

def insert_alert(alert_type, src_ip, description):
    """Inserts a security alert into the database."""
    with db_lock:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO alerts (alert_type, src_ip, description)
            VALUES (?, ?, ?)
        ''', (alert_type, src_ip, description))
        conn.commit()
        conn.close()

def execute_query(query, params=(), fetchall=True):
    """Utility to run a read query against the database thread-safely."""
    with db_lock:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(query, params)
        if fetchall:
            result = cursor.fetchall()
        else:
            result = cursor.fetchone()
        conn.close()
        return [dict(row) for row in result] if result else []
