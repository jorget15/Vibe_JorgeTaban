''' ORM model for the accounts table.
Each Account belongs to one User and can be either 'checking' or 'savings'.
Deposits and withdrawals are recorded as Transactions linked to this Account. '''
from sqlalchemy import Column, Integer, String, DECIMAL, TIMESTAMP, ForeignKey
from sqlalchemy.sql import func
from db.database import Base

class Account(Base):
    __tablename__ = 'accounts'

    account_id   = Column(Integer, primary_key=True, autoincrement=True)
    user_id      = Column(Integer, ForeignKey('users.user_id'))
    balance      = Column(DECIMAL(10, 2), default=0)
    account_type = Column(String(50))
    created_at   = Column(TIMESTAMP, server_default=func.now())
