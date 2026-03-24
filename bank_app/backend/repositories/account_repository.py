# Data access for the accounts table.
# Repositories are the only layer that writes SQL — nothing else touches the DB directly.
# All methods receive a 'conn' (connection) from the service layer so multiple
# repository calls can share one transaction and be committed/rolled back together.
from models.account import Account

class AccountRepository:
    def create(self, conn, user_id, account_type):
        # Insert a new account row with a starting balance of 0.
        # Returns an Account object with the generated account_id.
        # Note: conn.commit() is NOT called here — the service layer commits.
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO accounts (user_id, account_type) VALUES (?, ?)",
            (user_id, account_type)
        )
        return Account(cur.lastrowid, user_id, 0, account_type)

    def find_by_id(self, conn, account_id):
        # Look up an account by its primary key.
        # Returns an Account object, or None if not found.
        cur = conn.cursor()
        cur.execute(
            "SELECT account_id, user_id, balance, account_type, created_at FROM accounts WHERE account_id = ?",
            (account_id,)
        )
        row = cur.fetchone()
        if not row:
            return None
        return Account(row['account_id'], row['user_id'], row['balance'], row['account_type'], row['created_at'])

    def update_balance(self, conn, account_id, new_balance):
        # Overwrite the stored balance for an account.
        # Called by AccountService.deposit() and AccountService.withdraw()
        # alongside TransactionRepository.create() in the same connection,
        # so both changes are committed atomically.
        cur = conn.cursor()
        cur.execute(
            "UPDATE accounts SET balance = ? WHERE account_id = ?",
            (new_balance, account_id)
        )
