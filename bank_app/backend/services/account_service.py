"""
account_service.py — the business logic layer.

RESPONSIBILITY OF THIS FILE:
  - Enforce all business rules (positive amounts, sufficient funds, valid credentials)
  - Coordinate multiple repository calls within a single database session
  - Ensure every operation is atomic: either everything succeeds or everything rolls back

WHAT DOES NOT BELONG HERE:
  - HTTP concerns (status codes, request parsing) → that's in routes.py
  - Raw SQL or ORM queries → that's in repositories/

SESSION PATTERN (used by every function):
  session = get_db()       # open a connection to the database
  try:
      ...repo calls...
      session.commit()     # write everything to the database at once
      return result
  except:
      session.rollback()   # undo everything if anything went wrong
      raise                # re-raise so the route can return a 400/404
  finally:
      session.close()      # always release the connection back to the pool

  Why this pattern?
    If a function makes three database writes and the third one fails,
    rollback() undoes the first two. Without this, the database could
    end up in a half-updated, inconsistent state.
"""
from repositories.account_repo import AccountRepo
from repositories.user_repo import UserRepo
from repositories.transaction_repo import TransactionRepo
from db.database import get_db
from werkzeug.security import generate_password_hash, check_password_hash

account_repo     = AccountRepo()
user_repo        = UserRepo()
transaction_repo = TransactionRepo()


def create_account(name, email, account_type, password=None):
    """
    Create a new bank account. If no user with this email exists, create one first.

    Why create the user and account together?
      In this bank, you cannot have a user without an account or an account
      without a user. Handling both in one service call keeps the operation
      atomic — either both rows are created or neither is.

    Why is password optional?
      Users created via Postman (for testing) don't have passwords. Making
      password optional lets those users coexist with properly registered users.
      Users without a password_hash simply cannot log in.
    """
    if account_type not in ('CHECKING', 'SAVINGS'):
        raise ValueError("accountType must be CHECKING or SAVINGS")

    session = get_db()
    try:
        # Reuse the existing user if the email already exists.
        # This allows one person to open a second account without creating a duplicate user row.
        user = user_repo.get_user_by_email(session, email)
        if not user:
            # generate_password_hash produces a one-way hash like:
            # "scrypt:32768:8:1$salt$hash..."
            # The original password can never be recovered from this string.
            hashed = generate_password_hash(password) if password else None
            user = user_repo.add_user(session, name, email, password_hash=hashed)

        account = account_repo.add_account(session, user.user_id, account_type)
        session.commit()
        return {
            "accountId":   account.account_id,
            "accountType": account.account_type,
            "balance":     float(account.balance)
        }
    except:
        session.rollback()
        raise
    finally:
        session.close()


def login(email, password):
    """
    Verify credentials and return the user's basic info.

    Why do we say "Invalid credentials" for both wrong email AND wrong password?
      If we said "email not found" vs "wrong password" separately, an attacker
      could use those different messages to discover which emails are registered.
      A single vague message prevents that information leak.

    Why check password_hash is not None separately?
      Users created via Postman before the password system existed have
      password_hash = NULL. Calling check_password_hash with None would crash.
      We treat NULL the same as wrong credentials.
    """
    session = get_db()
    try:
        user = user_repo.get_user_by_email(session, email)

        # Both "email not found" and "no password set" return the same error
        # to avoid revealing which emails are registered in the system.
        if not user or not user.password_hash:
            raise ValueError("Invalid credentials")

        # check_password_hash hashes the submitted password and compares it
        # to the stored hash. Returns True only if they match.
        if not check_password_hash(user.password_hash, password):
            raise ValueError("Invalid credentials")

        if user.is_deleted:
            raise ValueError("Account is deactivated")

        # Fetch the user's first account to return its ID to the frontend.
        # The frontend stores this ID in Redux and uses it for all subsequent requests.
        from models.account import Account
        account = session.query(Account).filter_by(user_id=user.user_id).first()

        return {
            "userId":    user.user_id,
            "name":      user.name,
            "email":     user.email,
            "isAdmin":   user.is_admin,
            "accountId": account.account_id if account else None,
        }
    finally:
        # No commit needed — login is a read-only operation.
        # We still need to close the session to release the DB connection.
        session.close()


def get_account(account_id):
    """
    Retrieve account details by ID.

    Why mask PII for deleted users instead of returning a 404?
      The account still exists and has a real balance. Other users might
      have transferred money to it and need to see it in their history.
      Masking the name/email protects the deleted user's identity while
      keeping the financial record intact.
    """
    session = get_db()
    try:
        account = account_repo.get_account_by_id(session, account_id)
        if not account:
            return None
        user = user_repo.get_user_by_id(session, account.user_id)
        return {
            "accountId":   account.account_id,
            "userName":    "Deleted User"       if user.is_deleted else user.name,
            "email":       "deleted@deleted.com" if user.is_deleted else user.email,
            "balance":     float(account.balance),
            "accountType": account.account_type
        }
    finally:
        session.close()


def deposit(account_id, amount):
    """
    Add money to an account and record the transaction.

    Why validate amount > 0 here and not just in routes.py?
      routes.py validates that amount is a number (parse_amount).
      This service validates the business rule: a deposit of zero or
      a negative number makes no financial sense. These are different concerns.
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
        # Every money movement is recorded as a transaction row for the audit trail.
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
    Remove money from an account and record the transaction.

    The balance check (float(account.balance) < amount) is the core
    "insufficient funds" rule. float() is used because account.balance
    is a SQLAlchemy Decimal object, which doesn't compare directly to a
    Python float without conversion.
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


def lookup_recipient(query):
    """
    Look up an account by account number (integer) or email address.

    Used by the send flow so the frontend can show
    "This belongs to Jane Doe — proceed?" before the transfer happens.

    Returns { accountId, name, email } or raises ValueError if not found.
    """
    session = get_db()
    try:
        from models.account import Account
        account = None
        user    = None

        # If the query is a plain integer, treat it as an account ID.
        # Otherwise fall through to email lookup.
        try:
            account_id = int(query)
            account = account_repo.get_account_by_id(session, account_id)
            if account:
                user = user_repo.get_user_by_id(session, account.user_id)
        except ValueError:
            pass  # not an integer — will try email below

        if not account:
            user = user_repo.get_user_by_email(session, query)
            if user:
                account = session.query(Account).filter_by(user_id=user.user_id).first()

        if not account or not user:
            raise ValueError("No account found")

        if user.is_deleted:
            raise ValueError("That account has been deactivated")

        return {
            "accountId": account.account_id,
            "name":      user.name,
            "email":     user.email,
        }
    finally:
        session.close()


def transfer(sender_account_id, recipient_account_id, amount):
    """
    Move money from one account to another atomically.

    Why are there FOUR writes in one session?
      1. Decrease sender balance
      2. Increase recipient balance
      3. Record TRANSFER_OUT on sender (with description "Transfer to Jane Doe (account #X)")
      4. Record TRANSFER_IN on recipient (with description "Transfer from John Smith (account #X)")

    All four happen inside one session.commit(). If the database rejects any
    of them, session.rollback() undoes all four. Money can never go missing
    because write 1 succeeded but write 2 failed.

    Why record TRANSFER_OUT and TRANSFER_IN separately?
      Each account owner should see only their own transaction history.
      The sender needs to see their outgoing transfer; the recipient needs
      to see their incoming transfer. One transaction row per account keeps
      the history clean.
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

        account_repo.update_balance(session, sender_account_id,    new_sender_balance)
        account_repo.update_balance(session, recipient_account_id, new_recipient_balance)

        # Look up names so the description says "Transfer to Jane Doe" not just "account #3"
        recipient_user = user_repo.get_user_by_id(session, recipient.user_id)
        sender_user    = user_repo.get_user_by_id(session, sender.user_id)
        recipient_label = recipient_user.name if recipient_user else f"account #{recipient_account_id}"
        sender_label    = sender_user.name    if sender_user    else f"account #{sender_account_id}"

        transaction_repo.add_transaction(
            session, sender_account_id, 'TRANSFER_OUT', amount,
            description=f"Transfer to {recipient_label} (account #{recipient_account_id})"
        )
        transaction_repo.add_transaction(
            session, recipient_account_id, 'TRANSFER_IN', amount,
            description=f"Transfer from {sender_label} (account #{sender_account_id})"
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

    Why soft-delete the USER and not the ACCOUNT?
      The is_deleted flag lives on the user row. An account can't exist without
      a user, so flagging the user effectively deactivates the whole relationship.
      The account row, balance, and all transactions remain untouched.

    What changes after soft-delete?
      - is_deleted = True, deleted_at = now()
      - POST /login → "Account is deactivated"
      - GET /accounts/:id → returns masked PII ("Deleted User")
      - GET /users (admin) → still shows real name and email
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
    Return every user with full PII, account info, and transaction count.

    This is the admin-only view. Unlike get_account(), there is no masking
    here — admins need the real data to identify and audit accounts.

    txnCount is the total number of transactions across ALL of the user's
    accounts. It's computed here in the service rather than in the route
    or the frontend because it requires a database query.
    """
    session = get_db()
    try:
        from models.account import Account
        from models.transaction import Transaction

        users  = user_repo.get_all_users(session)
        result = []

        for user in users:
            accounts    = session.query(Account).filter_by(user_id=user.user_id).all()
            account_ids = [a.account_id for a in accounts]

            # Count all transactions across every account this user owns.
            # .in_() is SQLAlchemy's way of writing SQL's WHERE x IN (1, 2, 3).
            txn_count = (
                session.query(Transaction)
                .filter(Transaction.account_id.in_(account_ids))
                .count()
            ) if account_ids else 0

            result.append({
                "userId":    user.user_id,
                "name":      user.name,
                "email":     user.email,
                "isAdmin":   user.is_admin,
                "isDeleted": user.is_deleted,
                "deletedAt": str(user.deleted_at)[:10] if user.deleted_at else None,
                "createdAt": str(user.created_at)[:10],
                "txnCount":  txn_count,
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
    Retrieve the transaction history for an account in reverse-chronological order.

    Each transaction includes:
      txnId       — the database primary key
      type        — DEPOSIT, WITHDRAW, TRANSFER_OUT, or TRANSFER_IN
      amount      — always positive; the type tells you the direction
      description — human-readable label (e.g. "Transfer to account #3")
      date        — just the date portion of created_at (YYYY-MM-DD)
    """
    session = get_db()
    try:
        transactions = transaction_repo.get_transactions_by_account_id(session, account_id)
        return [
            {
                "txnId":       t.txn_id,
                "type":        t.txn_type,
                "amount":      float(t.amount),
                "description": t.description,
                # created_at is a full datetime; [:10] slices just the date part
                "date":        str(t.created_at)[:10]
            }
            for t in transactions
        ]
    finally:
        session.close()
