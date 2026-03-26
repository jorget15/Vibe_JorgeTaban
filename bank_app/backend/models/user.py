''' models/user.py — ORM model for the `users` table.

    WHAT IS AN ORM MODEL?
      ORM stands for Object-Relational Mapper. Instead of writing raw SQL like
      "SELECT * FROM users WHERE email = ?", SQLAlchemy lets you work with
      Python objects. Each class here maps to one database table, and each
      Column maps to one column in that table.

    HOW DOES SQLAlchemy KNOW THIS IS A TABLE?
      The class inherits from Base (defined in db/database.py). When the app
      starts, create_all() looks at every class that inherits from Base and
      creates the table if it doesn't exist yet. It will NOT alter a table
      that already exists — schema changes require ALTER TABLE.

    SOFT DELETE COLUMNS (is_deleted, deleted_at):
      Instead of running DELETE FROM users, we flip is_deleted to True and
      record when it happened. The row stays in the database forever so that
      all financial history linked to this user remains valid and auditable.
'''
from sqlalchemy import Column, Integer, String, Boolean, TIMESTAMP
from sqlalchemy.sql import func
from db.database import Base

class User(Base):
    __tablename__ = 'users'

    user_id       = Column(Integer, primary_key=True, autoincrement=True)
    name          = Column(String(100))
    email         = Column(String(100), unique=True)   # enforced at DB level — duplicate emails cause IntegrityError

    # nullable=True allows users created via Postman (before the password system) to coexist.
    # A NULL password_hash means the user cannot log in through the frontend.
    password_hash = Column(String(255), nullable=True)

    is_admin   = Column(Boolean, default=False, nullable=False)  # controls access to /admin
    is_deleted = Column(Boolean, default=False, nullable=False)  # soft-delete flag
    deleted_at = Column(TIMESTAMP, nullable=True)                # set when is_deleted flips to True
    created_at = Column(TIMESTAMP, server_default=func.now())    # set automatically by the database on INSERT
