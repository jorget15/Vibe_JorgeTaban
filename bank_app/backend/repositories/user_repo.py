# Data access for the users table using SQLAlchemy ORM.
# Repositories are the only layer that talks to the DB — no SQL lives anywhere else.
# All methods receive a session from the service layer so multiple repo calls
# can share one transaction and be committed or rolled back together.
from datetime import datetime, timezone
from models.user import User

class UserRepo:
    def get_user_by_email(self, session, email):
        # Look up a user by email. Used to avoid creating duplicate users.
        # Returns a User object, or None if not found.
        return session.query(User).filter_by(email=email).first()

    def get_user_by_id(self, session, user_id):
        # Look up a user by their primary key.
        # Returns a User object, or None if not found.
        return session.query(User).filter_by(user_id=user_id).first()

    def get_all_users(self, session):
        # Return all user rows including soft-deleted ones.
        # Admin-only — callers decide what to expose.
        return session.query(User).all()

    def soft_delete(self, session, user_id):
        # Mark a user as deleted without removing the row.
        # Real name/email stay in the DB for audit purposes.
        # Returns the User object, or None if not found.
        user = session.query(User).filter_by(user_id=user_id).first()
        if not user:
            return None
        user.is_deleted = True
        user.deleted_at = datetime.now(timezone.utc)
        return user

    def add_user(self, session, name, email, password_hash=None):
        # Insert a new user row and return the User object with the generated user_id.
        # session.flush() assigns the ID without committing.
        user = User(name=name, email=email, password_hash=password_hash)
        session.add(user)
        session.flush()
        return user
