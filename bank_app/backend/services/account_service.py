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
            "userName":  "Deleted User" if user.is_deleted else user.name,
            "email":     "deleted@deleted.com" if user.is_deleted else user.email,
            "balance":   float(account.balance),
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


def delete_account(account_id):
    """
    Soft-delete the user who owns the given account.
    The user row, account row, and all transactions remain in the database
    for audit and financial history purposes — only the is_deleted flag changes.
    Any endpoint that returns user-facing data checks this flag and shows
    masked values ('Deleted User', 'deleted@deleted.com') to regular users.
    Admins querying /users still see the real name and email.
    Raises ValueError if the account does not exist.
    """
    session = get_db()
    try:
        account = account_repo.get_account_by_id(session, account_id)
        if not account:
            raise ValueError("Account not found")
        user = user_repo.soft_delete(session, account.user_id)
        if not user:
            raise ValueError("User not found")
        session.commit()
        return {"accountId": account_id, "status": "deleted"}
    except:
        session.rollback()
        raise
    finally:
        session.close()


def get_all_users():
    """
    Return all users with their real name, email, account info, and deletion status.
    Admin-only endpoint — exposes full PII including soft-deleted users.
    Regular-user-facing endpoints use get_account() which masks deleted users.
    """
    session = get_db()
    try:
        from models.account import Account
        users = user_repo.get_all_users(session)
        result = []
        for user in users:
            accounts = session.query(Account).filter_by(user_id=user.user_id).all()
            result.append({
                "userId":    user.user_id,
                "name":      user.name,
                "email":     user.email,
                "isDeleted": user.is_deleted,
                "deletedAt": str(user.deleted_at)[:10] if user.deleted_at else None,
                "createdAt": str(user.created_at)[:10],
                "accounts": [
                    {
                        "accountId":   a.account_id,
                        "accountType": a.account_type,
                        "balance":     float(a.balance)
                    }
                    for a in accounts
                ]
            })
        return result
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
