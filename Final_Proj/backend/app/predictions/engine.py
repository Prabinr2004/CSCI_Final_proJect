"""
Prediction engine for sports outcomes.
Uses team ranking, recent form, history, and key players to generate predictions.
"""

import random
from datetime import datetime
from typing import Dict, Tuple

# Team data with rankings and key players
TEAM_RANKINGS = {
    # Soccer/Football Teams (Ranked by combined League & Champions League Form)
    'Arsenal': {'ranking': 1, 'strength': 96, 'recent_form': 10, 'key_players': ['Bukayo Saka', 'Martin Ødegaard', 'Viktor Gyökeres']},
    'Barcelona': {'ranking': 2, 'strength': 95, 'recent_form': 9, 'key_players': ['Lamine Yamal', 'Robert Lewandowski', 'Dani Olmo']},
    'Real Madrid': {'ranking': 3, 'strength': 94, 'recent_form': 8, 'key_players': ['Kylian Mbappé', 'Vinícius Jr.', 'Jude Bellingham']},
    'Manchester City': {'ranking': 4, 'strength': 92, 'recent_form': 6, 'key_players': ['Erling Haaland', 'Phil Foden', 'Rodri']},
    'Liverpool': {'ranking': 5, 'strength': 91, 'recent_form': 7, 'key_players': ['Mohamed Salah', 'Virgil van Dijk', 'Luis Díaz']},
    'Bayern Munich': {'ranking': 6, 'strength': 93, 'recent_form': 8, 'key_players': ['Harry Kane', 'Jamal Musiala', 'Joshua Kimmich']},
    'Inter Milan': {'ranking': 7, 'strength': 90, 'recent_form': 5, 'key_players': ['Lautaro Martínez', 'Marcus Thuram', 'Nicolò Barella']},
    'Paris Saint-Germain': {'ranking': 8, 'strength': 89, 'recent_form': 7, 'key_players': ['Ousmane Dembélé', 'Vitinha', 'Bradley Barcola']},
    'Aston Villa': {'ranking': 9, 'strength': 88, 'recent_form': 7, 'key_players': ['Ollie Watkins', 'Morgan Rogers', 'Emiliano Martínez']},
    'Atletico Madrid': {'ranking': 10, 'strength': 87, 'recent_form': 9, 'key_players': ['Antoine Griezmann', 'Julián Álvarez', 'Conor Gallagher']},
    'Manchester United': {'ranking': 11, 'strength': 86, 'recent_form': 8, 'key_players': ['Bruno Fernandes', 'Alejandro Garnacho', 'Kobbie Mainoo']},
    'Chelsea': {'ranking': 12, 'strength': 85, 'recent_form': 8, 'key_players': ['Cole Palmer', 'Nicolas Jackson', 'Moisés Caicedo']},
    'Tottenham': {'ranking': 13, 'strength': 84, 'recent_form': 6, 'key_players': ['Heung-min Son', 'James Maddison', 'Micky van de Ven']},
    'Juventus': {'ranking': 14, 'strength': 84, 'recent_form': 8, 'key_players': ['Kenan Yıldız', 'Dušan Vlahović', 'Teun Koopmeiners']},
    'Borussia Dortmund': {'ranking': 15, 'strength': 83, 'recent_form': 7, 'key_players': ['Serhou Guirassy', 'Julian Brandt', 'Nico Schlotterbeck']},
    'Sevilla': {'ranking': 16, 'strength': 78, 'recent_form': 5, 'key_players': ['Isaac Romero', 'Loïc Badé', 'Dodi Lukebakio']},
    'Napoli': {'ranking': 17, 'strength': 82, 'recent_form': 6, 'key_players': ['Khvicha Kvaratskhelia', 'Romelu Lukaku', 'Scott McTominay']},
    'Villarreal': {'ranking': 18, 'strength': 80, 'recent_form': 4, 'key_players': ['Ayoze Pérez', 'Álex Baena', 'Thierno Barry']},
    'Brentford': {'ranking': 19, 'strength': 79, 'recent_form': 6, 'key_players': ['Bryan Mbeumo', 'Yoane Wissa', 'Mikkel Damsgaard']},
    'Everton': {'ranking': 20, 'strength': 77, 'recent_form': 7, 'key_players': ['Dominic Calvert-Lewin', 'Dwight McNeil', 'Jordan Pickford']},

    # NBA Teams (Ranked by 2025-26 Conference Standings)
    'Oklahoma City Thunder': {'ranking': 1, 'strength': 96, 'recent_form': 7, 'key_players': ['Shai Gilgeous-Alexander', 'Chet Holmgren', 'Jalen Williams']},
    'Detroit Pistons': {'ranking': 2, 'strength': 92, 'recent_form': 8, 'key_players': ['Cade Cunningham', 'Jaden Ivey', 'Tobias Harris']},
    'San Antonio Spurs': {'ranking': 3, 'strength': 90, 'recent_form': 6, 'key_players': ['Victor Wembanyama', 'Chris Paul', 'Devin Vassell']},
    'Denver Nuggets': {'ranking': 4, 'strength': 91, 'recent_form': 7, 'key_players': ['Nikola Jokić', 'Jamal Murray', 'Aaron Gordon']},
    'Boston Celtics': {'ranking': 5, 'strength': 94, 'recent_form': 6, 'key_players': ['Jayson Tatum', 'Jaylen Brown', 'Derrick White']},
    'Toronto Raptors': {'ranking': 6, 'strength': 88, 'recent_form': 6, 'key_players': ['Scottie Barnes', 'RJ Barrett', 'Immanuel Quickley']},
    'New York Knicks': {'ranking': 7, 'strength': 89, 'recent_form': 4, 'key_players': ['Jalen Brunson', 'Karl-Anthony Towns', 'Josh Hart']},
    'Houston Rockets': {'ranking': 8, 'strength': 87, 'recent_form': 6, 'key_players': ['Alperen Şengün', 'Jalen Green', 'Fred VanVleet']},
    'Los Angeles Lakers': {'ranking': 9, 'strength': 86, 'recent_form': 5, 'key_players': ['Anthony Davis', 'LeBron James', 'Austin Reaves']},
    'Cleveland Cavaliers': {'ranking': 10, 'strength': 87, 'recent_form': 7, 'key_players': ['Donovan Mitchell', 'Evan Mobley', 'Darius Garland']},
    'Phoenix Suns': {'ranking': 11, 'strength': 88, 'recent_form': 6, 'key_players': ['Kevin Durant', 'Devin Booker', 'Bradley Beal']},
    'Golden State Warriors': {'ranking': 12, 'strength': 85, 'recent_form': 6, 'key_players': ['Stephen Curry', 'Draymond Green', 'Buddy Hield']},

    # NFL Teams (Ranked by 2025-26 Regular Season / Playoff Seeding)
    'Seattle Seahawks': {'ranking': 1, 'strength': 97, 'recent_form': 10, 'key_players': ['Sam Darnold', 'Kenneth Walker III', 'DK Metcalf']},
    'Denver Broncos': {'ranking': 2, 'strength': 94, 'recent_form': 8, 'key_players': ['Bo Nix', 'Courtland Sutton', 'Pat Surtain II']},
    'New England Patriots': {'ranking': 3, 'strength': 95, 'recent_form': 9, 'key_players': ['Drake Maye', 'Rhamondre Stevenson', 'Christian Gonzalez']},
    'Jacksonville Jaguars': {'ranking': 4, 'strength': 91, 'recent_form': 8, 'key_players': ['Trevor Lawrence', 'Brian Thomas Jr.', 'Josh Hines-Allen']},
    'Houston Texans': {'ranking': 5, 'strength': 90, 'recent_form': 9, 'key_players': ['C.J. Stroud', 'Nico Collins', 'Will Anderson Jr.']},
    'San Francisco 49ers': {'ranking': 6, 'strength': 92, 'recent_form': 7, 'key_players': ['Brock Purdy', 'Christian McCaffrey', 'Deebo Samuel']},
    'Buffalo Bills': {'ranking': 7, 'strength': 93, 'recent_form': 8, 'key_players': ['Josh Allen', 'James Cook', 'Khalil Shakir']},
    'Chicago Bears': {'ranking': 8, 'strength': 88, 'recent_form': 6, 'key_players': ['Caleb Williams', 'DJ Moore', 'Rome Odunze']},
    'Philadelphia Eagles': {'ranking': 9, 'strength': 89, 'recent_form': 7, 'key_players': ['Jalen Hurts', 'Saquon Barkley', 'A.J. Brown']},
    'Pittsburgh Steelers': {'ranking': 10, 'strength': 86, 'recent_form': 6, 'key_players': ['Aaron Rodgers', 'George Pickens', 'T.J. Watt']},
    'Detroit Lions': {'ranking': 11, 'strength': 87, 'recent_form': 7, 'key_players': ['Jared Goff', 'Amon-Ra St. Brown', 'Jahmyr Gibbs']},
    'Green Bay Packers': {'ranking': 12, 'strength': 85, 'recent_form': 5, 'key_players': ['Jordan Love', 'Josh Jacobs', 'Jayden Reed']},
}

class PredictionEngine:
    """Generates sports match predictions based on team data"""
    
    @staticmethod
    def generate_prediction(team1: str, team2: str, sport: str) -> Dict:
        """
        Generate a prediction for a match between two teams
        
        Args:
            team1: First team name
            team2: Second team name
            sport: Sport type (soccer, nba, nfl)
            
        Returns:
            Prediction dictionary with outcome and explanation
        """
        # Get team data
        t1_data = TEAM_RANKINGS.get(team1, {'ranking': 50, 'strength': 50, 'recent_form': 5, 'key_players': ['Player 1']})
        t2_data = TEAM_RANKINGS.get(team2, {'ranking': 50, 'strength': 50, 'recent_form': 5, 'key_players': ['Player 1']})
        
        # Calculate win probability with stronger weighting on ranking and strength
        # Ranking is inverted (1 is best), strength (0-100), recent form (0-10)
        t1_score = t1_data['strength'] * 0.7 + t1_data['recent_form'] * 8 + (100 - t1_data['ranking'] * 2)
        t2_score = t2_data['strength'] * 0.7 + t2_data['recent_form'] * 8 + (100 - t2_data['ranking'] * 2)
        
        total = t1_score + t2_score
        t1_win_prob = t1_score / total if total > 0 else 0.5
        
        # Make prediction more deterministic - if difference is > 10%, predict winner with higher confidence
        prob_diff = abs(t1_win_prob - t2_win_prob) if 't2_win_prob' in locals() else abs(t1_win_prob - 0.5)
        
        # Determine outcome - use probability threshold instead of pure randomness
        # This makes predictions more "genuine" based on team strength
        if t1_win_prob > 0.6:
            # Team 1 is significantly stronger
            winner = team1
            loser = team2
            confidence = min(95, int(t1_win_prob * 100))
        elif t1_win_prob < 0.4:
            # Team 2 is significantly stronger
            winner = team2
            loser = team1
            confidence = min(95, int((1 - t1_win_prob) * 100))
        else:
            # Close match - use randomness
            rand = random.random()
            if rand < t1_win_prob:
                winner = team1
                loser = team2
                confidence = int(t1_win_prob * 100)
            else:
                winner = team2
                loser = team1
                confidence = int((1 - t1_win_prob) * 100)
        
        # Generate explanation
        winner_data = TEAM_RANKINGS.get(winner, {})
        loser_data = TEAM_RANKINGS.get(loser, {})
        winner_strength = winner_data.get('strength', 50)
        loser_strength = loser_data.get('strength', 50)
        
        explanation = f"{winner} should win with {confidence}% confidence. "
        
        # Add reasoning based on strength difference
        if winner_strength > loser_strength + 10:
            explanation += f"Superior team strength ({winner_strength} vs {loser_strength}). "
        elif winner_data.get('recent_form', 5) > loser_data.get('recent_form', 5) + 1:
            explanation += f"Better recent form. "
        elif winner_data.get('ranking', 50) < loser_data.get('ranking', 50):
            explanation += f"Higher ranking ({winner_data.get('ranking')} vs {loser_data.get('ranking')}). "
        
        # Add key players information
        key_players = winner_data.get('key_players', ['Key Player'])
        if len(key_players) >= 2:
            explanation += f"Key players: {key_players[0]}, {key_players[1]} expected to lead the performance."
        else:
            explanation += f"Key player {key_players[0]} expected to perform well."
        
        return {
            'predicted_winner': winner,
            'predicted_loser': loser,
            'confidence': confidence,
            'explanation': explanation,
            'winner_strength': winner_strength,
            'loser_strength': loser_strength
        }
    
    @staticmethod
    def evaluate_prediction(user_prediction: str, system_outcome: str, sport: str) -> Tuple[bool, int]:
        """
        Evaluate if user prediction matches system outcome
        
        Args:
            user_prediction: User's predicted winner (team name or "Draw")
            system_outcome: System's predicted winner
            sport: Sport type
            
        Returns:
            (is_correct, points_awarded)
        """
        if sport == 'soccer':
            # In soccer, draws are possible
            if user_prediction == 'Draw':
                # Draws are harder to predict, award more points if correct
                is_correct = system_outcome == 'Draw'
                return (is_correct, 50 if is_correct else 0)
            else:
                is_correct = user_prediction == system_outcome
                return (is_correct, 30 if is_correct else 0)
        else:
            # NBA and NFL don't have draws
            is_correct = user_prediction == system_outcome
            return (is_correct, 25 if is_correct else 0)
