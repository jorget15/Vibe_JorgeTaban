# Data access for the accounts table using SQLAlchemy ORM.
# Repositories are the only layer that talks to the DB — no SQL lives anywhere else.
# All methods receive a session from the service layer so multiple repo calls
# can share one transaction and be committed or rolled back together.
from models.account import Account

class AccountRepo: 
    def add_account(self, session, user_id, account_type):
        # Insert a new account row with a starting balance of 0.
        # session.flush() assigns the generated account_id without committing,
        # so the service layer can still roll back if something fails afterward.
        account = Account(user_id=user_id, account_type=account_type, balance=0)
        session.add(account)
        session.flush()
        return account

    def get_account_by_id(self, session, account_id):
        # Look up an account by its primary key.
        # Returns an Account object, or None if not found.
        return session.query(Account).filter_by(account_id=account_id).first()

    def update_balance(self, session, account_id, new_balance):
        # Overwrite the stored balance for an account.
        # SQLAlchemy tracks the change on the object; it's written to the DB on commit.
        account = session.query(Account).filter_by(account_id=account_id).first()
        if account:
            account.balance = new_balance

