# Data access for the transactions table using SQLAlchemy ORM.
# Repositories are the only layer that talks to the DB — no SQL lives anywhere else.
# All methods receive a session from the service layer so multiple repo calls
# can share one transaction and be committed or rolled back together.
from models.transaction import Transaction

class TransactionRepo:
    def add_transaction(self, session, account_id, txn_type, amount, description=None):
        # Insert a new transaction record.
        # txn_type: 'DEPOSIT', 'WITHDRAW', 'TRANSFER_OUT', or 'TRANSFER_IN'
        # description: optional human-readable note (e.g. "To account #5")
        # Always called together with AccountRepo.update_balance() so the balance
        # change and the transaction log are saved in the same commit.
        txn = Transaction(account_id=account_id, txn_type=txn_type, amount=amount, description=description)
        session.add(txn)
        session.flush()
        return txn

    def get_transactions_by_account_id(self, session, account_id):
        # Fetch all transactions for a given account.
        # Returns a list of Transaction objects — empty list if none exist.
        return session.query(Transaction).filter_by(account_id=account_id).all()
