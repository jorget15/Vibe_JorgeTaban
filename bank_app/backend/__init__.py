# Application factory — creates and configures the Flask app.
# Using a factory function (create_app) instead of a global app object
# makes the app easier to test and configure for different environments.
from flask import Flask
from flask_cors import CORS

def create_app():
    app = Flask(__name__)

    # Allow requests from any origin, including the Vercel frontend.
    # supports_credentials=False + wildcard origins is the standard setup
    # for a public API. The explicit OPTIONS handling fixes preflight failures.
    CORS(app, origins="*", supports_credentials=False)

    # MongoDB connects automatically when db/database.py is imported —
    # no init_db() call needed (that was a SQLAlchemy concept).

    # Register all API routes under the /api prefix (e.g. /api/accounts).
    from routes import bp
    app.register_blueprint(bp, url_prefix='/api') # avoid circular import

    return app
