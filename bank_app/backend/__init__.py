# Application factory — creates and configures the Flask app.
# Using a factory function (create_app) instead of a global app object
# makes the app easier to test and configure for different environments.
from flask import Flask
from flask_cors import CORS
from db.database import init_db

def create_app():
    app = Flask(__name__)

    # Allow requests from the React frontend (running on a different port).
    CORS(app)

    # Create the SQLite database file and tables if they don't exist yet.
    init_db()

    # Register all API routes under the /api prefix (e.g. /api/accounts).
    from routes import bp
    app.register_blueprint(bp, url_prefix='/api')

    return app
