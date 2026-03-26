# Data access for the transactions collection — MongoDB via PyMongo.
from datetime import datetime, timezone
from pymongo import ReturnDocument, DESCENDING
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


class TransactionRepo:
    def __init__(self):
        self._db = get_mongo_db()

    def add_transaction(self, account_id, txn_type, amount, description=None, mongo_session=None):
        # mongo_session is passed when this write is part of a transfer —
        # all 4 writes (2 balance updates + 2 transaction records) must commit
        # together or not at all. For standalone deposit/withdraw it stays None.
        txn_id = _next_id(self._db, "transactions")
        doc = {
            "txn_id":      txn_id,
            "account_id":  account_id,
            "txn_type":    txn_type,
            "amount":      amount,
            "description": description,
            "created_at":  datetime.now(timezone.utc),
        }
        self._db.transactions.insert_one(doc, session=mongo_session)
        return doc

    def count_by_account_ids(self, account_ids):
        # Count all transactions across a list of account IDs.
        # $in is MongoDB's equivalent of SQL's WHERE account_id IN (1, 2, 3).
        # Used by the admin view to show total transaction activity per user.
        if not account_ids:
            return 0
        return self._db.transactions.count_documents(
            {"account_id": {"$in": account_ids}}
        )

    def get_transactions_by_account_id(self, account_id):
        # sort() with DESCENDING on created_at gives most-recent-first order.
        # In SQLAlchemy we relied on insertion order — here we make it explicit.
        return list(
            self._db.transactions.find(
                {"account_id": account_id}
            ).sort("created_at", DESCENDING)
        )
