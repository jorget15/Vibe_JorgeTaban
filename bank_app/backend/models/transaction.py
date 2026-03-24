''' Entity representing a single deposit or withdrawal transaction.
Every time money moves in or out of an Account, a Transaction record is created.'''
class Transaction:
    def __init__(self, txn_id, account_id, txn_type, amount, created_at=None):
        self.txn_id = txn_id          # primary key in the transactions table
        self.account_id = account_id  # foreign key linking this transaction to an Account
        self.txn_type = txn_type      # 'DEPOSIT' or 'WITHDRAW'
        self.amount = amount          # how much money was moved
        self.created_at = created_at  # timestamp set automatically by the database
