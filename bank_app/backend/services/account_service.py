"""
account_service.py — the business logic layer.

RESPONSIBILITY OF THIS FILE:
  - Enforce all business rules (positive amounts, sufficient funds, valid credentials)
  - Coordinate multiple repository calls
  - Ensure multi-write operations are atomic via MongoDB transactions

WHAT DOES NOT BELONG HERE:
  - HTTP concerns (status codes, request parsing) → that's in routes.py
  - Database queries → that's in repositories/

ATOMICITY PATTERN (used only by transfer — the one function with multiple writes):

  with mongo_client.start_session() as mongo_session:
      with mongo_session.start_transaction():
          repo.write_one(..., mongo_session=mongo_session)
          repo.write_two(..., mongo_session=mongo_session)
          # if anything raises, MongoDB automatically aborts the transaction
          # and rolls back both writes — no money can go missing halfway through

  All other functions (deposit, withdraw, etc.) make a single write each.
  Single-document writes in MongoDB are always atomic on their own, so no
  transaction is needed there.

FIELD ACCESS:
  Repos now return plain dicts. Fields are accessed with dict notation:
  user["name"], account["balance"], etc.
"""
from repositories.account_repo import AccountRepo
from repositories.user_repo import UserRepo
from repositories.transaction_repo import TransactionRepo
from db.database import mongo_client
from werkzeug.security import generate_password_hash, check_password_hash

account_repo     = AccountRepo()
user_repo        = UserRepo()
transaction_repo = TransactionRepo()


def create_account(name, email, account_type, password=None):
    """
    Create a new bank account. If no user with this email exists, create one first.

    Why create the user and account together?
      In this bank, you cannot have a user without an account or vice versa.
      Both writes go through the same function so they either both succeed or
      neither is returned to the caller.
    """
    if account_type not in ('CHECKING', 'SAVINGS'):
        raise ValueError("accountType must be CHECKING or SAVINGS")

    user = user_repo.get_user_by_email(email)
    if user:
        raise ValueError("An account with this email already exists. Please sign in.")

    hashed = generate_password_hash(password) if password else None
    user   = user_repo.add_user(name, email, password_hash=hashed)

    account = account_repo.add_account(user["user_id"], account_type)
    return {
        "accountId":   account["account_id"],
        "accountType": account["account_type"],
        "balance":     float(account["balance"])
    }


def login(email, password):
    """
    Verify credentials and return the user's basic info.

    Why the same error for wrong email AND wrong password?
      Returning different messages would let an attacker enumerate which
      emails are registered. A single vague message prevents that.
    """
    user = user_repo.get_user_by_email(email)

    if not user or not user["password_hash"]:
        raise ValueError("Invalid credentials")

    if not check_password_hash(user["password_hash"], password):
        raise ValueError("Invalid credentials")

    if user["is_deleted"]:
        raise ValueError("Account is deactivated")

    # Fetch the first account for this user to return its ID to the frontend.
    account = account_repo.get_account_by_user_id(user["user_id"])

    return {
        "userId":    user["user_id"],
        "name":      user["name"],
        "email":     user["email"],
        "isAdmin":   user["is_admin"],
        "accountId": account["account_id"] if account else None,
    }


def get_account(account_id):
    """
    Retrieve account details by ID.

    Deleted users get masked PII instead of a 404 — the account still
    exists and has a real balance that may appear in other users' history.
    """
    account = account_repo.get_account_by_id(account_id)
    if not account:
        return None
    user = user_repo.get_user_by_id(account["user_id"])
    return {
        "accountId":   account["account_id"],
        "userName":    "Deleted User"        if user["is_deleted"] else user["name"],
        "email":       "deleted@deleted.com" if user["is_deleted"] else user["email"],
        "balance":     float(account["balance"]),
        "accountType": account["account_type"]
    }


def deposit(account_id, amount):
    """
    Add money to an account and record the transaction.

    Single write pair (balance update + transaction record). MongoDB
    guarantees each individual write is atomic, so no transaction needed.
    """
    if amount <= 0:
        raise ValueError("Deposit amount must be positive")

    account = account_repo.get_account_by_id(account_id)
    if not account:
        raise ValueError("Account not found")

    new_balance = float(account["balance"]) + amount
    account_repo.update_balance(account_id, new_balance)
    transaction_repo.add_transaction(account_id, 'DEPOSIT', amount)
    return {"accountId": account_id, "balance": new_balance}


def withdraw(account_id, amount):
    """
    Remove money from an account and record the transaction.
    """
    if amount <= 0:
        raise ValueError("Withdrawal amount must be positive")

    account = account_repo.get_account_by_id(account_id)
    if not account:
        raise ValueError("Account not found")
    if float(account["balance"]) < amount:
        raise ValueError("Insufficient funds")

    new_balance = float(account["balance"]) - amount
    account_repo.update_balance(account_id, new_balance)
    transaction_repo.add_transaction(account_id, 'WITHDRAW', amount)
    return {"accountId": account_id, "balance": new_balance}


def lookup_recipient(query):
    """
    Look up an account by account number (integer) or email address.

    Used by the send flow so the frontend can show
    "This belongs to Jane Doe — proceed?" before the transfer happens.
    """
    account = None
    user    = None

    try:
        account_id = int(query)
        account = account_repo.get_account_by_id(account_id)
        if account:
            user = user_repo.get_user_by_id(account["user_id"])
    except ValueError:
        pass  # not an integer — try email below

    if not account:
        user = user_repo.get_user_by_email(query)
        if user:
            account = account_repo.get_account_by_user_id(user["user_id"])

    if not account or not user:
        raise ValueError("No account found")

    if user["is_deleted"]:
        raise ValueError("That account has been deactivated")

    return {
        "accountId": account["account_id"],
        "name":      user["name"],
        "email":     user["email"],
    }


def transfer(sender_account_id, recipient_account_id, amount):
    """
    Move money from one account to another atomically.

    Why four writes?
      1. Decrease sender balance
      2. Increase recipient balance
      3. Record TRANSFER_OUT on sender
      4. Record TRANSFER_IN on recipient

    All four are wrapped in a MongoDB transaction. If anything fails,
    Atlas automatically aborts and rolls back all four — money cannot
    disappear halfway through.

    Why read the accounts BEFORE opening the transaction?
      Validation (does the account exist? sufficient funds?) doesn't need
      to be inside the transaction — it's just reading. We open the
      transaction only for the writes, keeping it as short as possible.
      Long-running transactions increase the chance of conflicts on Atlas.
    """
    if amount <= 0:
        raise ValueError("Transfer amount must be positive")
    if sender_account_id == recipient_account_id:
        raise ValueError("Cannot transfer to the same account")

    # Validate everything before opening the transaction
    sender = account_repo.get_account_by_id(sender_account_id)
    if not sender:
        raise ValueError("Sender account not found")

    recipient = account_repo.get_account_by_id(recipient_account_id)
    if not recipient:
        raise ValueError("Recipient account not found")

    if float(sender["balance"]) < amount:
        raise ValueError("Insufficient funds")

    new_sender_balance    = float(sender["balance"]) - amount
    new_recipient_balance = float(recipient["balance"]) + amount

    recipient_user = user_repo.get_user_by_id(recipient["user_id"])
    sender_user    = user_repo.get_user_by_id(sender["user_id"])
    recipient_label = recipient_user["name"] if recipient_user else f"account #{recipient_account_id}"
    sender_label    = sender_user["name"]    if sender_user    else f"account #{sender_account_id}"

    # Open a MongoDB session and wrap all four writes in a transaction.
    # The `with` blocks handle commit and abort automatically:
    #   - clean exit → commitTransaction
    #   - any exception → abortTransaction (full rollback)
    with mongo_client.start_session() as mongo_session:
        with mongo_session.start_transaction():
            account_repo.update_balance(sender_account_id,    new_sender_balance,    mongo_session)
            account_repo.update_balance(recipient_account_id, new_recipient_balance, mongo_session)
            transaction_repo.add_transaction(
                sender_account_id, 'TRANSFER_OUT', amount,
                description=f"Transfer to {recipient_label} (account #{recipient_account_id})",
                mongo_session=mongo_session
            )
            transaction_repo.add_transaction(
                recipient_account_id, 'TRANSFER_IN', amount,
                description=f"Transfer from {sender_label} (account #{sender_account_id})",
                mongo_session=mongo_session
            )

    return {"accountId": sender_account_id, "balance": new_sender_balance}


def delete_account(account_id):
    """
    Soft-delete the user who owns the given account.

    Nothing is physically removed — is_deleted is flipped and deleted_at
    is recorded. All financial history is preserved for auditing.
    """
    account = account_repo.get_account_by_id(account_id)
    if not account:
        raise ValueError("Account not found")

    user = user_repo.soft_delete(account["user_id"])
    if not user:
        raise ValueError("User not found")

    return {"accountId": account_id, "status": "deleted"}


def get_all_users():
    """
    Return every user with full PII, account info, and transaction count.
    Admin-only view — no masking here.
    """
    users  = user_repo.get_all_users()
    result = []

    for user in users:
        accounts    = account_repo.get_accounts_by_user_id(user["user_id"])
        account_ids = [a["account_id"] for a in accounts]
        txn_count   = transaction_repo.count_by_account_ids(account_ids)

        result.append({
            "userId":    user["user_id"],
            "name":      user["name"],
            "email":     user["email"],
            "isAdmin":   user["is_admin"],
            "isDeleted": user["is_deleted"],
            "deletedAt": str(user["deleted_at"])[:10] if user["deleted_at"] else None,
            "createdAt": str(user["created_at"])[:10],
            "txnCount":  txn_count,
            "accounts": [
                {
                    "accountId":   a["account_id"],
                    "accountType": a["account_type"],
                    "balance":     float(a["balance"]),
                    "txnCount":    transaction_repo.count_by_account_ids([a["account_id"]]),
                    "createdAt":   str(a["created_at"])[:10]
                }
                for a in accounts
            ]
        })

    return result


def get_user_accounts(user_id):
    """
    Return all accounts belonging to a user.
    Used by the accounts overview screen so the user can see and switch between accounts.
    """
    user = user_repo.get_user_by_id(user_id)
    if not user:
        raise ValueError("User not found")
    accounts = account_repo.get_accounts_by_user_id(user_id)
    return [
        {
            "accountId":   a["account_id"],
            "accountType": a["account_type"],
            "balance":     float(a["balance"])
        }
        for a in accounts
    ]


def add_account_to_user(user_id, account_type):
    """
    Open a new account for an already-registered user.
    Called from the accounts overview screen when the user clicks 'Open New Account'.
    """
    if account_type not in ('CHECKING', 'SAVINGS'):
        raise ValueError("accountType must be CHECKING or SAVINGS")
    user = user_repo.get_user_by_id(user_id)
    if not user:
        raise ValueError("User not found")
    account = account_repo.add_account(user_id, account_type)
    return {
        "accountId":   account["account_id"],
        "accountType": account["account_type"],
        "balance":     float(account["balance"])
    }


def get_transactions(account_id):
    """
    Retrieve the transaction history for an account in reverse-chronological order.
    """
    transactions = transaction_repo.get_transactions_by_account_id(account_id)
    return [
        {
            "txnId":       t["txn_id"],
            "type":        t["txn_type"],
            "amount":      float(t["amount"]),
            "description": t["description"],
            "date":        t["created_at"].strftime("%Y-%m-%dT%H:%M:%SZ") if hasattr(t["created_at"], "strftime") else str(t["created_at"])
        }
        for t in transactions
    ]
