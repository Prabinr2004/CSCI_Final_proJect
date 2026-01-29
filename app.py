"""
AI Fan Engagement Agent - Flask Application
Main entry point for the web application.
"""

import os
from flask import Flask, request, jsonify, render_template, session
from flask_cors import CORS
from dotenv import load_dotenv

from backend.database import Database
from backend.agent import FanEngagementAgent

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
CORS(app)

# Initialize database and agent
db = Database(os.getenv("DATABASE_PATH", "data/fan_engagement.db"))
agent = FanEngagementAgent(db)


def get_current_user():
    """Get or create current user from session."""
    username = session.get("username")
    if not username:
        username = f"Fan_{os.urandom(4).hex()}"
        session["username"] = username
    return db.get_or_create_user(username)


# Routes
@app.route("/")
def index():
    """Render main page."""
    return render_template("index.html")


@app.route("/api/user", methods=["GET"])
def get_user():
    """Get current user info."""
    user = get_current_user()
    stats = db.get_user_stats(user["id"])
    return jsonify({
        "success": True,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "points": user["points"],
            "badges": user["badges"],
            "favorite_team": user.get("favorite_team")
        },
        "stats": stats
    })


@app.route("/api/user/login", methods=["POST"])
def login():
    """Set username for the session."""
    data = request.get_json()
    username = data.get("username", "").strip()

    if not username:
        return jsonify({"success": False, "error": "Username required"}), 400

    session["username"] = username
    user = db.get_or_create_user(username)

    return jsonify({
        "success": True,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "points": user["points"],
            "badges": user["badges"]
        }
    })


@app.route("/api/user/favorite-team", methods=["POST"])
def set_favorite_team():
    """Set user's favorite team."""
    user = get_current_user()
    data = request.get_json()
    team = data.get("team", "").strip()

    if not team:
        return jsonify({"success": False, "error": "Team name required"}), 400

    updated_user = db.update_user(user["id"], favorite_team=team)
    return jsonify({"success": True, "user": updated_user})


@app.route("/api/chat", methods=["POST"])
def chat():
    """Process chat message."""
    user = get_current_user()
    data = request.get_json()
    message = data.get("message", "").strip()

    if not message:
        return jsonify({"success": False, "error": "Message required"}), 400

    result = agent.process_message(user["id"], message)

    return jsonify({
        "success": True,
        "response": result["response"],
        "tool_used": result.get("tool_used"),
        "tool_result": result.get("tool_result")
    })


@app.route("/api/quiz/generate", methods=["POST"])
def generate_quiz():
    """Generate a quiz."""
    user = get_current_user()
    data = request.get_json()

    team = data.get("team", user.get("favorite_team", "Lakers"))
    difficulty = data.get("difficulty", "medium")
    num_questions = data.get("num_questions", 5)

    result = agent.quiz_tool.execute(team, difficulty, num_questions)

    if result.get("success"):
        # Store quiz in session for grading
        session["current_quiz"] = result.get("data")

    return jsonify(result)


@app.route("/api/quiz/submit", methods=["POST"])
def submit_quiz():
    """Submit quiz answers."""
    user = get_current_user()
    data = request.get_json()

    quiz_data = session.get("current_quiz") or data.get("quiz_data")
    answers = data.get("answers", {})

    if not quiz_data:
        return jsonify({"success": False, "error": "No active quiz"}), 400

    result = agent.submit_quiz_answers(user["id"], quiz_data, answers)

    # Clear current quiz
    session.pop("current_quiz", None)

    return jsonify({"success": True, **result})


@app.route("/api/prediction", methods=["POST"])
def get_prediction():
    """Get a match prediction."""
    data = request.get_json()

    team1 = data.get("team1", "").strip()
    team2 = data.get("team2", "").strip()
    match_type = data.get("match_type", "regular")

    if not team1 or not team2:
        return jsonify({"success": False, "error": "Both teams required"}), 400

    result = agent.prediction_tool.execute(team1, team2, match_type)
    return jsonify(result)


@app.route("/api/prediction/save", methods=["POST"])
def save_prediction():
    """Save user's prediction pick."""
    user = get_current_user()
    data = request.get_json()

    team1 = data.get("team1", "").strip()
    team2 = data.get("team2", "").strip()
    user_pick = data.get("user_pick", "").strip()
    match_type = data.get("match_type", "regular")

    if not all([team1, team2, user_pick]):
        return jsonify({"success": False, "error": "All fields required"}), 400

    result = agent.make_prediction(user["id"], team1, team2, user_pick, match_type)
    return jsonify({"success": True, **result})


@app.route("/api/leaderboard", methods=["GET"])
def get_leaderboard():
    """Get the leaderboard."""
    user = get_current_user()
    limit = request.args.get("limit", 10, type=int)

    result = agent.reward_tool.execute(
        action="get_leaderboard",
        user_id=user["id"],
        limit=limit
    )
    return jsonify(result)


@app.route("/api/rewards", methods=["GET"])
def get_rewards():
    """Get user's rewards and stats."""
    user = get_current_user()

    result = agent.reward_tool.execute(
        action="get_user_rewards",
        user_id=user["id"]
    )
    return jsonify(result)


@app.route("/api/history/quizzes", methods=["GET"])
def get_quiz_history():
    """Get user's quiz history."""
    user = get_current_user()
    limit = request.args.get("limit", 10, type=int)

    history = db.get_user_quiz_history(user["id"], limit)
    return jsonify({"success": True, "history": history})


@app.route("/api/history/predictions", methods=["GET"])
def get_prediction_history():
    """Get user's prediction history."""
    user = get_current_user()
    limit = request.args.get("limit", 10, type=int)

    history = db.get_user_predictions(user["id"], limit)
    return jsonify({"success": True, "history": history})


@app.route("/api/history/chat", methods=["GET"])
def get_chat_history():
    """Get user's chat history."""
    user = get_current_user()
    limit = request.args.get("limit", 20, type=int)

    history = db.get_chat_history(user["id"], limit)
    return jsonify({"success": True, "history": history})


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "true").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug)
