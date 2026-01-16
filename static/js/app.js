// AI Fan Engagement Agent - Frontend Application

class FanEngagementApp {
    constructor() {
        this.currentUser = null;
        this.currentQuiz = null;
        this.quizAnswers = {};
        this.currentPrediction = null;

        this.init();
    }

    init() {
        this.bindEvents();
        this.loadUser();
    }

    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.closest('.nav-btn').dataset.tab));
        });

        // Chat
        document.getElementById('sendBtn').addEventListener('click', () => this.sendMessage());
        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        // Quiz
        document.getElementById('startQuizBtn').addEventListener('click', () => this.startQuiz());
        document.getElementById('submitQuizBtn').addEventListener('click', () => this.submitQuiz());

        // Predictions
        document.getElementById('getPredictionBtn').addEventListener('click', () => this.getPrediction());

        // Profile
        document.getElementById('setUsernameBtn').addEventListener('click', () => this.setUsername());

        // Login Modal
        document.getElementById('loginBtn').addEventListener('click', () => this.login());
        document.getElementById('skipLoginBtn').addEventListener('click', () => this.skipLogin());
        document.getElementById('loginUsername').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.login();
        });
    }

    // API Helper
    async api(endpoint, method = 'GET', data = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(`/api${endpoint}`, options);
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            return { success: false, error: 'Network error' };
        }
    }

    // User Management
    async loadUser() {
        const result = await this.api('/user');
        if (result.success) {
            this.currentUser = result.user;
            this.updateUserDisplay();

            // Show login modal for new users
            if (this.currentUser.username.startsWith('Fan_')) {
                document.getElementById('loginModal').classList.add('active');
            }
        }
    }

    async login() {
        const username = document.getElementById('loginUsername').value.trim();
        if (!username) {
            alert('Please enter a username');
            return;
        }

        const result = await this.api('/user/login', 'POST', { username });
        if (result.success) {
            this.currentUser = result.user;
            this.updateUserDisplay();
            document.getElementById('loginModal').classList.remove('active');
            this.addChatMessage('assistant', `Welcome, ${username}! Ready to test your sports knowledge?`);
        }
    }

    skipLogin() {
        document.getElementById('loginModal').classList.remove('active');
    }

    async setUsername() {
        const username = document.getElementById('usernameInput').value.trim();
        if (!username) {
            alert('Please enter a username');
            return;
        }

        const result = await this.api('/user/login', 'POST', { username });
        if (result.success) {
            this.currentUser = result.user;
            this.updateUserDisplay();
            document.getElementById('usernameInput').value = '';
            alert('Username updated!');
        }
    }

    updateUserDisplay() {
        if (this.currentUser) {
            document.getElementById('userName').textContent = this.currentUser.username;
            document.getElementById('userPoints').textContent = `${this.currentUser.points} pts`;
        }
    }

    // Navigation
    switchTab(tabId) {
        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.toggle('active', tab.id === `tab-${tabId}`);
        });

        // Load data for specific tabs
        if (tabId === 'leaderboard') {
            this.loadLeaderboard();
        } else if (tabId === 'profile') {
            this.loadProfile();
        }
    }

    // Chat
    async sendMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();

        if (!message) return;

        // Add user message
        this.addChatMessage('user', message);
        input.value = '';

        // Show loading
        const loadingId = this.addChatMessage('assistant', '<span class="loading"></span> Thinking...');

        // Send to API
        const result = await this.api('/chat', 'POST', { message });

        // Remove loading and add response
        document.getElementById(loadingId).remove();

        if (result.success) {
            this.addChatMessage('assistant', result.response);

            // Update points if changed
            if (result.tool_used) {
                await this.loadUser();
            }
        } else {
            this.addChatMessage('assistant', 'Sorry, something went wrong. Please try again.');
        }
    }

    addChatMessage(role, content) {
        const messagesContainer = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        const messageId = 'msg-' + Date.now();
        messageDiv.id = messageId;
        messageDiv.className = `message ${role}`;
        messageDiv.innerHTML = `<div class="message-content">${this.formatMessage(content)}</div>`;
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        return messageId;
    }

    formatMessage(content) {
        // Convert markdown-style formatting
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
    }

    // Quiz
    async startQuiz() {
        const team = document.getElementById('quizTeam').value.trim() || 'Lakers';
        const difficulty = document.getElementById('quizDifficulty').value;
        const numQuestions = parseInt(document.getElementById('quizCount').value);

        document.getElementById('startQuizBtn').disabled = true;
        document.getElementById('startQuizBtn').textContent = 'Loading...';

        const result = await this.api('/quiz/generate', 'POST', {
            team,
            difficulty,
            num_questions: numQuestions
        });

        document.getElementById('startQuizBtn').disabled = false;
        document.getElementById('startQuizBtn').textContent = 'Start Quiz';

        if (result.success) {
            this.currentQuiz = result.data;
            this.quizAnswers = {};
            this.showQuiz();
        } else {
            alert('Failed to generate quiz. Please try again.');
        }
    }

    showQuiz() {
        document.getElementById('quizSetup').style.display = 'none';
        document.getElementById('quizActive').style.display = 'block';
        document.getElementById('quizResults').style.display = 'none';

        const questions = this.currentQuiz.questions;
        document.getElementById('quizProgress').textContent =
            `${this.currentQuiz.team} Quiz - ${this.currentQuiz.difficulty} difficulty`;

        const container = document.getElementById('questionContainer');
        container.innerHTML = '';

        questions.forEach((q, index) => {
            const questionCard = document.createElement('div');
            questionCard.className = 'question-card';
            questionCard.innerHTML = `
                <h3>Question ${index + 1}: ${q.question}</h3>
                <div class="options-list">
                    ${q.options.map(opt => `
                        <button class="option-btn" data-question="${q.id}" data-answer="${opt.charAt(0)}">
                            ${opt}
                        </button>
                    `).join('')}
                </div>
            `;
            container.appendChild(questionCard);
        });

        // Bind option click events
        container.querySelectorAll('.option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectAnswer(e.target));
        });

        document.getElementById('submitQuizBtn').style.display = 'block';
    }

    selectAnswer(btn) {
        const questionId = btn.dataset.question;
        const answer = btn.dataset.answer;

        // Deselect other options for this question
        btn.parentElement.querySelectorAll('.option-btn').forEach(b => {
            b.classList.remove('selected');
        });

        // Select this option
        btn.classList.add('selected');
        this.quizAnswers[questionId] = answer;
    }

    async submitQuiz() {
        const questionCount = this.currentQuiz.questions.length;
        const answeredCount = Object.keys(this.quizAnswers).length;

        if (answeredCount < questionCount) {
            if (!confirm(`You've only answered ${answeredCount} of ${questionCount} questions. Submit anyway?`)) {
                return;
            }
        }

        document.getElementById('submitQuizBtn').disabled = true;
        document.getElementById('submitQuizBtn').textContent = 'Submitting...';

        const result = await this.api('/quiz/submit', 'POST', {
            quiz_data: this.currentQuiz,
            answers: this.quizAnswers
        });

        document.getElementById('submitQuizBtn').disabled = false;
        document.getElementById('submitQuizBtn').textContent = 'Submit Quiz';

        if (result.success) {
            this.showQuizResults(result);
            await this.loadUser();
        } else {
            alert('Failed to submit quiz. Please try again.');
        }
    }

    showQuizResults(result) {
        document.getElementById('quizActive').style.display = 'none';
        document.getElementById('quizResults').style.display = 'block';

        const resultsDiv = document.getElementById('quizResults');
        resultsDiv.innerHTML = `
            <div class="results-header">
                <h2>Quiz Complete!</h2>
                <div class="score-display">${result.score}/${result.total}</div>
                <p class="points-earned">+${result.points_earned} points earned!</p>
                ${result.new_badges.length > 0 ? `
                    <div class="new-badges">
                        <h3>New Badges Unlocked!</h3>
                        ${result.new_badges.map(b => `<span class="badge">${b.name}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
            <div class="results-breakdown">
                ${result.results.map((r, i) => `
                    <div class="result-item ${r.is_correct ? 'correct' : 'incorrect'}">
                        <h4>Q${i + 1}: ${r.question}</h4>
                        <p>Your answer: ${r.user_answer || 'Not answered'}</p>
                        <p>Correct answer: ${r.correct_answer}</p>
                        ${r.explanation ? `<p class="explanation">${r.explanation}</p>` : ''}
                    </div>
                `).join('')}
            </div>
            <button class="btn-primary" onclick="app.resetQuiz()">Take Another Quiz</button>
        `;
    }

    resetQuiz() {
        this.currentQuiz = null;
        this.quizAnswers = {};
        document.getElementById('quizSetup').style.display = 'block';
        document.getElementById('quizActive').style.display = 'none';
        document.getElementById('quizResults').style.display = 'none';
    }

    // Predictions
    async getPrediction() {
        const team1 = document.getElementById('team1').value.trim();
        const team2 = document.getElementById('team2').value.trim();
        const matchType = document.getElementById('matchType').value;

        if (!team1 || !team2) {
            alert('Please enter both team names');
            return;
        }

        document.getElementById('getPredictionBtn').disabled = true;
        document.getElementById('getPredictionBtn').textContent = 'Analyzing...';

        const result = await this.api('/prediction', 'POST', {
            team1,
            team2,
            match_type: matchType
        });

        document.getElementById('getPredictionBtn').disabled = false;
        document.getElementById('getPredictionBtn').textContent = 'Get Prediction';

        if (result.success) {
            this.currentPrediction = { team1, team2, matchType, ...result.prediction };
            this.showPrediction(result, team1, team2);
        } else {
            alert('Failed to get prediction. Please try again.');
        }
    }

    showPrediction(result, team1, team2) {
        const prediction = result.prediction;
        const resultDiv = document.getElementById('predictionResult');
        resultDiv.style.display = 'block';

        const confidence = Math.round(prediction.confidence * 100);

        resultDiv.innerHTML = `
            <div class="prediction-winner">
                <h3>Predicted Winner: ${prediction.winner}</h3>
                <p>${prediction.predicted_score}</p>
            </div>
            <div class="confidence-section">
                <p>Confidence: ${confidence}%</p>
                <div class="confidence-bar">
                    <div class="confidence-fill" style="width: ${confidence}%"></div>
                </div>
            </div>
            <div class="prediction-details">
                <h4>Key Factors</h4>
                <ul>
                    ${prediction.key_factors.map(f => `<li>${f}</li>`).join('')}
                </ul>
                <p><strong>Analysis:</strong> ${prediction.explanation}</p>
            </div>
            <div class="make-pick">
                <h4>Make Your Prediction</h4>
                <p>Think you know better? Pick who you think will win:</p>
                <div class="pick-buttons">
                    <button class="pick-btn" onclick="app.savePrediction('${team1}')">${team1}</button>
                    <button class="pick-btn" onclick="app.savePrediction('${team2}')">${team2}</button>
                </div>
            </div>
        `;
    }

    async savePrediction(pick) {
        if (!this.currentPrediction) return;

        const result = await this.api('/prediction/save', 'POST', {
            team1: document.getElementById('team1').value.trim(),
            team2: document.getElementById('team2').value.trim(),
            user_pick: pick,
            match_type: document.getElementById('matchType').value
        });

        if (result.success) {
            alert(`Your prediction (${pick} to win) has been saved! You earned ${result.points_earned} points.`);
            await this.loadUser();
        }
    }

    // Leaderboard
    async loadLeaderboard() {
        const result = await this.api('/leaderboard');

        if (result.success) {
            const listDiv = document.getElementById('leaderboardList');
            listDiv.innerHTML = result.leaderboard.map((entry, i) => {
                let rankClass = '';
                if (i === 0) rankClass = 'gold';
                else if (i === 1) rankClass = 'silver';
                else if (i === 2) rankClass = 'bronze';

                return `
                    <div class="leaderboard-item ${entry.is_current_user ? 'current-user' : ''}">
                        <span class="rank ${rankClass}">#${entry.rank}</span>
                        <span class="leaderboard-user">${entry.username}${entry.is_current_user ? ' (You)' : ''}</span>
                        <span class="leaderboard-points">${entry.points} pts</span>
                    </div>
                `;
            }).join('');
        }
    }

    // Profile
    async loadProfile() {
        const result = await this.api('/rewards');

        if (result.success) {
            const user = result.user;
            const stats = result.stats;

            // Update stats cards
            document.getElementById('profileStats').innerHTML = `
                <div class="stat-card">
                    <div class="stat-value">${user.points}</div>
                    <div class="stat-label">Total Points</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">#${user.rank || 'N/A'}</div>
                    <div class="stat-label">Leaderboard Rank</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.quizzes.total_quizzes}</div>
                    <div class="stat-label">Quizzes Completed</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${Math.round(stats.quizzes.avg_score)}%</div>
                    <div class="stat-label">Average Score</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.predictions.total_predictions}</div>
                    <div class="stat-label">Predictions Made</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${user.badges.length}</div>
                    <div class="stat-label">Badges Earned</div>
                </div>
            `;

            // Update badges
            const badgeIcons = {
                'star': '&#11088;',
                'trophy': '&#127942;',
                'crystal-ball': '&#128302;',
                'fire': '&#128293;',
                'medal': '&#127941;',
                'coins': '&#129689;',
                'crown': '&#128081;',
                'gem': '&#128142;'
            };

            const allBadges = [
                { id: 'quiz_rookie', name: 'Quiz Rookie', description: 'Complete your first quiz', icon: 'star' },
                { id: 'quiz_master', name: 'Quiz Master', description: 'Get a perfect score', icon: 'trophy' },
                { id: 'prediction_pro', name: 'Prediction Pro', description: 'Make 5 predictions', icon: 'crystal-ball' },
                { id: 'point_collector', name: 'Point Collector', description: 'Earn 100 points', icon: 'coins' },
                { id: 'super_fan', name: 'Super Fan', description: 'Earn 500 points', icon: 'crown' },
                { id: 'legend', name: 'Legend', description: 'Earn 1000 points', icon: 'gem' }
            ];

            const earnedBadgeIds = user.badges.map(b => b.id || b);

            document.getElementById('badgesGrid').innerHTML = allBadges.map(badge => {
                const earned = earnedBadgeIds.includes(badge.id);
                return `
                    <div class="badge-card ${earned ? '' : 'locked'}">
                        <div class="badge-icon">${badgeIcons[badge.icon] || '&#127942;'}</div>
                        <div class="badge-name">${badge.name}</div>
                        <div class="badge-desc">${badge.description}</div>
                    </div>
                `;
            }).join('');
        }
    }
}

// Initialize app
const app = new FanEngagementApp();
