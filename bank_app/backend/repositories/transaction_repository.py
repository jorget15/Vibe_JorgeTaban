# Data access for the transactions table.
# Repositories are the only layer that writes SQL — nothing else touches the DB directly.
# All methods receive a 'conn' (connection) from the service layer so multiple
# repository calls can share one transaction and be committed/rolled back together.
from models.transaction import Transaction

class TransactionRepository:
    def create(self, conn, account_id, txn_type, amount):
        # Insert a new transaction record (either 'DEPOSIT' or 'WITHDRAW').
        # Always called together with AccountRepository.update_balance() so the
        # balance change and the transaction log are saved in the same commit.
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO transactions (account_id, txn_type, amount) VALUES (?, ?, ?)",
            (account_id, txn_type, amount)
        )
        return Transaction(cur.lastrowid, account_id, txn_type, amount)

    def find_by_account_id(self, conn, account_id):
        # Fetch all transactions for a given account, ordered by insertion (oldest first).
        # Returns a list of Transaction objects — empty list if none exist.
        cur = conn.cursor()
        cur.execute(
            "SELECT txn_id, account_id, txn_type, amount, created_at FROM transactions WHERE account_id = ?",
            (account_id,)
        )
        return [
            Transaction(r['txn_id'], r['account_id'], r['txn_type'], r['amount'], r['created_at'])
            for r in cur.fetchall()
        ]
