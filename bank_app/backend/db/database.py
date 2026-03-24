# Manages the SQLAlchemy engine, session factory, and ORM base class.
#
# WHY SQLALCHEMY?
# SQLAlchemy replaces raw sqlite3 with an ORM — you interact with Python objects
# instead of writing SQL strings. Switching databases (e.g. SQLite → MySQL) only
# requires changing DATABASE_URL; nothing else in the codebase needs to change.
#
# KEY CONCEPTS:
# - engine:       The connection to the database. Created once at startup.
# - SessionLocal: A factory that produces new Session objects on demand.
#                 Each request gets its own session, then closes it when done.
# - Base:         The base class all ORM models inherit from. SQLAlchemy uses it
#                 to discover which tables to create via Base.metadata.create_all().
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

DATABASE_URL = "mysql+pymysql://root:root@localhost:3306/bank_db"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

class Base(DeclarativeBase):
    pass

def get_db():
    # Open and return a new database session.
    # The caller is responsible for calling session.close() when done.
    return SessionLocal()

def init_db():
    # Import all models so their table definitions are registered on Base.metadata,
    # then create any missing tables. Safe to call on every startup —
    from models.user import User
    from models.account import Account
    from models.transaction import Transaction
    Base.metadata.create_all(engine) # 'CREATE TABLE IF NOT EXISTS' is used internally.
