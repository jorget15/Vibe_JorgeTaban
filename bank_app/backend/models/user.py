# Entity representing a bank user.
# A User owns one or more Accounts. Each Account links back to a User via user_id.
class User:
    def __init__(self, user_id, name, email, created_at=None):
        self.user_id = user_id      # primary key in the users table
        self.name = name            # full name entered at account creation
        self.email = email          # unique identifier — used to avoid duplicate users
        self.created_at = created_at  # timestamp set automatically by the database
