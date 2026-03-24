# Manages the SQLite database connection and initializes tables on first run.
#
# WHY SQLITE?
# SQLite is a database engine that stores everything in a single file (bank.db).
# Unlike MySQL or PostgreSQL, it requires no separate server process to install,
# configure, or run — Python's standard library includes the 'sqlite3' module,
# so no extra packages are needed either. This makes it ideal for learning
# projects and small apps. The trade-off is that it doesn't support multiple
# concurrent writers, so it wouldn't be the right choice for a high-traffic
# production app — but for this project it's perfect.
import sqlite3
import os

# Absolute path to the database file — ensures it's always found regardless of
# which directory you run the app from.
DB_PATH = os.path.join(os.path.dirname(__file__), 'bank.db')

def get_db():
    # Open and return a new database connection.
    # row_factory = sqlite3.Row means columns can be accessed by name (e.g. row['email'])
    # instead of by index (e.g. row[2]), which makes the code much easier to read.
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    # Create all tables if they don't already exist.
    # Called once when the Flask app starts up (see __init__.py).
    # 'CREATE TABLE IF NOT EXISTS' means this is safe to run on every startup —
    # it won't overwrite existing data.
    conn = get_db()
    cursor = conn.cursor()
    cursor.executescript('''
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name varchar(100),
            email varchar(100) UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS accounts (
            account_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            balance DECIMAL(10,2) DEFAULT 0,
            account_type varchar(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        );
        CREATE TABLE IF NOT EXISTS transactions (
            txn_id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_id INTEGER,
            txn_type varchar(20),
            amount DECIMAL(10,2),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (account_id) REFERENCES accounts(account_id)
        );
    ''')
    conn.commit()
    conn.close()
