# CSCI_Final_proJect

AI Fan Engagement Agent

## Overview

The AI Fan Engagement Agent is a web-based application that allows sports fans to interact with an AI agent. Fans can chat with the AI, take quizzes about their favorite teams, predict game outcomes, and earn points and badges for engagement.

The project focuses on building an agentic application that can use tools, make decisions, and remember users over time.

## Getting Started

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- An OpenRouter API key (optional, for enhanced AI responses)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/jakemannix/CSCI_Final_proJect.git
   cd CSCI_Final_proJect
   ```

2. **Create a virtual environment (recommended)**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your OpenRouter API key:
   ```
   OPENROUTER_API_KEY=your_api_key_here
   ```

   Note: The application works without an API key using built-in fallback responses.

5. **Run the application**
   ```bash
   python app.py
   ```

6. **Open in browser**

   Navigate to [http://localhost:5000](http://localhost:5000)

## Project Structure

```
CSCI_Final_proJect/
├── app.py                    # Flask application entry point
├── requirements.txt          # Python dependencies
├── .env.example              # Environment variable template
├── backend/
│   ├── database.py           # SQLite database for long-term memory
│   ├── agent.py              # AI agent with tool orchestration
│   └── tools/
│       ├── quiz_generator.py     # Sports trivia quiz generation
│       ├── prediction_engine.py  # Match outcome predictions
│       └── fan_rewards.py        # Points, badges, leaderboard
├── templates/
│   └── index.html            # Web UI template
├── static/
│   ├── css/style.css         # Application styles
│   └── js/app.js             # Frontend JavaScript
└── data/
    └── fan_engagement.db     # SQLite database (created on first run)
```

## Features

### Agent Capabilities

The AI agent decides how to respond to users by choosing between different tools instead of only generating text.

### MCP Tools

1. **Quiz Generator Tool**
   - Generates sports trivia questions based on a team, difficulty level, and number of questions
   - Uses an LLM (via OpenRouter API) to return structured quiz data
   - Supports easy, medium, and hard difficulty levels

2. **Prediction Engine Tool**
   - Predicts match outcomes or scores using team statistics and historical context
   - Returns a predicted result with confidence level and explanation
   - Supports regular season, playoff, and championship matches

3. **Fan Reward Tracker Tool**
   - Tracks user points, badges, and leaderboard rankings
   - Awards points for quiz completion and predictions
   - Manages 8 different achievement badges

### Long-Term Memory

The application stores long-term memory in an SQLite database:

- User profiles and preferences
- Quiz history and scores
- Past predictions
- Total points and badges
- Chat history for context

This memory is used to personalize interactions and track progress over time.

### User Interface

- Chat interface for natural conversation with the AI
- Quiz mode with interactive question/answer flow
- Match prediction with AI analysis
- Leaderboard showing top fans
- Profile page with stats and badges

## Usage Examples

### Chat Commands

Try these in the chat interface:

- "Quiz me about the Lakers" - Start a trivia quiz
- "Give me 5 hard questions about the Patriots" - Customized quiz
- "Predict Lakers vs Celtics" - Get a match prediction
- "Show my stats" - View your profile
- "Leaderboard" - See top fans

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user` | Get current user info |
| POST | `/api/user/login` | Set username |
| POST | `/api/chat` | Send chat message |
| POST | `/api/quiz/generate` | Generate a quiz |
| POST | `/api/quiz/submit` | Submit quiz answers |
| POST | `/api/prediction` | Get match prediction |
| GET | `/api/leaderboard` | Get leaderboard |
| GET | `/api/rewards` | Get user rewards |

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENROUTER_API_KEY` | API key for OpenRouter LLM access | None |
| `SECRET_KEY` | Flask session secret key | dev-secret-key |
| `DATABASE_PATH` | Path to SQLite database | data/fan_engagement.db |
| `PORT` | Server port | 5000 |
| `FLASK_DEBUG` | Enable debug mode | true |

## Development

### Running Tests

```bash
python -c "
from backend.database import Database
from backend.tools import QuizGeneratorTool, PredictionEngineTool, FanRewardTrackerTool

# Quick smoke test
db = Database('data/test.db')
user = db.get_or_create_user('TestUser')
print(f'Database: OK - Created user {user[\"username\"]}')

quiz = QuizGeneratorTool().execute('Lakers', 'easy', 3)
print(f'Quiz Tool: OK - Generated {len(quiz[\"data\"][\"questions\"])} questions')

pred = PredictionEngineTool().execute('Lakers', 'Celtics')
print(f'Prediction Tool: OK - {pred[\"prediction\"][\"winner\"]} predicted')

print('All tests passed!')
"
```

### Project Dependencies

- **Flask**: Web framework
- **Flask-CORS**: Cross-origin resource sharing
- **python-dotenv**: Environment variable management
- **requests**: HTTP client for API calls

## License

This project is for educational purposes as part of a CSCI course final project.
