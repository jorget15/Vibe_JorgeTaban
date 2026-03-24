'''Entity representing a bank account.
Each Account belongs to one User and can be either 'checking' or 'savings'.
Deposits and withdrawals are recorded as Transactions linked to this Account.'''
class Account:
    def __init__(self, account_id, user_id, balance, account_type, created_at=None):
        self.account_id = account_id    # primary key in the accounts table
        self.user_id = user_id          # foreign key linking this account to its owner (User)
        self.balance = balance          # current balance — updated on every deposit/withdrawal
        self.account_type = account_type  # 'checking' or 'savings'
        self.created_at = created_at    # timestamp set automatically by the database
