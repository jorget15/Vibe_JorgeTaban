from models.user import User

def get_user_by_email(conn, email):
    cur = conn.cursor()
    cur.execute("SELECT user_id, name, email, created_at FROM users WHERE email = ?", (email,))
    row = cur.fetchone()
    if not row:
        return None
    return User(row['user_id'], row['name'], row['email'], row['created_at'])

def get_user_by_id(conn, user_id):
    cur = conn.cursor()
    cur.execute("SELECT user_id, name, email, created_at FROM users WHERE user_id = ?", (user_id,))
    row = cur.fetchone()
    if not row:
        return None
    return User(row['user_id'], row['name'], row['email'], row['created_at'])

def add_user(conn, name, email):
    cur = conn.cursor()
    cur.execute("INSERT INTO users (name, email) VALUES (?, ?)", (name, email))
    return User(cur.lastrowid, name, email)
