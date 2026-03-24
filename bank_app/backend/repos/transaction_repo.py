from models.transaction import Transaction

def add_transaction(conn, account_id, txn_type, amount):
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO transactions (account_id, txn_type, amount) VALUES (?, ?, ?)",
        (account_id, txn_type, amount)
    )
    return Transaction(cur.lastrowid, account_id, txn_type, amount)

def get_transactions_by_account_id(conn, account_id):
    cur = conn.cursor()
    cur.execute(
        "SELECT txn_id, account_id, txn_type, amount, created_at FROM transactions WHERE account_id = ?",
        (account_id,)
    )
    return [
        Transaction(r['txn_id'], r['account_id'], r['txn_type'], r['amount'], r['created_at'])
        for r in cur.fetchall()
    ]
