# Data access for the users table.
# Repositories are the only layer that writes SQL — nothing else touches the DB directly.
# All methods receive a 'conn' (connection) from the service layer so multiple
# repository calls can share one transaction and be committed/rolled back together.
from models.user import User

class UserRepository:
    def find_by_email(self, conn, email):
        # Look up a user by email. Used to avoid creating duplicate users.
        # Returns a User object, or None if not found.
        cur = conn.cursor()
        cur.execute(
            "SELECT user_id, name, email, created_at FROM users WHERE email = ?",
            (email,)
        )
        row = cur.fetchone()
        if not row:
            return None
        return User(row['user_id'], row['name'], row['email'], row['created_at'])

    def find_by_id(self, conn, user_id):
        # Look up a user by their primary key.
        # Used by AccountService.getAccount() to fetch the owner's name.
        # Returns a User object, or None if not found.
        cur = conn.cursor()
        cur.execute(
            "SELECT user_id, name, email, created_at FROM users WHERE user_id = ?",
            (user_id,)
        )
        row = cur.fetchone()
        if not row:
            return None
        return User(row['user_id'], row['name'], row['email'], row['created_at'])

    def create(self, conn, name, email):
        # Insert a new user row and return a User object with the generated user_id.
        # Note: conn.commit() is NOT called here — the service layer commits.
        cur = conn.cursor()
        cur.execute("INSERT INTO users (name, email) VALUES (?, ?)", (name, email))
        return User(cur.lastrowid, name, email)
