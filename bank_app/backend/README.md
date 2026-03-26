# Bank App — Backend

A Flask REST API backed by MongoDB Atlas, using PyMongo. The backend follows a strict three-layer architecture: routes handle HTTP, services enforce business rules, and repositories own all database access.

---

## Tech Stack

| Library | Role |
|---------|------|
| **Flask** | HTTP framework and route registration |
| **PyMongo** | MongoDB driver — all DB reads and writes go through repositories |
| **MongoDB Atlas** | Primary database (cloud-hosted) |
| **python-dotenv** | Loads credentials from `.env` so they stay out of version control |
| **Werkzeug** | Password hashing (`generate_password_hash` / `check_password_hash`) |

---

## Project Structure

```
backend/
├── run.py                  # Entry point — creates Flask app, registers blueprint
├── routes.py               # HTTP layer — maps endpoints to service calls
├── .env                    # Local credentials — never committed (see .gitignore)
├── .env.example            # Template — copy to .env and fill in your values
├── db/
│   └── database.py         # MongoClient setup and get_mongo_db() factory
├── repositories/
│   ├── user_repo.py        # All DB access for the users collection
│   ├── account_repo.py     # All DB access for the accounts collection
│   └── transaction_repo.py # All DB access for the transactions collection
└── services/
    └── account_service.py  # Business logic and atomic operation coordination
```

---

## Environment Variables

Credentials are stored in a `.env` file that is **never committed to git**.

**Step 1** — copy the example file:
```bash
cp .env.example .env
```

**Step 2** — open `.env` and fill in your Atlas connection string:
```
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>
```

The app will raise a clear error on startup if `MONGO_URI` is missing, so you know immediately if the setup is incomplete.

---

## Architecture

### Three-Layer Design

**Routes (`routes.py`)** — HTTP only. Reads request data, calls the service, returns JSON with the correct status code. Contains no business logic and no database access.

**Services (`account_service.py`)** — Business rules. Validates inputs, checks account existence, enforces constraints (e.g. positive amounts, sufficient funds). Coordinates across multiple repositories and manages atomicity for multi-step operations.

**Repositories (`*_repo.py`)** — Database only. Each repository gets the MongoDB database handle in its `__init__` and exposes clean methods for the service layer to call. No query logic exists anywhere outside these files.

### Atomicity with MongoDB Transactions

For operations that require multiple writes to succeed or fail together (like a money transfer), we use MongoDB multi-document transactions via `mongo_client.start_session()`:

```python
with mongo_client.start_session() as session:
    with session.start_transaction():
        # all writes here are atomic
        # if anything raises, the entire transaction is rolled back
```

This requires a MongoDB **replica set** or **Atlas** cluster (standalone instances do not support multi-document transactions).

### Integer IDs

MongoDB generates a random `ObjectId` as `_id` by default. This app keeps integer IDs (`user_id`, `account_id`) to avoid changing the frontend, routes, and API contract. A `counters` collection tracks the last-used integer per collection and is incremented atomically using `find_one_and_update` with `$inc`.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Server liveness check |
| `POST` | `/api/login` | Authenticate a user |
| `POST` | `/api/accounts` | Create a new account (and user if needed) |
| `GET` | `/api/accounts/lookup` | Look up a recipient by account number or email |
| `GET` | `/api/accounts/<id>` | Get account details and balance |
| `POST` | `/api/accounts/<id>/deposit` | Deposit money |
| `POST` | `/api/accounts/<id>/withdraw` | Withdraw money |
| `POST` | `/api/accounts/<id>/transfer` | Transfer money to another account |
| `DELETE` | `/api/accounts/<id>` | Soft-delete the account owner |
| `GET` | `/api/users` | Admin: get all users with real PII and account info |
| `GET` | `/api/accounts/<id>/transactions` | Get transaction history for an account |

---

## Key Design Decisions

### Soft Delete

Accounts and users are never physically removed. When a deletion is requested, an `is_deleted` flag is set and a `deleted_at` timestamp is recorded on the user document. All documents — user, account, and every transaction — remain intact.

**Why:** Financial records must be preserved for auditing. Removing documents would create gaps in the ledger.

**Role-based data masking:** Regular endpoints return masked values (`"Deleted User"`, `"deleted@deleted.com"`) for deleted accounts. The admin endpoint always returns the real name and email.

### Money Transfers (Atomic)

A transfer involves four writes: two balance updates and two transaction records. All four happen inside a single MongoDB transaction. If any step fails, the entire transaction is rolled back — money cannot disappear halfway through.

### Transaction History

Every deposit, withdrawal, and transfer leg is recorded in the `transactions` collection with a type (`DEPOSIT`, `WITHDRAW`, `TRANSFER_OUT`, `TRANSFER_IN`), amount, and a human-readable description:

- Sender sees: `TRANSFER_OUT — "Transfer to Jane Doe (account #3)"`
- Recipient sees: `TRANSFER_IN — "Transfer from John Smith (account #7)"`

### Password Hashing

Passwords are never stored in plain text. On registration, the password is run through Werkzeug's `generate_password_hash` before being saved. On login, `check_password_hash` compares the submitted password against the stored hash. The original password cannot be recovered from the hash.

---

## Running Locally

```bash
cd bank_app/backend
cp .env.example .env        # then fill in MONGO_URI
uv sync                     # install dependencies
python run.py               # starts at http://127.0.0.1:5000
```

Visit `http://127.0.0.1:5000/api/health` to confirm the server is up.
