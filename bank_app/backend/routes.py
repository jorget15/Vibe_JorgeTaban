''' Controller — maps HTTP requests to AccountService methods.
    This file only handles HTTP concerns: reading request data, calling the service,
    and returning JSON responses with the correct status codes.
    No business logic or SQL lives here. '''
from flask import Blueprint, request, jsonify
import services.account_service as account_service

bp = Blueprint('api', __name__)

@bp.route('/health', methods=['GET'])
def health():
    # Quick check to confirm the server is running.
    # Visit http://127.0.0.1:5000/api/health in your browser to verify.
    return jsonify({"status": "ok"})

@bp.route('/accounts', methods=['POST'])
def new_account():
    # Create a new account. Expects JSON body: { name, email, accountType }
    # Returns the new account's ID, type, and starting balance (0).
    data = request.get_json()
    try:
        result = account_service.create_account(data['name'], data['email'], data['accountType'])
        return jsonify(result), 201  # 201 Created
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

@bp.route('/accounts/<int:account_id>', methods=['GET'])
def account_info(account_id):
    # Fetch account details by ID. Returns 404 if the account doesn't exist.
    result = account_service.get_account(account_id)
    if not result:
        return jsonify({"error": "Account not found"}), 404
    return jsonify(result)

@bp.route('/accounts/<int:account_id>/deposit', methods=['POST'])
def make_deposit(account_id):
    # Deposit money into an account. Expects JSON body: { amount }
    # Returns the updated balance.
    data = request.get_json()
    try:
        result = account_service.deposit(account_id, data['amount'])
        return jsonify(result)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

@bp.route('/accounts/<int:account_id>/withdraw', methods=['POST'])
def make_withdrawal(account_id):
    # Withdraw money from an account. Expects JSON body: { amount }
    # Returns the updated balance. Fails if funds are insufficient.
    data = request.get_json()
    try:
        result = account_service.withdraw(account_id, data['amount'])
        return jsonify(result)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

@bp.route('/accounts/<int:account_id>/transactions', methods=['GET'])
def transactions(account_id):
    # Return the full transaction history for an account as a JSON array.
    result = account_service.get_transactions(account_id)
    return jsonify(result)
