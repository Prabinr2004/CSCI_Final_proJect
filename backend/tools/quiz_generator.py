"""
Quiz Generator Tool
Generates sports trivia questions using an LLM via OpenRouter API.
"""

import json
import os
import requests
from typing import Optional


class QuizGeneratorTool:
    """
    MCP Tool for generating sports trivia quizzes.
    Uses OpenRouter API to generate structured quiz data.
    """

    name = "quiz_generator"
    description = "Generate sports trivia questions based on team, difficulty, and number of questions"

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("OPENROUTER_API_KEY")
        self.api_url = "https://openrouter.ai/api/v1/chat/completions"

    def execute(self, team: str, difficulty: str = "medium",
                num_questions: int = 5) -> dict:
        """
        Generate quiz questions.

        Args:
            team: Sports team name (e.g., "Lakers", "Patriots")
            difficulty: easy, medium, or hard
            num_questions: Number of questions (1-10)

        Returns:
            Dictionary with quiz questions and metadata
        """
        if not self.api_key:
            return self._generate_fallback_quiz(team, difficulty, num_questions)

        num_questions = max(1, min(10, num_questions))

        prompt = f"""Generate {num_questions} sports trivia questions about the {team}.
Difficulty level: {difficulty}

Return ONLY a valid JSON object with this exact structure:
{{
    "team": "{team}",
    "difficulty": "{difficulty}",
    "questions": [
        {{
            "id": 1,
            "question": "Question text here?",
            "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
            "correct_answer": "A",
            "explanation": "Brief explanation of the answer"
        }}
    ]
}}

Make questions appropriate for {difficulty} difficulty:
- easy: Basic facts any casual fan would know
- medium: Facts a regular fan would know
- hard: Detailed statistics or historical facts

Ensure all questions have exactly 4 options labeled A, B, C, D."""

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
                    "messages": [
                        {"role": "system", "content": "You are a sports trivia expert. Generate quiz questions in valid JSON format only."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.7,
                    "max_tokens": 2000
                },
                timeout=30
            )

            if response.status_code == 200:
                result = response.json()
                content = result['choices'][0]['message']['content']
                # Parse JSON from response
                quiz_data = self._parse_json_response(content)
                if quiz_data:
                    return {
                        "success": True,
                        "data": quiz_data
                    }

            # Fallback if API fails
            return self._generate_fallback_quiz(team, difficulty, num_questions)

        except Exception as e:
            return self._generate_fallback_quiz(team, difficulty, num_questions)

    def _parse_json_response(self, content: str) -> Optional[dict]:
        """Parse JSON from LLM response."""
        try:
            # Try direct parse
            return json.loads(content)
        except json.JSONDecodeError:
            # Try to find JSON in the response
            start = content.find('{')
            end = content.rfind('}') + 1
            if start >= 0 and end > start:
                try:
                    return json.loads(content[start:end])
                except json.JSONDecodeError:
                    pass
        return None

    def _generate_fallback_quiz(self, team: str, difficulty: str,
                                num_questions: int) -> dict:
        """Generate fallback quiz when API is unavailable."""
        # Pre-defined questions for common teams
        fallback_questions = {
            "default": [
                {
                    "id": 1,
                    "question": f"What league does the {team} compete in?",
                    "options": ["A) NFL", "B) NBA", "C) MLB", "D) NHL"],
                    "correct_answer": "B",
                    "explanation": "This depends on the specific team."
                },
                {
                    "id": 2,
                    "question": f"In what city is the {team} based?",
                    "options": ["A) New York", "B) Los Angeles", "C) Chicago", "D) It varies"],
                    "correct_answer": "D",
                    "explanation": "The home city depends on the specific team."
                },
                {
                    "id": 3,
                    "question": f"What are the typical team colors of the {team}?",
                    "options": ["A) Red and White", "B) Blue and Gold", "C) Green and Yellow", "D) Team specific"],
                    "correct_answer": "D",
                    "explanation": "Team colors vary by organization."
                },
                {
                    "id": 4,
                    "question": f"When was the {team} franchise established?",
                    "options": ["A) Before 1950", "B) 1950-1975", "C) 1976-2000", "D) After 2000"],
                    "correct_answer": "B",
                    "explanation": "Most major sports franchises were established in this era."
                },
                {
                    "id": 5,
                    "question": f"How many championships has the {team} won?",
                    "options": ["A) 0", "B) 1-5", "C) 6-10", "D) More than 10"],
                    "correct_answer": "B",
                    "explanation": "Championship counts vary by team."
                }
            ]
        }

        questions = fallback_questions["default"][:num_questions]

        return {
            "success": True,
            "data": {
                "team": team,
                "difficulty": difficulty,
                "questions": questions
            },
            "note": "Using fallback questions - configure OPENROUTER_API_KEY for AI-generated quizzes"
        }

    def get_schema(self) -> dict:
        """Return the tool schema for agent registration."""
        return {
            "name": self.name,
            "description": self.description,
            "parameters": {
                "type": "object",
                "properties": {
                    "team": {
                        "type": "string",
                        "description": "Sports team name"
                    },
                    "difficulty": {
                        "type": "string",
                        "enum": ["easy", "medium", "hard"],
                        "description": "Quiz difficulty level"
                    },
                    "num_questions": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 10,
                        "description": "Number of questions"
                    }
                },
                "required": ["team"]
            }
        }
