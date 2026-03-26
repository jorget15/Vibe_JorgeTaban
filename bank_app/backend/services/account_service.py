"""
Account Service Module
----------------------
Service layer for managing bank accounts.
Enforces all business rules (positive amounts, sufficient funds, account existence)
and coordinates across repos within a single session so every operation is atomic —
either everything commits or everything rolls back.
"""
from repositories.account_repo import AccountRepo
from repositories.user_repo import UserRepo
from repositories.transaction_repo import TransactionRepo
from db.database import get_db

account_repo = AccountRepo()
user_repo = UserRepo()
transaction_repo = TransactionRepo()

def create_account(name, email, account_type):
    """
    Create a new account for a user. If the user does not exist, create the user first.
    Returns account details as a dictionary.
    """
    session = get_db()
    try:
        user = user_repo.get_user_by_email(session, email)
        if not user:
            user = user_repo.add_user(session, name, email)
        account = account_repo.add_account(session, user.user_id, account_type)
        session.commit()
        return {"accountId": account.account_id, "accountType": account.account_type, "balance": float(account.balance)}
    except:
        session.rollback()
        raise
    finally:
        session.close()

def get_account(account_id):
    """
    Retrieve account details by account ID, including user name and balance.
    Returns account information as a dictionary or None if not found.
    """
    session = get_db()
    try:
        account = account_repo.get_account_by_id(session, account_id)
        if not account:
            return None
        user = user_repo.get_user_by_id(session, account.user_id)
        return {
            "accountId": account.account_id,
            "userName": user.name,
            "balance": float(account.balance),
            "accountType": account.account_type
        }
    finally:
        session.close()

def deposit(account_id, amount):
    """
    Deposit a positive amount into the specified account.
    Updates the account balance and records the transaction.
    Returns updated account information as a dictionary.
    Raises ValueError for invalid input or missing account.
    """
    if amount <= 0:
        raise ValueError("Deposit amount must be positive")
    session = get_db()
    try:
        account = account_repo.get_account_by_id(session, account_id)
        if not account:
            raise ValueError("Account not found")
        new_balance = float(account.balance) + amount
        account_repo.update_balance(session, account_id, new_balance)
        transaction_repo.add_transaction(session, account_id, 'DEPOSIT', amount)
        session.commit()
        return {"accountId": account_id, "balance": new_balance}
    except:
        session.rollback()
        raise
    finally:
        session.close()

def withdraw(account_id, amount):
    """
    Withdraw a positive amount from the specified account.
    Checks for sufficient funds, updates balance, and records the transaction.
    Returns updated account information as a dictionary.
    Raises ValueError for invalid input, missing account, or insufficient funds.
    """
    if amount <= 0:
        raise ValueError("Withdrawal amount must be positive")
    session = get_db()
    try:
        account = account_repo.get_account_by_id(session, account_id)
        if not account:
            raise ValueError("Account not found")
        if float(account.balance) < amount:
            raise ValueError("Insufficient funds")
        new_balance = float(account.balance) - amount
        account_repo.update_balance(session, account_id, new_balance)
        transaction_repo.add_transaction(session, account_id, 'WITHDRAW', amount)
        session.commit()
        return {"accountId": account_id, "balance": new_balance}
    except:
        session.rollback()
        raise
    finally:
        session.close()

def transfer(sender_account_id, recipient_account_id, amount):
    """
    Transfer a positive amount from one account to another.
    Both accounts must exist and the sender must have sufficient funds.
    Records a TRANSFER_OUT on the sender and a TRANSFER_IN on the recipient.
    Both balance updates and both transaction records are committed atomically —
    if anything fails, the whole operation rolls back.
    Returns updated sender balance.
    Raises ValueError for invalid input, missing accounts, or insufficient funds.
    """
    if amount <= 0:
        raise ValueError("Transfer amount must be positive")
    if sender_account_id == recipient_account_id:
        raise ValueError("Cannot transfer to the same account")
    session = get_db()
    try:
        sender = account_repo.get_account_by_id(session, sender_account_id)
        if not sender:
            raise ValueError("Sender account not found")
        recipient = account_repo.get_account_by_id(session, recipient_account_id)
        if not recipient:
            raise ValueError("Recipient account not found")
        if float(sender.balance) < amount:
            raise ValueError("Insufficient funds")

        new_sender_balance    = float(sender.balance) - amount
        new_recipient_balance = float(recipient.balance) + amount

        account_repo.update_balance(session, sender_account_id, new_sender_balance)
        account_repo.update_balance(session, recipient_account_id, new_recipient_balance)

        transaction_repo.add_transaction(
            session, sender_account_id, 'TRANSFER_OUT', amount,
            description=f"Transfer to account #{recipient_account_id}"
        )
        transaction_repo.add_transaction(
            session, recipient_account_id, 'TRANSFER_IN', amount,
            description=f"Transfer from account #{sender_account_id}"
        )

        session.commit()
        return {"accountId": sender_account_id, "balance": new_sender_balance}
    except:
        session.rollback()
        raise
    finally:
        session.close()


def get_transactions(account_id):
    """
    Retrieve a list of transactions for the specified account ID.
    Returns a list of transaction dictionaries with id, type, amount, and date.
    """
    session = get_db()
    try:
        transactions = transaction_repo.get_transactions_by_account_id(session, account_id)
        return [
            {
                "txnId": t.txn_id,
                "type": t.txn_type,
                "amount": float(t.amount),
                "description": t.description,
                "date": str(t.created_at)[:10]
            }
            for t in transactions
        ]
    finally:
        session.close()
