// ===== Configuration =====
const API_URL = 'http://localhost:8000';

// ===== State Management =====
let currentUser = {
    id: null,
    username: null,
    team: null,
    points: 0
};

let quizState = {
    team: null,
    level: null,
    questions: null,
    answers: {},
    currentQuestionIndex: 0
};

const TEAMS = ['Real Madrid', 'Manchester United', 'Liverpool', 'Bayern Munich', 'PSG', 'Barcelona', 'Arsenal', 'Juventus', 'Inter Milan', 'Milan', 'Atletico Madrid', 'Dortmund'];

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            if (currentUser.id && currentUser.team) {
                showMainScreen();
                initializeDashboard();
            } else {
                showLoginScreen();
            }
        } catch (e) {
            showLoginScreen();
        }
    } else {
        showLoginScreen();
    }
    
    loadTeamsIntoSelectors();
});

// ===== Screen Navigation =====
function showLoginScreen() {
    document.getElementById('login-screen').classList.add('active');
    document.getElementById('main-screen').classList.remove('active');
}

function showMainScreen() {
    document.getElementById('login-screen').classList.remove('active');
    document.getElementById('main-screen').classList.add('active');
    updateHeader();
}

// ===== Authentication =====
function loadTeamsIntoSelectors() {
    const teamSelect = document.getElementById('team-input');
    const teamSelectionModal = document.getElementById('team-selection-modal');
    
    // Clear existing options
    teamSelect.innerHTML = '<option value="">-- Select a Team --</option>';
    teamSelectionModal.innerHTML = '';
    
    TEAMS.forEach(team => {
        // Add to login select
        const option = document.createElement('option');
        option.value = team;
        option.textContent = team;
        teamSelect.appendChild(option);
        
        // Add to modal grid
        const teamOption = document.createElement('div');
        teamOption.className = 'team-option';
        teamOption.onclick = () => selectTeamFromModal(team);
        teamOption.innerHTML = `<p>${team}</p>`;
        teamSelectionModal.appendChild(teamOption);
    });
}

async function handleLogin() {
    const username = document.getElementById('username-input').value.trim();
    const team = document.getElementById('team-input').value;
    
    if (!username) {
        alert('Please enter your name');
        return;
    }
    
    if (!team) {
        alert('Please select a team');
        return;
    }
    
    try {
        // Create user on backend
        const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        const response = await fetch(`${API_URL}/api/user/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                username: username,
                favorite_team: team
            })
        });
        
        if (response.ok) {
            currentUser = {
                id: userId,
                username: username,
                team: team,
                points: 0
            };
            
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showMainScreen();
            initializeDashboard();
        } else {
            alert('Error creating profile. Please try again.');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Connection error. Make sure the backend is running.');
    }
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('currentUser');
        currentUser = { id: null, username: null, team: null, points: 0 };
        showLoginScreen();
    }
}

function switchTeam() {
    document.getElementById('team-modal').classList.remove('hidden');
}

function closeTeamModal() {
    document.getElementById('team-modal').classList.add('hidden');
}

function selectTeamFromModal(team) {
    currentUser.team = team;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    updateHeader();
    closeTeamModal();
    initializeDashboard();
}

// ===== UI Navigation =====
function updateHeader() {
    document.getElementById('header-username').textContent = currentUser.username || 'Welcome';
    document.getElementById('header-team').textContent = currentUser.team || '—';
    document.getElementById('header-points').textContent = currentUser.points;
}

function switchView(viewName) {
    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    
    // Hide all nav buttons active state
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected view
    document.getElementById(viewName + '-view').classList.add('active');
    document.querySelector(`[data-view="${viewName}"]`).classList.add('active');
    
    // Load view-specific content
    if (viewName === 'dashboard') {
        initializeDashboard();
    } else if (viewName === 'quiz') {
        initializeQuizSelection();
    } else if (viewName === 'leaderboard') {
        loadLeaderboard();
    }
}

// ===== Dashboard =====
async function initializeDashboard() {
    // Update welcome message
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    const teamPhrase = {
        'Real Madrid': 'Real Madrid never stops winning — neither should you',
        'Manchester United': 'Red Devils never back down — you shouldn\'t either',
        'Liverpool': 'LFC spirit never dies — keep pushing',
        'Bayern Munich': 'Munich excellence never stops — climb higher',
        'PSG': 'Paris always shines — make your mark',
        'Barcelona': 'Culés never quit — go for glory',
        'Arsenal': 'The Gunners keep fighting — you do too',
        'Juventus': 'Bianconeri tradition demands excellence — deliver'
    };
    
    const phrase = teamPhrase[currentUser.team] || 'Keep competing and climbing';
    document.getElementById('welcome-message').textContent = `Good ${greeting}, ${currentUser.username}! 👋`;
    document.getElementById('welcome-subtitle').textContent = phrase;
    
    // Load dashboard data
    try {
        // Load quiz history
        const quizResponse = await fetch(`${API_URL}/api/user/${currentUser.id}/history/quizzes`);
        if (quizResponse.ok) {
            const data = await quizResponse.json();
            loadQuizDashboard(data.quiz_history || []);
        }
        
        // Load predictions
        const predResponse = await fetch(`${API_URL}/api/user/${currentUser.id}/history/predictions`);
        if (predResponse.ok) {
            const data = await predResponse.json();
            loadPredictionDashboard(data.prediction_history || []);
        }
        
        // Load user data for stats
        const userResponse = await fetch(`${API_URL}/api/user/${currentUser.id}`);
        if (userResponse.ok) {
            const user = await userResponse.json();
            currentUser.points = user.total_points || 0;
            updateHeader();
            loadAchievements(user.badges || []);
        }
        
        // Update quick stats
        document.getElementById('quick-quiz-count').textContent = '0'; // Will be updated from data
        document.getElementById('quick-pred-count').textContent = '0';
        document.getElementById('quick-badge-count').textContent = '0';
    } catch (error) {
        console.error('Dashboard error:', error);
    }
}

function loadQuizDashboard(quizzes) {
    const container = document.getElementById('quiz-dashboard');
    
    if (quizzes.length === 0) {
        container.innerHTML = '<p class="empty-state">No quizzes taken yet</p>';
        return;
    }
    
    let html = '<table style="width: 100%; border-collapse: collapse;">';
    quizzes.slice(0, 5).forEach(quiz => {
        const accuracy = Math.round((quiz.correct / quiz.total) * 100);
        html += `
            <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding: 0.75rem; text-align: left;">
                    <strong>${quiz.team}</strong><br>
                    <small style="color: var(--text-secondary);">Level ${quiz.level}</small>
                </td>
                <td style="padding: 0.75rem; text-align: right;">
                    <strong style="color: var(--success);">${accuracy}%</strong><br>
                    <small style="color: var(--text-secondary);">${quiz.correct}/${quiz.total}</small>
                </td>
            </tr>
        `;
    });
    html += '</table>';
    container.innerHTML = html;
}

function loadPredictionDashboard(predictions) {
    const container = document.getElementById('predictions-dashboard');
    
    if (predictions.length === 0) {
        container.innerHTML = '<p class="empty-state">No predictions made yet</p>';
        return;
    }
    
    let html = '';
    predictions.slice(0, 3).forEach(pred => {
        const status = pred.actual_outcome ? 
            (pred.points_earned > 0 ? '✅' : '❌') : 
            '⏳';
        
        html += `
            <div style="padding: 1rem 0; border-bottom: 1px solid var(--border);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong>${pred.team1} vs ${pred.team2}</strong>
                    <span>${status}</span>
                </div>
                <small style="color: var(--text-secondary);">
                    Predicted: ${pred.predicted_winner}
                </small>
            </div>
        `;
    });
    container.innerHTML = html;
}

function loadAchievements(badges) {
    const container = document.getElementById('achievements-dashboard');
    
    const allBadges = [
        { id: 'bronze', name: 'Bronze', icon: '🥉' },
        { id: 'silver', name: 'Silver', icon: '🥈' },
        { id: 'gold', name: 'Gold', icon: '🥇' },
        { id: 'platinum', name: 'Platinum', icon: '💎' },
        { id: 'diamond', name: 'Diamond', icon: '💠' },
        { id: 'crown', name: 'Crown', icon: '👑' },
        { id: 'ace', name: 'Ace', icon: '🂡' },
        { id: 'conqueror', name: 'Conqueror', icon: '🏆' }
    ];
    
    let html = '<div class="badge-grid">';
    allBadges.forEach(badge => {
        const unlocked = badges.includes(badge.id);
        html += `
            <div class="badge ${unlocked ? 'unlocked' : 'locked'}">
                <div class="badge-icon">${badge.icon}</div>
                <div class="badge-name">${badge.name}</div>
                ${!unlocked ? '<div style="font-size: 0.7rem; margin-top: 0.25rem; color: var(--text-secondary);">Locked</div>' : ''}
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

// ===== Quiz System =====
async function initializeQuizSelection() {
    const container = document.getElementById('quiz-selection');
    container.innerHTML = '';
    
    let html = '';
    TEAMS.forEach(team => {
        html += `
            <div class="team-card" onclick="startQuiz('${team}')">
                <h3>⚽</h3>
                <h3>${team}</h3>
                <p>Start Quiz</p>
            </div>
        `;
    });
    
    container.innerHTML = html;
    document.getElementById('quiz-display').classList.add('hidden');
    document.getElementById('quiz-results').classList.add('hidden');
}

async function startQuiz(team) {
    quizState.team = team;
    quizState.answers = {};
    quizState.currentQuestionIndex = 0;
    
    try {
        // Check for existing progress
        const progressResponse = await fetch(`${API_URL}/api/user/${currentUser.id}/progress/${team}`);
        if (progressResponse.ok) {
            const data = await progressResponse.json();
            if (data.has_progress) {
                const confirmResume = confirm(
                    `You have progress on Level ${data.current_level}. Resume from here?`
                );
                if (!confirmResume) {
                    // Reset progress
                    await fetch(`${API_URL}/api/user/${currentUser.id}/progress/${team}/init`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
            }
        }
        
        // Fetch quiz for level 1
        const response = await fetch(`${API_URL}/api/quiz/level/1?team=${team}`);
        if (response.ok) {
            const data = await response.json();
            displayQuiz(data.questions, 1);
        }
    } catch (error) {
        console.error('Quiz start error:', error);
        alert('Error starting quiz. Please try again.');
    }
}

function displayQuiz(questions, level) {
    quizState.level = level;
    quizState.questions = questions;
    quizState.answers = {};
    
    document.getElementById('quiz-selection').classList.add('hidden');
    document.getElementById('quiz-results').classList.add('hidden');
    document.getElementById('quiz-display').classList.remove('hidden');
    
    const container = document.getElementById('quiz-display');
    const totalQuestions = questions.length;
    const progressPercent = (level / 10) * 100;
    
    let html = `
        <div class="quiz-header">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <div>
                    <h3>${quizState.team} - Level ${level}/10</h3>
                    <p style="color: var(--text-secondary);">${totalQuestions} questions</p>
                </div>
                <button class="btn btn-secondary btn-small" onclick="cancelQuiz()">Cancel</button>
            </div>
            <div class="quiz-progress">
                <span>Level ${level}</span>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progressPercent}%"></div>
                </div>
                <span>10</span>
            </div>
        </div>
        
        <div class="quiz-questions">
    `;
    
    questions.forEach((q, idx) => {
        const selectedAnswer = quizState.answers[idx];
        html += `
            <div class="quiz-question">
                <h4>Question ${idx + 1} of ${totalQuestions}</h4>
                <p style="margin-bottom: 1rem; font-weight: 500;">${q.question}</p>
                <div class="quiz-options">
        `;
        
        q.options.forEach(option => {
            const isSelected = selectedAnswer === option;
            html += `
                <label class="quiz-option ${isSelected ? 'selected' : ''}">
                    <input 
                        type="radio" 
                        name="question-${idx}" 
                        value="${option}"
                        ${isSelected ? 'checked' : ''}
                        onchange="selectQuizAnswer(${idx}, '${option.replace(/'/g, "\\'")}')"
                    >
                    <span>${option}</span>
                </label>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    });
    
    html += `
        </div>
        
        <div class="quiz-buttons">
            <button class="btn btn-secondary" onclick="cancelQuiz()">Cancel Quiz</button>
            <button class="btn btn-primary" onclick="submitQuiz()" style="flex: 1;">
                Submit Answers
            </button>
        </div>
    `;
    
    container.innerHTML = html;
}

function selectQuizAnswer(questionIndex, answer) {
    quizState.answers[questionIndex] = answer;
}

function cancelQuiz() {
    if (confirm('Are you sure? Your progress will not be saved.')) {
        switchView('dashboard');
    }
}

async function submitQuiz() {
    const totalQuestions = quizState.questions.length;
    const answeredCount = Object.keys(quizState.answers).length;
    
    if (answeredCount < totalQuestions) {
        alert(`Please answer all questions! (${answeredCount}/${totalQuestions})`);
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/quiz/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: currentUser.id,
                team: quizState.team,
                level: quizState.level,
                answers: quizState.answers,
                questions: quizState.questions
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            displayQuizResults(result);
            updateHeader(); // Refresh points
        }
    } catch (error) {
        console.error('Submit error:', error);
        alert('Error submitting quiz. Please try again.');
    }
}

function displayQuizResults(result) {
    const container = document.getElementById('quiz-results');
    const nextLevel = result.level + 1;
    const accuracy = Math.round((result.correct / result.total) * 100);
    
    let html = `
        <div class="results-header">
            <h2>Level ${result.level} Complete! 🎉</h2>
            <p>${quizState.team}</p>
        </div>
        
        <div class="results-stats">
            <div class="stat-box">
                <div class="label">Accuracy</div>
                <div class="value">${accuracy}%</div>
            </div>
            <div class="stat-box">
                <div class="label">Correct</div>
                <div class="value">${result.correct}/${result.total}</div>
            </div>
            <div class="stat-box">
                <div class="label">Points Earned</div>
                <div class="value" style="color: var(--success);">+${result.points_earned}</div>
            </div>
        </div>
        
        <div style="background: var(--bg-dark); padding: 1rem; border-radius: 6px; margin-bottom: 1.5rem;">
            <p style="color: var(--text-secondary); margin-bottom: 0.5rem;">
                <strong>${result.correct} correct × ${result.points_per_question} points each = ${result.points_earned} points</strong>
            </p>
        </div>
        
        <h3 style="margin: 2rem 0 1rem 0;">Answer Breakdown:</h3>
        <div class="results-breakdown">
    `;
    
    result.results.forEach((res, idx) => {
        const isCorrect = res.is_correct;
        html += `
            <div class="result-item ${isCorrect ? 'correct' : 'incorrect'}">
                <div class="result-question">Q${idx + 1}: ${res.question}</div>
                <div class="result-answer">
                    Your Answer: <strong>${res.user_answer}</strong> ${isCorrect ? '✅' : '❌'}
                </div>
                ${!isCorrect ? `<div class="result-answer">Correct: ${res.correct_answer}</div>` : ''}
                <div class="result-answer" style="margin-top: 0.5rem; color: var(--primary);">
                    💡 ${res.explanation}
                </div>
            </div>
        `;
    });
    
    // Progression choice
    if (result.level < 10) {
        html += `
            <div class="progression-choice">
                <h3>Do you want to continue to Level ${nextLevel}?</h3>
                <div class="progression-buttons">
                    <button class="btn btn-secondary" style="flex: 1;" onclick="handleLevelChoice(${result.level}, false)">
                        No, Stop Here ⛔
                    </button>
                    <button class="btn btn-primary" style="flex: 1;" onclick="handleLevelChoice(${result.level}, true)">
                        Yes, Continue → Level ${nextLevel}
                    </button>
                </div>
            </div>
        `;
    } else {
        html += `
            <div style="background: linear-gradient(135deg, var(--success), rgba(16, 185, 129, 0.5)); color: white; padding: 2rem; border-radius: 8px; text-align: center; margin: 2rem 0;">
                <h2 style="margin-bottom: 1rem;">🏆 Congratulations! 🏆</h2>
                <p style="font-size: 1.1rem;">You have completed all 10 levels of ${quizState.team}!</p>
                <p style="margin-top: 1rem; opacity: 0.9;">Total Points Earned: <strong>${result.total_points}</strong></p>
            </div>
            <button class="btn btn-primary" style="width: 100%;" onclick="switchView('dashboard')">
                Back to Dashboard
            </button>
        `;
    }
    
    html += '</div>';
    
    document.getElementById('quiz-display').classList.add('hidden');
    document.getElementById('quiz-results').classList.remove('hidden');
    container.innerHTML = html;
}

async function handleLevelChoice(completedLevel, shouldContinue) {
    try {
        const response = await fetch(
            `${API_URL}/api/user/${currentUser.id}/progress/${quizState.team}/level-choice`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    level: completedLevel,
                    continue_to_next: shouldContinue
                })
            }
        );
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.action === 'continue') {
                // Load next level quiz
                const nextQuizResponse = await fetch(
                    `${API_URL}/api/quiz/level/${data.next_level}?team=${quizState.team}`
                );
                
                if (nextQuizResponse.ok) {
                    const nextQuiz = await nextQuizResponse.json();
                    displayQuiz(nextQuiz.questions, data.next_level);
                }
            } else {
                // User stopped
                switchView('dashboard');
            }
        }
    } catch (error) {
        console.error('Level choice error:', error);
        alert('Error processing your choice. Please try again.');
    }
}

// ===== Chat Functions =====
function handleChatKeyPress(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message to chat
    addChatMessage('user', message);
    input.value = '';
    
    try {
        const response = await fetch(`${API_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: currentUser.id,
                message: message
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            addChatMessage('assistant', data.response);
        }
    } catch (error) {
        console.error('Chat error:', error);
        addChatMessage('assistant', 'Sorry, I encountered an error. Please try again.');
    }
}

function addChatMessage(sender, message) {
    const container = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}`;
    messageDiv.innerHTML = `<div class="message-bubble"><p>${message}</p></div>`;
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
}

// ===== Leaderboard =====
async function loadLeaderboard() {
    const container = document.getElementById('leaderboard-list');
    container.innerHTML = '<p class="loading">Loading...</p>';
    
    try {
        const response = await fetch(`${API_URL}/api/leaderboard?limit=50`);
        if (response.ok) {
            const data = await response.json();
            displayLeaderboard(data.leaderboard || []);
        } else {
            container.innerHTML = '<p class="loading">Failed to load leaderboard</p>';
        }
    } catch (error) {
        console.error('Leaderboard error:', error);
        container.innerHTML = '<p class="loading">Error loading leaderboard</p>';
    }
}

function displayLeaderboard(entries) {
    const container = document.getElementById('leaderboard-list');
    let html = '';
    
    entries.forEach((entry, idx) => {
        const isCurrentUser = entry.user_id === currentUser.id;
        const rankColor = idx === 0 ? '👑' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '';
        
        html += `
            <div class="leaderboard-row ${isCurrentUser ? 'current-user' : ''}">
                <div class="rank">${rankColor || '#' + (idx + 1)}</div>
                <div class="name">${entry.username}</div>
                <div class="team">${entry.team}</div>
                <div class="points">${entry.points}</div>
                <div class="badges">${entry.badges || 0} 🎖️</div>
            </div>
        `;
    });
    
    if (html === '') {
        html = '<p class="loading">No users found</p>';
    }
    
    container.innerHTML = html;
}

// ===== Auto-refresh =====
setInterval(() => {
    if (currentUser.id && document.getElementById('main-screen').classList.contains('active')) {
        // Optional: Auto-update points and stats
        // updateHeader();
    }
}, 5000);
