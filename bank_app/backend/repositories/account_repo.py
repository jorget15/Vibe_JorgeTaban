# Data access for the accounts collection — MongoDB via PyMongo.
#
# KEY DIFFERENCES from the old SQLAlchemy version:
#   - No `session` parameter for the connection — handle lives in __init__.
#   - update_balance no longer mutates an ORM object and waits for commit.
#     It fires an update_one() immediately with $set.
#   - Methods that can participate in a multi-document transaction accept an
#     optional `mongo_session` parameter. When None, the write is standalone.
#     When a MongoDB session is passed (from transfer()), the write is tagged
#     to that transaction and only becomes visible on commitTransaction.
from datetime import datetime, timezone
from pymongo import ReturnDocument
from db.database import get_mongo_db


def _next_id(db, collection_name):
    ''' See user_repo.py for full explanation of the counter pattern. '''
    result = db.counters.find_one_and_update(
        {"_id": collection_name},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER
    )
    return result["seq"]


class AccountRepo:
    def __init__(self):
        self._db = get_mongo_db()

    def add_account(self, user_id, account_type, mongo_session=None):
        # mongo_session is passed here when account creation is part of a
        # larger transaction. For standalone calls it stays None.
        account_id = _next_id(self._db, "accounts")
        doc = {
            "account_id":   account_id,
            "user_id":      user_id,
            "account_type": account_type,
            "balance":      0.0,
            "created_at":   datetime.now(timezone.utc),
        }
        self._db.accounts.insert_one(doc, session=mongo_session)
        return doc

    def get_account_by_id(self, account_id, mongo_session=None):
        # mongo_session is passed here when reading inside a transaction
        # so MongoDB returns a consistent snapshot of the data at that point,
        # not a version that another concurrent write may have changed.
        return self._db.accounts.find_one(
            {"account_id": account_id},
            session=mongo_session
        )

    def get_account_by_user_id(self, user_id):
        # Returns the first account belonging to a user.
        # Used after login to return the accountId to the frontend.
        return self._db.accounts.find_one({"user_id": user_id})

    def get_accounts_by_user_id(self, user_id):
        # Returns all accounts belonging to a user.
        # Used by the admin view to list every account a user owns.
        return list(self._db.accounts.find({"user_id": user_id}))

    def update_balance(self, account_id, new_balance, mongo_session=None):
        # $set only updates the balance field — all other fields are untouched.
        # When mongo_session is provided this write is held in the transaction
        # and rolled back automatically if anything raises before commitTransaction.
        self._db.accounts.update_one(
            {"account_id": account_id},
            {"$set": {"balance": new_balance}},
            session=mongo_session
        )
