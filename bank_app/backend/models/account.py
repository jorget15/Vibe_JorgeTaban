''' models/account.py — ORM model for the `accounts` table.

    RELATIONSHIP TO USERS:
      Each Account belongs to exactly one User via the user_id foreign key.
      One User can own multiple Accounts (e.g. a checking and a savings).
      ForeignKey('users.user_id') tells SQLAlchemy (and MySQL) that user_id
      must reference a valid row in the users table.

    DECIMAL vs FLOAT for balance:
      DECIMAL(10, 2) stores exact numbers with up to 10 digits total and
      exactly 2 decimal places (e.g. 99999999.99). Float is an approximation —
      it can produce results like 10.0 + 0.1 = 10.099999999999... which is
      unacceptable for financial data. DECIMAL is always exact.

    ENUM for account_type:
      The ENUM column type is enforced at the database level. MySQL will reject
      any INSERT or UPDATE that tries to set account_type to a value other than
      'CHECKING' or 'SAVINGS', even if it bypasses the backend entirely.
      The backend also validates this before touching the DB for a cleaner error.
'''
from sqlalchemy import Column, Integer, DECIMAL, TIMESTAMP, ForeignKey, Enum
from sqlalchemy.sql import func
from db.database import Base

class Account(Base):
    __tablename__ = 'accounts'

    account_id   = Column(Integer, primary_key=True, autoincrement=True)
    user_id      = Column(Integer, ForeignKey('users.user_id'))             # links to users table
    balance      = Column(DECIMAL(10, 2), default=0)                        # exact decimal — never use Float for money
    account_type = Column(Enum('CHECKING', 'SAVINGS'), nullable=False)      # enforced at DB level
    created_at   = Column(TIMESTAMP, server_default=func.now())
