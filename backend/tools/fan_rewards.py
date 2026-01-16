"""
Fan Reward Tracker Tool
Tracks user points, badges, and leaderboard rankings.
This tool does not call the LLM - it manages user reward data directly.
"""

from typing import Optional
from backend.database import Database


class FanRewardTrackerTool:
    """
    MCP Tool for tracking fan rewards, points, and achievements.
    Updates stored user data without calling the LLM.
    """

    name = "fan_reward_tracker"
    description = "Track user points, badges, and leaderboard rankings based on quiz and prediction performance"

    # Badge definitions
    BADGES = {
        "quiz_rookie": {
            "name": "Quiz Rookie",
            "description": "Complete your first quiz",
            "icon": "star"
        },
        "quiz_master": {
            "name": "Quiz Master",
            "description": "Get a perfect score on any quiz",
            "icon": "trophy"
        },
        "prediction_pro": {
            "name": "Prediction Pro",
            "description": "Make 5 predictions",
            "icon": "crystal-ball"
        },
        "streak_starter": {
            "name": "Streak Starter",
            "description": "Get 3 correct answers in a row",
            "icon": "fire"
        },
        "team_expert": {
            "name": "Team Expert",
            "description": "Complete 5 quizzes about the same team",
            "icon": "medal"
        },
        "point_collector": {
            "name": "Point Collector",
            "description": "Earn 100 points",
            "icon": "coins"
        },
        "super_fan": {
            "name": "Super Fan",
            "description": "Earn 500 points",
            "icon": "crown"
        },
        "legend": {
            "name": "Legend",
            "description": "Earn 1000 points",
            "icon": "gem"
        }
    }

    # Point values
    POINTS = {
        "quiz_correct": 10,
        "quiz_completion": 5,
        "perfect_quiz": 50,
        "prediction_made": 5,
        "prediction_correct": 25
    }

    def __init__(self, db: Optional[Database] = None):
        self.db = db or Database()

    def execute(self, action: str, user_id: int, **kwargs) -> dict:
        """
        Execute a reward tracking action.

        Args:
            action: The action to perform (award_quiz_points, award_prediction_points,
                   check_badges, get_leaderboard, get_user_rewards)
            user_id: User ID
            **kwargs: Additional parameters based on action

        Returns:
            Dictionary with action results
        """
        actions = {
            "award_quiz_points": self._award_quiz_points,
            "award_prediction_points": self._award_prediction_points,
            "check_badges": self._check_and_award_badges,
            "get_leaderboard": self._get_leaderboard,
            "get_user_rewards": self._get_user_rewards,
            "get_stats": self._get_user_stats
        }

        if action not in actions:
            return {
                "success": False,
                "error": f"Unknown action: {action}. Valid actions: {list(actions.keys())}"
            }

        return actions[action](user_id, **kwargs)

    def _award_quiz_points(self, user_id: int, score: int = 0,
                          total: int = 0, team: str = "", **kwargs) -> dict:
        """Award points for quiz completion."""
        points = 0

        # Points for correct answers
        points += score * self.POINTS["quiz_correct"]

        # Completion bonus
        points += self.POINTS["quiz_completion"]

        # Perfect score bonus
        if score == total and total > 0:
            points += self.POINTS["perfect_quiz"]

        # Update user points
        user = self.db.add_points(user_id, points)

        # Check for new badges
        new_badges = self._check_quiz_badges(user_id, score, total, team)

        return {
            "success": True,
            "action": "award_quiz_points",
            "points_earned": points,
            "breakdown": {
                "correct_answers": score * self.POINTS["quiz_correct"],
                "completion_bonus": self.POINTS["quiz_completion"],
                "perfect_bonus": self.POINTS["perfect_quiz"] if score == total and total > 0 else 0
            },
            "total_points": user["points"],
            "new_badges": new_badges
        }

    def _award_prediction_points(self, user_id: int, is_correct: bool = False, **kwargs) -> dict:
        """Award points for predictions."""
        points = self.POINTS["prediction_made"]

        if is_correct:
            points += self.POINTS["prediction_correct"]

        user = self.db.add_points(user_id, points)

        # Check for prediction badges
        new_badges = self._check_prediction_badges(user_id)

        return {
            "success": True,
            "action": "award_prediction_points",
            "points_earned": points,
            "prediction_correct": is_correct,
            "total_points": user["points"],
            "new_badges": new_badges
        }

    def _check_quiz_badges(self, user_id: int, score: int, total: int, team: str) -> list:
        """Check and award quiz-related badges."""
        new_badges = []
        user = self.db.get_user_by_id(user_id)
        current_badges = user.get("badges", [])

        # Quiz Rookie - first quiz
        quiz_history = self.db.get_user_quiz_history(user_id)
        if len(quiz_history) >= 1 and "quiz_rookie" not in current_badges:
            self.db.add_badge(user_id, "quiz_rookie")
            new_badges.append(self.BADGES["quiz_rookie"])

        # Quiz Master - perfect score
        if score == total and total > 0 and "quiz_master" not in current_badges:
            self.db.add_badge(user_id, "quiz_master")
            new_badges.append(self.BADGES["quiz_master"])

        # Team Expert - 5 quizzes same team
        if team:
            team_quizzes = [q for q in quiz_history if q["team"].lower() == team.lower()]
            if len(team_quizzes) >= 5 and "team_expert" not in current_badges:
                self.db.add_badge(user_id, "team_expert")
                new_badges.append(self.BADGES["team_expert"])

        # Point milestones
        new_badges.extend(self._check_point_badges(user_id))

        return new_badges

    def _check_prediction_badges(self, user_id: int) -> list:
        """Check and award prediction-related badges."""
        new_badges = []
        user = self.db.get_user_by_id(user_id)
        current_badges = user.get("badges", [])

        predictions = self.db.get_user_predictions(user_id, limit=100)

        # Prediction Pro - 5 predictions
        if len(predictions) >= 5 and "prediction_pro" not in current_badges:
            self.db.add_badge(user_id, "prediction_pro")
            new_badges.append(self.BADGES["prediction_pro"])

        # Point milestones
        new_badges.extend(self._check_point_badges(user_id))

        return new_badges

    def _check_point_badges(self, user_id: int) -> list:
        """Check and award point milestone badges."""
        new_badges = []
        user = self.db.get_user_by_id(user_id)
        current_badges = user.get("badges", [])
        points = user.get("points", 0)

        point_badges = [
            (100, "point_collector"),
            (500, "super_fan"),
            (1000, "legend")
        ]

        for threshold, badge_id in point_badges:
            if points >= threshold and badge_id not in current_badges:
                self.db.add_badge(user_id, badge_id)
                new_badges.append(self.BADGES[badge_id])

        return new_badges

    def _check_and_award_badges(self, user_id: int, **kwargs) -> dict:
        """Check all badge conditions and award any earned badges."""
        user = self.db.get_user_by_id(user_id)
        current_badges = user.get("badges", [])

        all_new_badges = []
        all_new_badges.extend(self._check_point_badges(user_id))

        # Get updated user
        user = self.db.get_user_by_id(user_id)

        return {
            "success": True,
            "action": "check_badges",
            "current_badges": [self.BADGES.get(b, {"name": b}) for b in user["badges"]],
            "new_badges": all_new_badges,
            "available_badges": list(self.BADGES.values())
        }

    def _get_leaderboard(self, user_id: int, limit: int = 10, **kwargs) -> dict:
        """Get the leaderboard."""
        leaderboard = self.db.get_leaderboard(limit)

        # Find user's rank
        user = self.db.get_user_by_id(user_id)
        user_rank = None
        for i, entry in enumerate(leaderboard):
            if entry["id"] == user_id:
                user_rank = i + 1
                break

        return {
            "success": True,
            "action": "get_leaderboard",
            "leaderboard": [
                {
                    "rank": i + 1,
                    "username": entry["username"],
                    "points": entry["points"],
                    "badges_count": len(entry["badges"]),
                    "is_current_user": entry["id"] == user_id
                }
                for i, entry in enumerate(leaderboard)
            ],
            "user_rank": user_rank,
            "total_users": len(leaderboard)
        }

    def _get_user_rewards(self, user_id: int, **kwargs) -> dict:
        """Get user's complete reward profile."""
        user = self.db.get_user_by_id(user_id)
        if not user:
            return {"success": False, "error": "User not found"}

        stats = self.db.get_user_stats(user_id)
        leaderboard = self.db.get_leaderboard(100)

        # Find rank
        user_rank = None
        for i, entry in enumerate(leaderboard):
            if entry["id"] == user_id:
                user_rank = i + 1
                break

        return {
            "success": True,
            "action": "get_user_rewards",
            "user": {
                "username": user["username"],
                "points": user["points"],
                "badges": [self.BADGES.get(b, {"name": b}) for b in user["badges"]],
                "rank": user_rank,
                "favorite_team": user.get("favorite_team")
            },
            "stats": stats,
            "next_badge": self._get_next_badge(user)
        }

    def _get_user_stats(self, user_id: int, **kwargs) -> dict:
        """Get detailed user statistics."""
        stats = self.db.get_user_stats(user_id)
        user = self.db.get_user_by_id(user_id)

        return {
            "success": True,
            "action": "get_stats",
            "user": user["username"],
            "points": user["points"],
            "stats": stats
        }

    def _get_next_badge(self, user: dict) -> Optional[dict]:
        """Determine the next achievable badge for the user."""
        current_badges = user.get("badges", [])
        points = user.get("points", 0)

        # Check point badges first
        if points < 100 and "point_collector" not in current_badges:
            return {
                **self.BADGES["point_collector"],
                "progress": f"{points}/100 points"
            }
        if points < 500 and "super_fan" not in current_badges:
            return {
                **self.BADGES["super_fan"],
                "progress": f"{points}/500 points"
            }
        if points < 1000 and "legend" not in current_badges:
            return {
                **self.BADGES["legend"],
                "progress": f"{points}/1000 points"
            }

        # Check other badges
        if "quiz_rookie" not in current_badges:
            return {**self.BADGES["quiz_rookie"], "progress": "Complete 1 quiz"}
        if "prediction_pro" not in current_badges:
            return {**self.BADGES["prediction_pro"], "progress": "Make 5 predictions"}

        return None

    def get_schema(self) -> dict:
        """Return the tool schema for agent registration."""
        return {
            "name": self.name,
            "description": self.description,
            "parameters": {
                "type": "object",
                "properties": {
                    "action": {
                        "type": "string",
                        "enum": ["award_quiz_points", "award_prediction_points",
                                "check_badges", "get_leaderboard", "get_user_rewards", "get_stats"],
                        "description": "The reward action to perform"
                    },
                    "user_id": {
                        "type": "integer",
                        "description": "User ID"
                    },
                    "score": {
                        "type": "integer",
                        "description": "Quiz score (for award_quiz_points)"
                    },
                    "total": {
                        "type": "integer",
                        "description": "Total questions (for award_quiz_points)"
                    },
                    "team": {
                        "type": "string",
                        "description": "Team name (for award_quiz_points)"
                    },
                    "is_correct": {
                        "type": "boolean",
                        "description": "Whether prediction was correct (for award_prediction_points)"
                    }
                },
                "required": ["action", "user_id"]
            }
        }
