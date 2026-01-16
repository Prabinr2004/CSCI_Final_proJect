"""
AI Fan Engagement Agent
Main agent that orchestrates tool usage and conversation flow.
"""

import json
import os
import re
import requests
from typing import Optional

from backend.database import Database
from backend.tools import QuizGeneratorTool, PredictionEngineTool, FanRewardTrackerTool


class FanEngagementAgent:
    """
    AI Agent that handles user interactions and decides which tools to use.
    Uses OpenRouter API for LLM-powered decision making.
    """

    def __init__(self, db: Optional[Database] = None, api_key: Optional[str] = None):
        self.db = db or Database()
        self.api_key = api_key or os.getenv("OPENROUTER_API_KEY")
        self.api_url = "https://openrouter.ai/api/v1/chat/completions"

        # Initialize tools
        self.quiz_tool = QuizGeneratorTool(self.api_key)
        self.prediction_tool = PredictionEngineTool(self.api_key)
        self.reward_tool = FanRewardTrackerTool(self.db)

        # Tool registry
        self.tools = {
            "quiz_generator": self.quiz_tool,
            "prediction_engine": self.prediction_tool,
            "fan_reward_tracker": self.reward_tool
        }

    def process_message(self, user_id: int, message: str) -> dict:
        """
        Process a user message and generate a response.

        Args:
            user_id: The user's ID
            message: The user's message

        Returns:
            Dictionary with response and any tool results
        """
        # Get user context
        user = self.db.get_user_by_id(user_id)
        chat_history = self.db.get_chat_history(user_id, limit=10)

        # Save user message
        self.db.save_chat_message(user_id, "user", message)

        # Determine intent and execute appropriate action
        intent = self._determine_intent(message, user)

        if intent["tool"]:
            result = self._execute_tool(intent["tool"], intent["params"], user_id)
            response = self._format_tool_response(intent["tool"], result, message)
            tool_used = intent["tool"]
        else:
            response = self._generate_chat_response(message, user, chat_history)
            result = None
            tool_used = None

        # Save assistant response
        self.db.save_chat_message(user_id, "assistant", response, tool_used)

        return {
            "response": response,
            "tool_used": tool_used,
            "tool_result": result
        }

    def _determine_intent(self, message: str, user: dict) -> dict:
        """Determine the user's intent from their message."""
        message_lower = message.lower()

        # Quiz patterns
        quiz_patterns = [
            r"quiz\s*(?:me\s*)?(?:about|on)?\s*(?:the\s*)?(\w+)",
            r"trivia\s*(?:about|on)?\s*(?:the\s*)?(\w+)",
            r"test\s*(?:my\s*)?knowledge\s*(?:about|on)?\s*(?:the\s*)?(\w+)",
            r"questions?\s*about\s*(?:the\s*)?(\w+)",
            r"(?:start|take|give me)\s*(?:a\s*)?quiz"
        ]

        for pattern in quiz_patterns:
            match = re.search(pattern, message_lower)
            if match:
                team = match.group(1) if match.lastindex else user.get("favorite_team", "Lakers")
                difficulty = "medium"
                if "easy" in message_lower:
                    difficulty = "easy"
                elif "hard" in message_lower:
                    difficulty = "hard"
                num_questions = 5
                num_match = re.search(r"(\d+)\s*questions?", message_lower)
                if num_match:
                    num_questions = min(10, max(1, int(num_match.group(1))))

                return {
                    "tool": "quiz_generator",
                    "params": {
                        "team": team.capitalize(),
                        "difficulty": difficulty,
                        "num_questions": num_questions
                    }
                }

        # Prediction patterns
        prediction_patterns = [
            r"predict\s*(?:the\s*)?(?:outcome|result|winner|score)?\s*(?:of\s*)?(?:the\s*)?(\w+)\s*(?:vs?\.?|versus|against)\s*(?:the\s*)?(\w+)",
            r"who\s*(?:will|would|is going to)\s*win\s*(?:between\s*)?(?:the\s*)?(\w+)\s*(?:and|vs?\.?|versus)\s*(?:the\s*)?(\w+)",
            r"(\w+)\s*(?:vs?\.?|versus|against)\s*(\w+)\s*(?:prediction|who wins)",
        ]

        for pattern in prediction_patterns:
            match = re.search(pattern, message_lower)
            if match:
                team1 = match.group(1).capitalize()
                team2 = match.group(2).capitalize()
                match_type = "regular"
                if "playoff" in message_lower:
                    match_type = "playoff"
                elif "championship" in message_lower or "final" in message_lower:
                    match_type = "championship"

                return {
                    "tool": "prediction_engine",
                    "params": {
                        "team1": team1,
                        "team2": team2,
                        "match_type": match_type
                    }
                }

        # Leaderboard/rewards patterns
        reward_patterns = [
            (r"leaderboard|rankings?|top\s*(?:users?|fans?|players?)", "get_leaderboard"),
            (r"(?:my\s*)?(?:points?|score|rewards?|badges?|stats?|profile)", "get_user_rewards"),
            (r"how\s*(?:am\s*)?i\s*doing|my\s*progress", "get_user_rewards"),
        ]

        for pattern, action in reward_patterns:
            if re.search(pattern, message_lower):
                return {
                    "tool": "fan_reward_tracker",
                    "params": {
                        "action": action,
                        "user_id": user["id"]
                    }
                }

        # No specific tool needed - general chat
        return {"tool": None, "params": {}}

    def _execute_tool(self, tool_name: str, params: dict, user_id: int) -> dict:
        """Execute a tool with the given parameters."""
        tool = self.tools.get(tool_name)
        if not tool:
            return {"error": f"Unknown tool: {tool_name}"}

        if tool_name == "quiz_generator":
            return tool.execute(**params)
        elif tool_name == "prediction_engine":
            return tool.execute(**params)
        elif tool_name == "fan_reward_tracker":
            params["user_id"] = user_id
            return tool.execute(**params)

        return {"error": "Tool execution failed"}

    def _format_tool_response(self, tool_name: str, result: dict, original_message: str) -> str:
        """Format tool result into a user-friendly response."""
        if not result.get("success", False):
            return f"Sorry, I encountered an issue: {result.get('error', 'Unknown error')}"

        if tool_name == "quiz_generator":
            return self._format_quiz_response(result)
        elif tool_name == "prediction_engine":
            return self._format_prediction_response(result)
        elif tool_name == "fan_reward_tracker":
            return self._format_reward_response(result)

        return "I processed your request successfully!"

    def _format_quiz_response(self, result: dict) -> str:
        """Format quiz result for display."""
        data = result.get("data", {})
        team = data.get("team", "Unknown")
        difficulty = data.get("difficulty", "medium")
        questions = data.get("questions", [])

        response = f"Here's a {difficulty} quiz about the {team}!\n\n"

        for i, q in enumerate(questions, 1):
            response += f"**Question {i}:** {q['question']}\n"
            for opt in q.get("options", []):
                response += f"  {opt}\n"
            response += "\n"

        response += "Reply with your answers (e.g., '1-A, 2-B, 3-C') when you're ready!"

        return response

    def _format_prediction_response(self, result: dict) -> str:
        """Format prediction result for display."""
        match = result.get("match", "")
        prediction = result.get("prediction", {})

        response = f"**Prediction for {match}**\n\n"
        response += f"**Winner:** {prediction.get('winner', 'Unknown')}\n"
        response += f"**Confidence:** {prediction.get('confidence', 0) * 100:.0f}%\n"
        response += f"**Predicted Score:** {prediction.get('predicted_score', 'N/A')}\n\n"

        factors = prediction.get("key_factors", [])
        if factors:
            response += "**Key Factors:**\n"
            for factor in factors:
                response += f"  - {factor}\n"
            response += "\n"

        response += f"**Analysis:** {prediction.get('explanation', '')}"

        return response

    def _format_reward_response(self, result: dict) -> str:
        """Format reward/leaderboard result for display."""
        action = result.get("action", "")

        if action == "get_leaderboard":
            leaderboard = result.get("leaderboard", [])
            response = "**Fan Leaderboard**\n\n"
            for entry in leaderboard:
                rank = entry["rank"]
                marker = " (You)" if entry.get("is_current_user") else ""
                response += f"{rank}. {entry['username']}{marker} - {entry['points']} pts ({entry['badges_count']} badges)\n"
            return response

        elif action == "get_user_rewards":
            user = result.get("user", {})
            stats = result.get("stats", {})

            response = f"**Your Fan Profile**\n\n"
            response += f"**Username:** {user.get('username', 'Unknown')}\n"
            response += f"**Total Points:** {user.get('points', 0)}\n"
            response += f"**Rank:** #{user.get('rank', 'N/A')}\n\n"

            badges = user.get("badges", [])
            if badges:
                response += f"**Badges Earned ({len(badges)}):**\n"
                for badge in badges:
                    response += f"  - {badge.get('name', badge)}: {badge.get('description', '')}\n"
            else:
                response += "**Badges:** None yet - keep playing to earn badges!\n"

            response += f"\n**Quiz Stats:**\n"
            quiz_stats = stats.get("quizzes", {})
            response += f"  - Quizzes Completed: {quiz_stats.get('total_quizzes', 0)}\n"
            response += f"  - Total Correct: {quiz_stats.get('total_correct', 0)}\n"
            response += f"  - Average Score: {quiz_stats.get('avg_score', 0):.1f}%\n"

            response += f"\n**Prediction Stats:**\n"
            pred_stats = stats.get("predictions", {})
            response += f"  - Total Predictions: {pred_stats.get('total_predictions', 0)}\n"
            response += f"  - Correct Predictions: {pred_stats.get('correct_predictions', 0)}\n"

            next_badge = result.get("next_badge")
            if next_badge:
                response += f"\n**Next Badge:** {next_badge.get('name')} - {next_badge.get('progress', '')}"

            return response

        elif action == "award_quiz_points":
            response = f"**Quiz Complete!**\n\n"
            response += f"Points Earned: +{result.get('points_earned', 0)}\n"
            response += f"Total Points: {result.get('total_points', 0)}\n"

            new_badges = result.get("new_badges", [])
            if new_badges:
                response += f"\n**New Badges Unlocked!**\n"
                for badge in new_badges:
                    response += f"  - {badge.get('name')}: {badge.get('description')}\n"

            return response

        return "Reward information updated!"

    def _generate_chat_response(self, message: str, user: dict, chat_history: list) -> str:
        """Generate a general chat response when no tool is needed."""
        if not self.api_key:
            return self._generate_fallback_chat_response(message, user)

        # Build conversation context
        messages = [
            {
                "role": "system",
                "content": f"""You are a friendly AI sports fan engagement assistant. You help fans with:
1. Sports trivia quizzes (say "quiz me about [team]")
2. Match predictions (say "predict [team1] vs [team2]")
3. Tracking rewards and leaderboards (say "show my stats" or "leaderboard")

Current user: {user.get('username', 'Guest')}
Favorite team: {user.get('favorite_team', 'Not set')}
Points: {user.get('points', 0)}

Be enthusiastic about sports but keep responses concise. If the user seems to want a quiz, prediction, or to see their stats, guide them to use those features."""
            }
        ]

        # Add recent chat history
        for chat in chat_history[-5:]:
            messages.append({
                "role": chat["role"],
                "content": chat["content"]
            })

        messages.append({"role": "user", "content": message})

        try:
            response = requests.post(
                self.api_url,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:5000",
                    "X-Title": "AI Fan Engagement Agent"
                },
                json={
                    "model": "openai/gpt-3.5-turbo",
                    "messages": messages,
                    "temperature": 0.8,
                    "max_tokens": 300
                },
                timeout=30
            )

            if response.status_code == 200:
                result = response.json()
                return result['choices'][0]['message']['content']

        except Exception as e:
            pass

        return self._generate_fallback_chat_response(message, user)

    def _generate_fallback_chat_response(self, message: str, user: dict) -> str:
        """Generate a fallback response when API is unavailable."""
        message_lower = message.lower()

        greetings = ["hi", "hello", "hey", "greetings"]
        if any(g in message_lower for g in greetings):
            name = user.get("username", "fan")
            return f"Hey {name}! Welcome to the AI Fan Engagement Hub! I can help you with:\n\n- **Sports Quizzes**: Say 'quiz me about [team]'\n- **Match Predictions**: Say 'predict [team1] vs [team2]'\n- **Your Stats**: Say 'show my stats' or 'leaderboard'\n\nWhat would you like to do?"

        help_words = ["help", "what can you do", "features", "options"]
        if any(h in message_lower for h in help_words):
            return """Here's what I can help you with:

**Quiz Mode**: Test your knowledge about any sports team!
  - Try: "Quiz me about the Lakers"
  - Try: "Give me 5 hard questions about the Patriots"

**Predictions**: Get AI-powered match predictions!
  - Try: "Predict Lakers vs Celtics"
  - Try: "Who will win Chiefs vs Cowboys"

**Rewards & Stats**: Track your progress!
  - Try: "Show my stats"
  - Try: "Leaderboard"
  - Try: "My badges"

What would you like to try?"""

        # Default response
        return f"I'm here to make sports more fun! You can:\n\n1. Take a **quiz** - 'quiz me about [team]'\n2. Get a **prediction** - 'predict [team1] vs [team2]'\n3. Check your **stats** - 'show my stats'\n\nWhat sounds good?"

    def submit_quiz_answers(self, user_id: int, quiz_data: dict, answers: dict) -> dict:
        """
        Submit and grade quiz answers.

        Args:
            user_id: User ID
            quiz_data: The quiz questions
            answers: User's answers {question_id: answer}

        Returns:
            Graded results with points awarded
        """
        questions = quiz_data.get("questions", [])
        score = 0
        results = []

        for q in questions:
            q_id = str(q["id"])
            user_answer = answers.get(q_id, "").upper()
            correct = q.get("correct_answer", "").upper()
            is_correct = user_answer == correct

            if is_correct:
                score += 1

            results.append({
                "question_id": q["id"],
                "question": q["question"],
                "user_answer": user_answer,
                "correct_answer": correct,
                "is_correct": is_correct,
                "explanation": q.get("explanation", "")
            })

        # Award points
        team = quiz_data.get("team", "Unknown")
        reward_result = self.reward_tool.execute(
            action="award_quiz_points",
            user_id=user_id,
            score=score,
            total=len(questions),
            team=team
        )

        # Save quiz to history
        self.db.save_quiz_result(
            user_id=user_id,
            team=team,
            difficulty=quiz_data.get("difficulty", "medium"),
            questions=questions,
            score=score,
            points_earned=reward_result.get("points_earned", 0)
        )

        return {
            "score": score,
            "total": len(questions),
            "percentage": (score / len(questions) * 100) if questions else 0,
            "results": results,
            "points_earned": reward_result.get("points_earned", 0),
            "new_badges": reward_result.get("new_badges", []),
            "total_points": reward_result.get("total_points", 0)
        }

    def make_prediction(self, user_id: int, team1: str, team2: str,
                        user_pick: str, match_type: str = "regular") -> dict:
        """
        Make and record a prediction.

        Args:
            user_id: User ID
            team1: First team
            team2: Second team
            user_pick: User's predicted winner
            match_type: Type of match

        Returns:
            Prediction result and points awarded
        """
        # Save prediction
        match_desc = f"{team1} vs {team2} ({match_type})"
        self.db.save_prediction(user_id, match_desc, user_pick)

        # Award points for making prediction
        reward_result = self.reward_tool.execute(
            action="award_prediction_points",
            user_id=user_id,
            is_correct=False  # We don't know yet
        )

        return {
            "prediction_saved": True,
            "match": match_desc,
            "your_pick": user_pick,
            "points_earned": reward_result.get("points_earned", 0),
            "message": f"Your prediction ({user_pick} to win) has been recorded! You earned {reward_result.get('points_earned', 0)} points."
        }
