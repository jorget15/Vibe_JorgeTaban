# Bank App — Backend

A Flask REST API backed by a MySQL database, using SQLAlchemy ORM. The backend follows a strict three-layer architecture: routes handle HTTP, services enforce business rules, and repositories own all database access.

---

## Tech Stack

| Library | Role |
|---------|------|
| **Flask** | HTTP framework and route registration |
| **SQLAlchemy** | ORM — all DB reads and writes go through models, never raw SQL |
| **MySQL** | Primary database |
| **PyMySQL** | MySQL driver for SQLAlchemy |

---

## Project Structure

```
backend/
├── app.py                  # Entry point — creates Flask app, registers blueprint
├── routes.py               # HTTP layer — maps endpoints to service calls
├── db/
│   └── database.py         # SQLAlchemy engine, Base, and get_db() session factory
├── models/
│   ├── user.py             # ORM model for the users table
│   ├── account.py          # ORM model for the accounts table
│   └── transaction.py      # ORM model for the transactions table
├── repositories/
│   ├── user_repo.py        # All DB access for users
│   ├── account_repo.py     # All DB access for accounts
│   └── transaction_repo.py # All DB access for transactions
└── services/
    └── account_service.py  # Business logic and transaction coordination
```

---

## Architecture

### Three-Layer Design

**Routes (`routes.py`)** — HTTP only. Reads request data, calls the service, returns JSON with the correct status code. Contains no business logic and no database access.

**Services (`account_service.py`)** — Business rules. Validates inputs, checks account existence, enforces constraints (e.g. positive amounts, sufficient funds). Opens a session, coordinates across multiple repos, and either commits or rolls back as a unit.

**Repositories (`*_repo.py`)** — Database only. Each method receives a session from the service layer so multiple repo calls can share one transaction. No SQL exists anywhere outside these files.

### Session Pattern

Every service function follows the same pattern:

```python
session = get_db()
try:
    # ... repo calls ...
    session.commit()
    return result
except:
    session.rollback()
    raise
finally:
    session.close()
```

This guarantees atomicity: if anything fails mid-operation, the entire change is rolled back and nothing is partially written.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Server liveness check |
| `POST` | `/api/accounts` | Create a new account (and user if needed) |
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

Accounts and users are never physically removed from the database. When a deletion is requested, only an `is_deleted` flag is flipped on the `users` table and a `deleted_at` timestamp is recorded. All rows — user, account, and every transaction — remain intact.

**Why:** Financial records must be preserved for auditing. Deleting transaction rows would create gaps in the ledger that are impossible to explain or reconcile after the fact.

**Role-based data masking:** Regular endpoints (e.g. `GET /accounts/<id>`) check `is_deleted` and return masked values (`"Deleted User"`, `"deleted@deleted.com"`) to protect the deleted user's PII. The admin endpoint (`GET /users`) always returns the real name and email so administrators can identify who the account belonged to.

**No cascading needed:** Because no rows are ever removed, foreign key relationships remain valid indefinitely. There is no need to configure cascade rules or manually delete child records before a parent.

### Money Transfers (Atomic)

A transfer involves four writes: two balance updates and two transaction records (one `TRANSFER_OUT` on the sender, one `TRANSFER_IN` on the recipient). All four happen inside a single SQLAlchemy session.

If any step fails — for example the recipient account doesn't exist or the database rejects a write — the entire session is rolled back. Money cannot disappear halfway through a transfer.

### Transaction History

Every deposit, withdrawal, and transfer leg is recorded in the `transactions` table with a type (`DEPOSIT`, `WITHDRAW`, `TRANSFER_OUT`, `TRANSFER_IN`), amount, and an optional human-readable description. Transfer records cross-reference each other:

- Sender gets: `TRANSFER_OUT — "Transfer to account #42"`
- Recipient gets: `TRANSFER_IN — "Transfer from account #7"`

### Password Hashing

Passwords are never stored in plain text. On registration, the password is run through a one-way hashing function (Werkzeug's `generate_password_hash`) before being saved to the database. The result looks like:

```
scrypt:32768:8:1$abc123$a8f3c2d1e4...
```

On login, the submitted password is hashed and compared against the stored hash using `check_password_hash`. Since hashing is a one-way operation, the original password cannot be recovered from the hash — even if someone gained direct access to the database.

```python
from werkzeug.security import generate_password_hash, check_password_hash

# Register
password_hash = generate_password_hash("mypassword123")

# Login
check_password_hash(password_hash, "mypassword123")  # True
check_password_hash(password_hash, "wrongpassword")  # False
```

`password_hash` is nullable to allow existing users created via Postman (without a password) to coexist with new users registered through the frontend.

### User-Account Relationship

A user can own multiple accounts. When `POST /accounts` is called, the service checks whether a user with that email already exists before creating a new one — preventing duplicate user rows for the same person.

---

## Running Locally

```bash
cd bank_app/backend
pip install -r requirements.txt
python app.py      # starts at http://127.0.0.1:5000
```

Visit `http://127.0.0.1:5000/api/health` to confirm the server is up.

---

## Database Setup

SQLAlchemy's `create_all()` creates tables that don't exist yet but **will not alter existing tables**. If you add a column to a model after the table already exists in MySQL, run the `ALTER TABLE` statement manually:

```sql
-- Add soft-delete columns to users
ALTER TABLE users ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP NULL;

-- Add auth columns to users
ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Add description column to transactions
ALTER TABLE transactions ADD COLUMN description VARCHAR(100) NULL;

-- Enforce account type as an enum (prevents invalid values at the database level)
ALTER TABLE accounts MODIFY COLUMN account_type ENUM('CHECKING', 'SAVINGS') NOT NULL;
```

### Backfilling passwords for existing users

Users created via Postman before the password system existed will have `password_hash = NULL` and cannot log in. To fix this, generate a hash manually and update the row directly in MySQL — this is equivalent to what the app does automatically on registration.

**Step 1 — generate the hash** (activate the venv first):

```bash
.venv\Scripts\activate
python -c "from werkzeug.security import generate_password_hash; print(generate_password_hash('yourpassword'))"
```

**Step 2 — paste the full output into MySQL** (copy the entire `scrypt:...` string including the prefix):

```sql
UPDATE users SET password_hash = '<paste full hash here>' WHERE email = 'user@example.com';
```

Any user created going forward through `POST /accounts` with a `password` field will have a hash stored automatically.
