''' ORM model for the transactions table.
Every time money moves in or out of an Account, a Transaction record is created. '''
from sqlalchemy import Column, Integer, String, DECIMAL, TIMESTAMP, ForeignKey
from sqlalchemy.sql import func
from db.database import Base

class Transaction(Base):
    __tablename__ = 'transactions'

    txn_id      = Column(Integer, primary_key=True, autoincrement=True)
    account_id  = Column(Integer, ForeignKey('accounts.account_id'))
    txn_type    = Column(String(20))   # 'DEPOSIT', 'WITHDRAW', 'TRANSFER_OUT', 'TRANSFER_IN'
    amount      = Column(DECIMAL(10, 2))
    description = Column(String(100), nullable=True)
    created_at  = Column(TIMESTAMP, server_default=func.now())
