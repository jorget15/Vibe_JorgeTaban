''' routes.py — the HTTP layer. Maps URLs to service calls.

    RESPONSIBILITY OF THIS FILE:
      - Read data from the incoming request (URL params, JSON body)
      - Call the appropriate service function
      - Return a JSON response with the correct HTTP status code

    WHAT DOES NOT BELONG HERE:
      - Business logic (e.g. "is the balance sufficient?") → that's in services/
      - Database queries → that's in repositories/

    STATUS CODES USED:
      200 — OK (successful GET, deposit, withdraw, transfer, delete)
      201 — Created (successful POST /accounts)
      400 — Bad Request (validation error, business rule violation)
      401 — Unauthorized (wrong credentials)
      404 — Not Found (account or user doesn't exist)
'''
from flask import Blueprint, request, jsonify
import services.account_service as account_service

bp = Blueprint('api', __name__)

def parse_amount(data):
    ''' Extract and validate the `amount` field from a JSON request body.

    Why have this as a separate function?
      Three routes need the same validation. Without this helper, we'd copy
      the same try/except block in deposit, withdraw, and transfer.
      A single function keeps the logic in one place and the routes clean.

    Returns a float on success, raises ValueError on missing or non-numeric input.
    The ValueError is caught by the caller and returned as a 400 response. '''
    raw = data.get('amount')
    if raw is None:
        raise ValueError("amount is required")
    try:
        return float(raw)
    except (TypeError, ValueError):
        raise ValueError("amount must be a number")


@bp.route('/health', methods=['GET'])
def health():
    ''' Liveness check — confirms the Flask server is running.
    Useful during development: visit /api/health in the browser before
    testing other endpoints to confirm the server started correctly. '''
    return jsonify({"status": "ok"})


@bp.route('/login', methods=['POST'])
def login():
    ''' Authenticate a user.

    Expects JSON body: { email, password }
    Returns: { userId, name, email, isAdmin, accountId } on success

    The service layer handles all the credential checks. This route only
    decides which HTTP status code to return:
      200 — credentials are valid
      401 — Unauthorized (wrong password, no password set, or soft-deleted account)
    '''
    data = request.get_json()
    try:
        result = account_service.login(data['email'], data['password'])
        return jsonify(result)
    except ValueError as e:
        return jsonify({"error": str(e)}), 401


@bp.route('/accounts', methods=['POST'])
def new_account():
    ''' Create a new bank account (and a new user if the email doesn't exist yet).

    Expects JSON body: { name, email, accountType, password }
    Returns: { accountId, accountType, balance } on success (HTTP 201 Created)

    Why 201 instead of 200?
      200 means "OK, I did the thing you asked."
      201 means "I created a new resource." It's the semantically correct code
      for any POST that results in a new row being added to the database.
    '''
    data = request.get_json()
    try:
        result = account_service.create_account(
            data['name'], data['email'], data['accountType'], data.get('password')
        )
        return jsonify(result), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route('/accounts/lookup', methods=['GET'])
def lookup_account():
    ''' Look up a recipient by account number or email before a transfer.

    Query param: ?q=1  or  ?q=test@test.com
    Returns: { accountId, name, email } on success
             { error }                  on 400 (missing q) or 404 (not found)

    Used by the send flow so the user can confirm the recipient
    before entering an amount and sending money.
    '''
    q = request.args.get('q', '').strip()
    if not q:
        return jsonify({"error": "query parameter q is required"}), 400
    try:
        result = account_service.lookup_recipient(q)
        return jsonify(result)
    except ValueError as e:
        return jsonify({"error": str(e)}), 404


@bp.route('/accounts/<int:account_id>', methods=['GET'])
def account_info(account_id):
    ''' Fetch account details by ID.

    The <int:account_id> syntax is Flask's URL converter — it extracts the
    integer from the URL path and passes it directly as a function argument.
    Flask automatically returns 404 if the segment isn't a valid integer.

    If the account owner has been soft-deleted, the service returns masked
    PII ("Deleted User", "deleted@deleted.com") instead of the real values.
    '''
    result = account_service.get_account(account_id)
    if not result:
        return jsonify({"error": "Account not found"}), 404
    return jsonify(result)


@bp.route('/accounts/<int:account_id>/deposit', methods=['POST'])
def make_deposit(account_id):
    ''' Deposit money into an account.

    Expects JSON body: { amount }
    Returns: { accountId, balance } — the updated balance after deposit.

    parse_amount() validates that amount is present and numeric before
    the service ever sees it, so the service only needs to check business
    rules (amount > 0, account exists).
    '''
    data = request.get_json()
    try:
        result = account_service.deposit(account_id, parse_amount(data))
        return jsonify(result)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route('/accounts/<int:account_id>/withdraw', methods=['POST'])
def make_withdrawal(account_id):
    ''' Withdraw money from an account.

    Expects JSON body: { amount }
    Returns: { accountId, balance } — the updated balance after withdrawal.

    Returns 400 if funds are insufficient — the service raises ValueError
    with "Insufficient funds" which this route passes back as JSON.
    '''
    data = request.get_json()
    try:
        result = account_service.withdraw(account_id, parse_amount(data))
        return jsonify(result)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route('/accounts/<int:account_id>/transfer', methods=['POST'])
def make_transfer(account_id):
    ''' Transfer money from one account to another.

    Expects JSON body: { recipientAccountId, amount }
    Returns: { accountId, balance } — the sender's updated balance.

    The service performs all four database writes (two balance updates +
    two transaction records) in a single atomic session. If anything fails,
    everything rolls back — money cannot disappear halfway through.
    '''
    data = request.get_json()
    try:
        result = account_service.transfer(
            account_id, data['recipientAccountId'], parse_amount(data)
        )
        return jsonify(result)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route('/accounts/<int:account_id>', methods=['DELETE'])
def delete_account(account_id):
    ''' Soft-delete the user who owns this account.

    Nothing is physically removed. The service sets is_deleted=True and
    records deleted_at on the user row. All financial history is preserved.

    After deletion:
      - GET /accounts/:id still works but returns masked PII
      - POST /login returns 401 "Account is deactivated"
      - GET /users (admin) still shows the real name and email
    '''
    try:
        result = account_service.delete_account(account_id)
        return jsonify(result)
    except ValueError as e:
        return jsonify({"error": str(e)}), 404


@bp.route('/users', methods=['GET'])
def all_users():
    ''' Admin endpoint — returns every user with real PII and account summaries.

    Unlike GET /accounts/:id (which masks deleted users), this endpoint
    always returns real names, emails, and deletion status so admins can
    identify and audit any account.

    In a production app this would require an admin auth token. For now
    the route is unprotected — authentication is handled at the frontend
    level via AdminRoute.
    '''
    result = account_service.get_all_users()
    return jsonify(result)


@bp.route('/users/<int:user_id>/accounts', methods=['GET'])
def user_accounts(user_id):
    ''' Return all accounts belonging to a user.

    Used by the accounts overview screen so the user can see and switch
    between their checking and savings accounts.
    '''
    try:
        result = account_service.get_user_accounts(user_id)
        return jsonify(result)
    except ValueError as e:
        return jsonify({"error": str(e)}), 404


@bp.route('/users/<int:user_id>/accounts', methods=['POST'])
def add_user_account(user_id):
    ''' Open a new account for an existing user.

    Expects JSON body: { accountType }
    Returns: { accountId, accountType, balance } on success (HTTP 201 Created)
    '''
    data = request.get_json()
    try:
        result = account_service.add_account_to_user(user_id, data['accountType'])
        return jsonify(result), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route('/accounts/<int:account_id>/transactions', methods=['GET'])
def transactions(account_id):
    ''' Return the full transaction history for an account.

    Returns a list of { txnId, type, amount, description, date } objects
    in reverse-chronological order (most recent first).

    Transaction types: DEPOSIT, WITHDRAW, TRANSFER_OUT, TRANSFER_IN
    Transfer entries cross-reference each other via the description field.
    '''
    result = account_service.get_transactions(account_id)
    return jsonify(result)
