''' ORM model for the users table.
A User owns one or more Accounts. Each Account links back to a User via user_id.
Inherits from Base so SQLAlchemy knows to include this table in create_all(). '''
from sqlalchemy import Column, Integer, String, Boolean, TIMESTAMP
from sqlalchemy.sql import func
from db.database import Base

class User(Base):
    __tablename__ = 'users'

    user_id    = Column(Integer, primary_key=True, autoincrement=True)
    name       = Column(String(100))
    email      = Column(String(100), unique=True)
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(TIMESTAMP, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
