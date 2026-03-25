''' Manages the SQLAlchemy engine, session factory, and ORM base class.

 WHY SQLALCHEMY?
 SQLAlchemy uses an ORM — you interact with Python objects

'''
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

DATABASE_URL = "mysql+pymysql://root:root@localhost:3306/bank_db"

engine = create_engine(DATABASE_URL) # The connection to the database. Created once at startup.
SessionLocal = sessionmaker(bind=engine) #  Produces new Session objects on demand. Each request gets and closes its own session.

class Base(DeclarativeBase): # base class for all ORM models to inherit from. SQLAlchemy uses this to find tables.
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
