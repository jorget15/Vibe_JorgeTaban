"""
Account Repository Module
------------------------
Handles direct database operations for account-related actions, including:
- Adding new accounts
- Retrieving account details by ID
- Updating account balances
This module interacts with the database and returns Account model instances.
"""
from models.account import Account

def add_account(conn, user_id, account_type):
    """
    Insert a new account for the given user ID and account type.
    Returns an Account instance with the new account's details.
    """
    cur = conn.cursor()
    cur.execute("INSERT INTO accounts (user_id, account_type) VALUES (?, ?)", (user_id, account_type))
    return Account(cur.lastrowid, user_id, 0, account_type)

def get_account_by_id(conn, account_id):
    """
    Retrieve an account by its account ID.
    Returns an Account instance if found, otherwise None.
    """
    cur = conn.cursor()
    cur.execute(
        "SELECT account_id, user_id, balance, account_type, created_at FROM accounts WHERE account_id = ?",
        (account_id,)
    )
    row = cur.fetchone()
    if not row:
        return None
    return Account(row['account_id'], row['user_id'], row['balance'], row['account_type'], row['created_at'])

def update_balance(conn, account_id, new_balance):
    """
    Update the balance for the specified account ID.
    Does not return a value.
    """
    cur = conn.cursor()
    cur.execute("UPDATE accounts SET balance = ? WHERE account_id = ?", (new_balance, account_id))
