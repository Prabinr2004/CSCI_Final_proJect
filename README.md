# CSCI_Final_proJect
AI Fan Engagement Agent
Overview
The AI Fan Engagement Agent is a web-based application that allows sports fans to interact with an AI agent. Fans can chat with the AI, take quizzes about their favorite teams, predict game outcomes, and earn points and badges for engagement.

The project focuses on building an agentic application that can use tools, make decisions, and remember users over time.

Agent Capabilities
The AI agent decides how to respond to users by choosing between different tools instead of only generating text.

MCP Tools
1. Quiz Generator Tool
Generates sports trivia questions based on a team, difficulty level, and number of questions.
Uses an LLM (via OpenRouter API) to return structured quiz data.
2. Prediction Engine Tool
Predicts match outcomes or scores using basic team statistics and historical context.
Returns a predicted result with a short explanation.
3. Fan Reward Tracker Tool
Tracks user points, badges, and leaderboard rankings based on quiz performance and predictions.
This tool updates stored user data and does not call the LLM.

Long-Term Memory
The application stores long-term memory in a backend database (SQLite or JSON).
The agent remembers:

1. User profiles
2. Quiz history and scores
3. Past predictions
4. Total points and badges

This memory is used to personalize quizzes, difficulty levels, and future interactions.

User Interface
1. Simple web UI with a chat interface
2. Dashboard showing quizzes, predictions, and leaderboard
3. Fans interact with the agent through chat or buttons

AI & Tools
>Uses OpenRouter API for LLM access
>API key stored securely using a .env file
>Modular backend design separating chat, tools, and memory
