"""
Database module for long-term memory storage.
Handles user profiles, quiz history, predictions, and rewards.
"""

import sqlite3
import json
import os
from datetime import datetime
from typing import Optional


class Database:
    def __init__(self, db_path: str = "data/fan_engagement.db"):
        self.db_path = db_path
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self._init_db()

    def _get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        """Initialize database tables."""
        conn = self._get_connection()
        cursor = conn.cursor()

        # Users table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                favorite_team TEXT,
                points INTEGER DEFAULT 0,
                badges TEXT DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Quiz history table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS quiz_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                team TEXT NOT NULL,
                difficulty TEXT NOT NULL,
                questions TEXT NOT NULL,
                score INTEGER NOT NULL,
                total_questions INTEGER NOT NULL,
                points_earned INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')

        # Predictions table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS predictions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                match_description TEXT NOT NULL,
                predicted_outcome TEXT NOT NULL,
                actual_outcome TEXT,
                is_correct INTEGER,
                points_earned INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')

        # Chat history table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS chat_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                tool_used TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')

        conn.commit()
        conn.close()

    # User operations
    def get_or_create_user(self, username: str) -> dict:
        """Get existing user or create new one."""
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
        user = cursor.fetchone()

        if user:
            # Update last active
            cursor.execute(
                "UPDATE users SET last_active = ? WHERE username = ?",
                (datetime.now(), username)
            )
            conn.commit()
            result = dict(user)
        else:
            cursor.execute(
                "INSERT INTO users (username) VALUES (?)",
                (username,)
            )
            conn.commit()
            cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
            result = dict(cursor.fetchone())

        conn.close()
        result['badges'] = json.loads(result['badges'])
        return result

    def get_user_by_id(self, user_id: int) -> Optional[dict]:
        """Get user by ID."""
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        conn.close()
        if user:
            result = dict(user)
            result['badges'] = json.loads(result['badges'])
            return result
        return None

    def update_user(self, user_id: int, **kwargs) -> dict:
        """Update user fields."""
        conn = self._get_connection()
        cursor = conn.cursor()

        if 'badges' in kwargs:
            kwargs['badges'] = json.dumps(kwargs['badges'])

        updates = ", ".join([f"{k} = ?" for k in kwargs.keys()])
        values = list(kwargs.values()) + [user_id]

        cursor.execute(f"UPDATE users SET {updates} WHERE id = ?", values)
        conn.commit()
        conn.close()

        return self.get_user_by_id(user_id)

    def add_points(self, user_id: int, points: int) -> dict:
        """Add points to user."""
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE users SET points = points + ? WHERE id = ?",
            (points, user_id)
        )
        conn.commit()
        conn.close()
        return self.get_user_by_id(user_id)

    def add_badge(self, user_id: int, badge: str) -> dict:
        """Add badge to user if not already earned."""
        user = self.get_user_by_id(user_id)
        badges = user['badges']
        if badge not in badges:
            badges.append(badge)
            return self.update_user(user_id, badges=badges)
        return user

    # Quiz operations
    def save_quiz_result(self, user_id: int, team: str, difficulty: str,
                         questions: list, score: int, points_earned: int) -> dict:
        """Save quiz result to history."""
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            INSERT INTO quiz_history
            (user_id, team, difficulty, questions, score, total_questions, points_earned)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (user_id, team, difficulty, json.dumps(questions), score,
              len(questions), points_earned))

        conn.commit()
        quiz_id = cursor.lastrowid
        cursor.execute("SELECT * FROM quiz_history WHERE id = ?", (quiz_id,))
        result = dict(cursor.fetchone())
        conn.close()

        result['questions'] = json.loads(result['questions'])
        return result

    def get_user_quiz_history(self, user_id: int, limit: int = 10) -> list:
        """Get user's quiz history."""
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM quiz_history
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        ''', (user_id, limit))
        results = [dict(row) for row in cursor.fetchall()]
        conn.close()

        for r in results:
            r['questions'] = json.loads(r['questions'])
        return results

    # Prediction operations
    def save_prediction(self, user_id: int, match_description: str,
                        predicted_outcome: str) -> dict:
        """Save a prediction."""
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            INSERT INTO predictions (user_id, match_description, predicted_outcome)
            VALUES (?, ?, ?)
        ''', (user_id, match_description, predicted_outcome))

        conn.commit()
        pred_id = cursor.lastrowid
        cursor.execute("SELECT * FROM predictions WHERE id = ?", (pred_id,))
        result = dict(cursor.fetchone())
        conn.close()
        return result

    def get_user_predictions(self, user_id: int, limit: int = 10) -> list:
        """Get user's predictions."""
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM predictions
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        ''', (user_id, limit))
        results = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return results

    # Chat history operations
    def save_chat_message(self, user_id: int, role: str, content: str,
                          tool_used: str = None) -> dict:
        """Save chat message to history."""
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            INSERT INTO chat_history (user_id, role, content, tool_used)
            VALUES (?, ?, ?, ?)
        ''', (user_id, role, content, tool_used))

        conn.commit()
        msg_id = cursor.lastrowid
        cursor.execute("SELECT * FROM chat_history WHERE id = ?", (msg_id,))
        result = dict(cursor.fetchone())
        conn.close()
        return result

    def get_chat_history(self, user_id: int, limit: int = 20) -> list:
        """Get recent chat history for context."""
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM chat_history
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        ''', (user_id, limit))
        results = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return list(reversed(results))

    # Leaderboard
    def get_leaderboard(self, limit: int = 10) -> list:
        """Get top users by points."""
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, username, points, badges, favorite_team
            FROM users
            ORDER BY points DESC
            LIMIT ?
        ''', (limit,))
        results = [dict(row) for row in cursor.fetchall()]
        conn.close()

        for r in results:
            r['badges'] = json.loads(r['badges'])
        return results

    # Statistics
    def get_user_stats(self, user_id: int) -> dict:
        """Get comprehensive user statistics."""
        conn = self._get_connection()
        cursor = conn.cursor()

        # Quiz stats
        cursor.execute('''
            SELECT
                COUNT(*) as total_quizzes,
                COALESCE(SUM(score), 0) as total_correct,
                COALESCE(SUM(total_questions), 0) as total_questions,
                COALESCE(AVG(CAST(score AS FLOAT) / total_questions * 100), 0) as avg_score
            FROM quiz_history WHERE user_id = ?
        ''', (user_id,))
        quiz_stats = dict(cursor.fetchone())

        # Prediction stats
        cursor.execute('''
            SELECT
                COUNT(*) as total_predictions,
                COALESCE(SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END), 0) as correct_predictions
            FROM predictions WHERE user_id = ?
        ''', (user_id,))
        pred_stats = dict(cursor.fetchone())

        conn.close()

        return {
            "quizzes": quiz_stats,
            "predictions": pred_stats
        }
