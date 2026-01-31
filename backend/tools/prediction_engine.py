"""
Prediction Engine Tool
Predicts match outcomes using team statistics and LLM reasoning.
"""

import json
import os
import random
import requests
from typing import Optional


class PredictionEngineTool:
    """
    MCP Tool for predicting sports match outcomes.
    Uses OpenRouter API to provide predictions with explanations.
    """

    name = "prediction_engine"
    description = "Predict match outcomes or scores using team statistics and historical context"

    # Sample team data for predictions
    TEAM_DATA = {
        "Lakers": {"wins": 45, "losses": 25, "avg_points": 112, "league": "NBA"},
        "Celtics": {"wins": 50, "losses": 20, "avg_points": 115, "league": "NBA"},
        "Warriors": {"wins": 42, "losses": 28, "avg_points": 118, "league": "NBA"},
        "Patriots": {"wins": 10, "losses": 6, "avg_points": 24, "league": "NFL"},
        "Chiefs": {"wins": 12, "losses": 4, "avg_points": 28, "league": "NFL"},
        "Cowboys": {"wins": 11, "losses": 5, "avg_points": 26, "league": "NFL"},
        "Yankees": {"wins": 90, "losses": 60, "avg_runs": 5.2, "league": "MLB"},
        "Dodgers": {"wins": 95, "losses": 55, "avg_runs": 5.5, "league": "MLB"},
        "Red Sox": {"wins": 85, "losses": 65, "avg_runs": 4.8, "league": "MLB"},
    }

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("OPENROUTER_API_KEY")
        self.api_url = "https://openrouter.ai/api/v1/chat/completions"

    def execute(self, team1: str, team2: str, match_type: str = "regular") -> dict:
        """
        Predict match outcome between two teams.

        Args:
            team1: First team name
            team2: Second team name
            match_type: regular, playoff, or championship

        Returns:
            Dictionary with prediction and explanation
        """
        # Get team stats
        stats1 = self._get_team_stats(team1)
        stats2 = self._get_team_stats(team2)

        if not self.api_key:
            return self._generate_fallback_prediction(team1, team2, stats1, stats2, match_type)

        prompt = f"""Predict the outcome of a {match_type} match between {team1} and {team2}.

Team Statistics:
{team1}: {json.dumps(stats1, indent=2)}
{team2}: {json.dumps(stats2, indent=2)}

Provide a prediction in this exact JSON format:
{{
    "winner": "Team name",
    "confidence": 0.75,
    "predicted_score": "{team1} 105 - 98 {team2}",
    "key_factors": ["Factor 1", "Factor 2", "Factor 3"],
    "explanation": "2-3 sentence explanation of the prediction"
}}

Consider:
1. Win/loss records
2. Average scoring
3. Match type importance
4. Historical matchups (general sports knowledge)"""

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
                        {"role": "system", "content": "You are a sports analyst. Provide match predictions in JSON format."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.7,
                    "max_tokens": 500
                },
                timeout=30
            )

            if response.status_code == 200:
                result = response.json()
                content = result['choices'][0]['message']['content']
                prediction = self._parse_json_response(content)
                if prediction:
                    return {
                        "success": True,
                        "match": f"{team1} vs {team2}",
                        "match_type": match_type,
                        "prediction": prediction
                    }

            return self._generate_fallback_prediction(team1, team2, stats1, stats2, match_type)

        except Exception as e:
            return self._generate_fallback_prediction(team1, team2, stats1, stats2, match_type)

    def _get_team_stats(self, team: str) -> dict:
        """Get team statistics."""
        # Check if team exists in our data
        for name, stats in self.TEAM_DATA.items():
            if name.lower() in team.lower() or team.lower() in name.lower():
                return {"name": name, **stats}

        # Generate generic stats for unknown teams
        return {
            "name": team,
            "wins": random.randint(30, 50),
            "losses": random.randint(20, 40),
            "league": "Unknown"
        }

    def _parse_json_response(self, content: str) -> Optional[dict]:
        """Parse JSON from LLM response."""
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            start = content.find('{')
            end = content.rfind('}') + 1
            if start >= 0 and end > start:
                try:
                    return json.loads(content[start:end])
                except json.JSONDecodeError:
                    pass
        return None

    def _generate_fallback_prediction(self, team1: str, team2: str,
                                      stats1: dict, stats2: dict,
                                      match_type: str) -> dict:
        """Generate prediction when API is unavailable."""
        # Calculate win probability based on records
        wins1 = stats1.get('wins', 40)
        losses1 = stats1.get('losses', 30)
        wins2 = stats2.get('wins', 40)
        losses2 = stats2.get('losses', 30)

        total1 = wins1 + losses1
        total2 = wins2 + losses2

        win_pct1 = wins1 / total1 if total1 > 0 else 0.5
        win_pct2 = wins2 / total2 if total2 > 0 else 0.5

        # Determine winner
        if win_pct1 > win_pct2:
            winner = team1
            confidence = 0.5 + (win_pct1 - win_pct2) * 0.5
        elif win_pct2 > win_pct1:
            winner = team2
            confidence = 0.5 + (win_pct2 - win_pct1) * 0.5
        else:
            winner = random.choice([team1, team2])
            confidence = 0.5

        confidence = min(0.85, max(0.55, confidence))

        # Generate score based on league
        league = stats1.get('league', stats2.get('league', 'NBA'))
        if league == 'NFL':
            score1 = random.randint(17, 35)
            score2 = random.randint(14, 31)
        elif league == 'MLB':
            score1 = random.randint(3, 8)
            score2 = random.randint(2, 7)
        else:  # NBA default
            score1 = random.randint(100, 120)
            score2 = random.randint(95, 115)

        if winner == team2:
            score1, score2 = score2, score1

        return {
            "success": True,
            "match": f"{team1} vs {team2}",
            "match_type": match_type,
            "prediction": {
                "winner": winner,
                "confidence": round(confidence, 2),
                "predicted_score": f"{team1} {score1} - {score2} {team2}",
                "key_factors": [
                    f"{winner} has a better win/loss record",
                    f"Historical performance in {match_type} games",
                    "Current team form and momentum"
                ],
                "explanation": f"Based on the season records, {winner} has shown more consistent performance. Their win percentage of {win_pct1 if winner == team1 else win_pct2:.1%} gives them an edge in this matchup."
            },
            "note": "Using statistical model - configure OPENROUTER_API_KEY for AI-enhanced predictions"
        }

    def get_schema(self) -> dict:
        """Return the tool schema for agent registration."""
        return {
            "name": self.name,
            "description": self.description,
            "parameters": {
                "type": "object",
                "properties": {
                    "team1": {
                        "type": "string",
                        "description": "First team name"
                    },
                    "team2": {
                        "type": "string",
                        "description": "Second team name"
                    },
                    "match_type": {
                        "type": "string",
                        "enum": ["regular", "playoff", "championship"],
                        "description": "Type of match"
                    }
                },
                "required": ["team1", "team2"]
            }
        }
