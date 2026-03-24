import repos.account_repo as account_repo
import repos.user_repo as user_repo
import repos.transaction_repo as transaction_repo
from db.database import get_db

def create_account(name, email, account_type):
    conn = get_db()
    try:
        user = user_repo.get_user_by_email(conn, email)
        if not user:
            user = user_repo.add_user(conn, name, email)
        account = account_repo.add_account(conn, user.user_id, account_type)
        conn.commit()
        return {"accountId": account.account_id, "accountType": account.account_type, "balance": account.balance}
    finally:
        conn.close()

def get_account(account_id):
    conn = get_db()
    try:
        account = account_repo.get_account_by_id(conn, account_id)
        if not account:
            return None
        user = user_repo.get_user_by_id(conn, account.user_id)
        return {
            "accountId": account.account_id,
            "userName": user.name,
            "balance": account.balance,
            "accountType": account.account_type
        }
    finally:
        conn.close()

def deposit(account_id, amount):
    if amount <= 0:
        raise ValueError("Deposit amount must be positive")
    conn = get_db()
    try:
        account = account_repo.get_account_by_id(conn, account_id)
        if not account:
            raise ValueError("Account not found")
        new_balance = account.balance + amount
        account_repo.update_balance(conn, account_id, new_balance)
        transaction_repo.add_transaction(conn, account_id, 'DEPOSIT', amount)
        conn.commit()
        return {"accountId": account_id, "balance": new_balance}
    finally:
        conn.close()

def withdraw(account_id, amount):
    if amount <= 0:
        raise ValueError("Withdrawal amount must be positive")
    conn = get_db()
    try:
        account = account_repo.get_account_by_id(conn, account_id)
        if not account:
            raise ValueError("Account not found")
        if account.balance < amount:
            raise ValueError("Insufficient funds")
        new_balance = account.balance - amount
        account_repo.update_balance(conn, account_id, new_balance)
        transaction_repo.add_transaction(conn, account_id, 'WITHDRAW', amount)
        conn.commit()
        return {"accountId": account_id, "balance": new_balance}
    finally:
        conn.close()

def get_transactions(account_id):
    conn = get_db()
    try:
        transactions = transaction_repo.get_transactions_by_account_id(conn, account_id)
        return [
            {
                "txnId": t.txn_id,
                "type": t.txn_type,
                "amount": t.amount,
                "date": t.created_at[:10]
            }
            for t in transactions
        ]
    finally:
        conn.close()
