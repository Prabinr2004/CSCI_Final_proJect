// ===== Configuration =====
// Detect environment and set correct API URL
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_URL = isLocalhost 
  ? `http://${window.location.hostname}:9000`
  : 'https://sports-fan-backend.onrender.com'; // Render backend URL
console.log('Script loaded, API_URL:', API_URL);


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

const TEAMS_BY_LEAGUE = {
    'Soccer': [
        'AC Milan', 'AS Roma', 'Arsenal', 'Aston Villa', 'Atletico Madrid', 'Barcelona', 'Bayer Leverkusen', 
        'Bayern Munich', 'Borussia Dortmund', 'Bournemouth', 'Brentford', 'Brighton', 'Celta Vigo', 'Chelsea', 
        'Crystal Palace', 'Eintracht Frankfurt', 'Everton', 'Fiorentina', 'Fulham', 'Girona', 'Inter Milan', 
        'Ipswich Town', 'Juventus', 'Lazio', 'Leicester City', 'Liverpool', 'Lyon', 'Manchester City', 
        'Manchester United', 'Marseille', 'Monaco', 'Napoli', 'Newcastle United', 'Nice', 'Nottingham Forest', 
        'Paris Saint-Germain', 'RB Leipzig', 'Real Betis', 'Real Madrid', 'Real Sociedad', 'Saint-Étienne', 
        'Schalke', 'Sevilla', 'Southampton', 'Torino', 'Tottenham', 'Valencia', 'Villarreal', 'West Ham', 
        'Wolverhampton'
    ],
    'NBA': [
        'Boston Celtics', 'Chicago Bulls', 'Dallas Mavericks', 'Denver Nuggets', 'Golden State Warriors', 
        'Houston Rockets', 'Lakers', 'Los Angeles Clippers', 'Miami Heat', 'Milwaukee Bucks', 'New York Knicks', 
        'Philadelphia 76ers', 'Phoenix Suns', 'Portland Trail Blazers', 'San Antonio Spurs'
    ],
    'NFL': [
        'Baltimore Ravens', 'Buffalo Bills', 'Chicago Bears', 'Cincinnati Bengals', 'Cleveland Browns', 
        'Dallas Cowboys', 'Denver Broncos', 'Green Bay Packers', 'Kansas City Chiefs', 'Las Vegas Raiders', 
        'Los Angeles Rams', 'Miami Dolphins', 'Minnesota Vikings', 'New England Patriots', 'New Orleans Saints', 
        'New York Giants', 'Philadelphia Eagles', 'Pittsburgh Steelers', 'San Francisco 49ers', 'Seattle Seahawks'
    ]
};

// Flatten for backwards compatibility
const TEAMS = Object.values(TEAMS_BY_LEAGUE).flat();

// Function to get sport and logo for a team
function getTeamSport(teamName) {
    for (const [league, teams] of Object.entries(TEAMS_BY_LEAGUE)) {
        if (teams.includes(teamName)) {
            if (league === 'Soccer') {
                return { sport: 'soccer', logo: '⚽' };
            } else if (league === 'NBA') {
                return { sport: 'nba', logo: '🏀' };
            } else if (league === 'NFL') {
                return { sport: 'nfl', logo: '🏈' };
            }
        }
    }
    return { sport: 'unknown', logo: '🎯' };
}

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded fired, TEAMS_BY_LEAGUE:', TEAMS_BY_LEAGUE);
    
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
    
    console.log('About to call loadTeamsIntoSelectors');
    loadTeamsIntoSelectors();
    console.log('loadTeamsIntoSelectors completed');
});

// Fallback in case DOM isn't ready
window.addEventListener('load', () => {
    console.log('Window load event fired');
    const teamSelect = document.getElementById('team-input');
    if (teamSelect && teamSelect.options.length === 1) {
        console.log('Team dropdown is empty, loading now');
        loadTeamsIntoSelectors();
    }
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

function selectTeamFromModal(team) {
    document.getElementById('team-input').value = team;
    closeTeamModal();
}

// ===== Authentication =====
function loadTeamsIntoSelectors() {
    console.log('loadTeamsIntoSelectors called');
    console.log('TEAMS_BY_LEAGUE:', TEAMS_BY_LEAGUE);
    
    const teamSelect = document.getElementById('team-input');
    console.log('teamSelect element:', teamSelect);
    
    if (!teamSelect) {
        console.error('team-input element not found');
        return;
    }
    
    console.log('Current options count:', teamSelect.options.length);
    
    // Clear existing options except the first one
    while (teamSelect.options.length > 1) {
        teamSelect.remove(1);
    }
    
    console.log('After clearing, options count:', teamSelect.options.length);
    
    // Load dropdown with optgroups
    Object.entries(TEAMS_BY_LEAGUE).forEach(([league, teams]) => {
        console.log('Adding league:', league, 'with', teams.length, 'teams');
        const optgroup = document.createElement('optgroup');
        optgroup.label = league;
        teams.forEach(team => {
            const option = document.createElement('option');
            option.value = team;
            option.textContent = team;
            optgroup.appendChild(option);
        });
        teamSelect.appendChild(optgroup);
    });
    
    console.log('Teams loaded into dropdown. Final options count:', teamSelect.options.length);
}

async function handleLogin() {
    const username = document.getElementById('username-input').value.trim();
    const team = document.getElementById('team-input').value;
    
    console.log('Login attempt:', { username, team, API_URL });
    
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
        
        console.log('Creating user with:', { userId, username, team, API_URL });
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(`${API_URL}/api/user/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                username: username,
                favorite_team: team
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log('Create user response:', response.status);
        const responseData = await response.json();
        console.log('Response data:', responseData);
        
        if (response.ok) {
            currentUser = {
                id: userId,
                username: username,
                team: team,
                points: 0
            };
            
            console.log('User created, saving to localStorage:', currentUser);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showMainScreen();
            initializeDashboard();
        } else {
            alert(`Error creating profile: ${responseData.detail || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Login error:', error);
        if (error.name === 'AbortError') {
            alert('Connection timeout. Backend at ' + API_URL + ' is not responding.');
        } else {
            alert('Connection error: ' + error.message + '\nBackend should be at ' + API_URL);
        }
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
    // Populate the modal with teams before showing it
    populateTeamModal();
    document.getElementById('team-modal').classList.remove('hidden');
}

function populateTeamModal() {
    const teamSelectionModal = document.getElementById('team-selection-modal');
    
    if (!teamSelectionModal) {
        console.error('team-selection-modal not found');
        return;
    }
    
    // Clear existing teams
    teamSelectionModal.innerHTML = '';
    
    // Add teams organized by league
    Object.entries(TEAMS_BY_LEAGUE).forEach(([league, teams]) => {
        // Add league heading
        const leagueHeading = document.createElement('div');
        leagueHeading.className = 'league-heading';
        leagueHeading.textContent = league;
        leagueHeading.style.gridColumn = '1 / -1';
        leagueHeading.style.fontSize = '0.9rem';
        leagueHeading.style.fontWeight = 'bold';
        leagueHeading.style.marginTop = '0.5rem';
        leagueHeading.style.color = '#667eea';
        teamSelectionModal.appendChild(leagueHeading);
        
        // Add teams for this league
        teams.forEach(team => {
            const teamOption = document.createElement('div');
            teamOption.className = 'team-option';
            teamOption.style.cursor = 'pointer';
            teamOption.style.padding = '0.75rem';
            teamOption.style.border = '2px solid #e0e0e0';
            teamOption.style.borderRadius = '6px';
            teamOption.style.textAlign = 'center';
            teamOption.style.transition = 'all 0.3s ease';
            teamOption.innerHTML = `<p style="margin: 0; font-size: 0.9rem;">${team}</p>`;
            
            // Add hover effect
            teamOption.addEventListener('mouseenter', () => {
                teamOption.style.borderColor = '#667eea';
                teamOption.style.backgroundColor = '#f0f4ff';
            });
            
            teamOption.addEventListener('mouseleave', () => {
                teamOption.style.borderColor = '#e0e0e0';
                teamOption.style.backgroundColor = 'white';
            });
            
            teamOption.onclick = () => selectTeamFromModal(team);
            teamSelectionModal.appendChild(teamOption);
        });
    });
}

function closeTeamModal() {
    document.getElementById('team-modal').classList.add('hidden');
}

function showExhaustedModal(team, data) {
    const modal = document.getElementById('exhausted-modal');
    const message = document.getElementById('exhausted-message');
    const info = document.getElementById('exhausted-info');
    
    message.textContent = `You've completed all available questions for ${team}!`;
    info.innerHTML = `
        <strong>Questions Status:</strong><br>
        Total questions asked: ${data.total_asked}<br>
        Total available: ${data.total_available}
    `;
    
    // Store team for reset action
    window.exhaustedTeam = team;
    
    modal.classList.remove('hidden');
}

function closeExhaustedModal() {
    document.getElementById('exhausted-modal').classList.add('hidden');
    initializeQuizSelection();
}

async function resetQuestionPool() {
    const team = window.exhaustedTeam;
    
    try {
        const response = await fetch(`${API_URL}/api/quiz/reset-pool/${currentUser.id}/${team}`, {
            method: 'POST'
        });
        
        if (response.ok) {
            const data = await response.json();
            closeExhaustedModal();
            alert(data.message);
            showQuizOverview(team);
        } else {
            alert('Error resetting question pool. Please try again.');
        }
    } catch (error) {
        console.error('Error resetting pool:', error);
        alert('Error resetting question pool.');
    }
}

function selectTeamFromModal(team) {
    currentUser.team = team;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    updateHeader();
    closeTeamModal();
    initializeDashboard();
}

// ===== UI Navigation =====
async function updateHeader() {
    try {
        // Fetch fresh user data from server
        const response = await fetch(`${API_URL}/api/user/${currentUser.id}`);
        if (response.ok) {
            const user = await response.json();
            currentUser.points = user.total_points || 0;
            currentUser.username = user.username || currentUser.username;
            currentUser.team = user.favorite_team || currentUser.team;
        }
    } catch (error) {
        console.error('Error updating header:', error);
    }
    
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
    } else if (viewName === 'predictions') {
        initPredictionsView();
    }
}

// ===== Dashboard =====
async function updateDashboardStats() {
    // Update the quick stats and sections on the dashboard without reloading everything
    try {
        // Load quiz history to count and display
        const quizResponse = await fetch(`${API_URL}/api/user/${currentUser.id}/history/quizzes`);
        if (quizResponse.ok) {
            const data = await quizResponse.json();
            const quizzes = data.quiz_history || [];
            const quizCount = quizzes.length;
            document.getElementById('quick-quiz-count').textContent = quizCount;
            loadQuizDashboard(quizzes); // Reload the quiz section
        }
        
        // Load predictions to count and display
        const predResponse = await fetch(`${API_URL}/api/user/${currentUser.id}/history/predictions`);
        if (predResponse.ok) {
            const data = await predResponse.json();
            const predictions = data.prediction_history || [];
            const predCount = predictions.length;
            document.getElementById('quick-pred-count').textContent = predCount;
            loadPredictionDashboard(predictions); // Reload the predictions section
        }
        
        // Reload user data for badges
        const userResponse = await fetch(`${API_URL}/api/user/${currentUser.id}`);
        if (userResponse.ok) {
            const user = await userResponse.json();
            currentUser.points = user.total_points || 0;
            currentUser.badges = user.badges || [];
            
            // Calculate medal count based on points (same as leaderboard)
            let medalCount = 0;
            if (currentUser.points >= 1300) medalCount = 6;      // Crown
            else if (currentUser.points >= 900) medalCount = 5;  // Diamond
            else if (currentUser.points >= 600) medalCount = 4;  // Platinum
            else if (currentUser.points >= 350) medalCount = 3;  // Gold
            else if (currentUser.points >= 180) medalCount = 2;  // Silver
            else if (currentUser.points >= 70) medalCount = 1;   // Bronze
            
            document.getElementById('quick-badge-count').textContent = medalCount;
            
            loadAchievements(currentUser.badges); // Reload achievements section
            console.log('Badges Dashboard Updated:', {points: currentUser.points, medals: medalCount, badges: currentUser.badges});
        }
        
        console.log('Dashboard sections updated');
    } catch (error) {
        console.error('Error updating dashboard stats:', error);
    }
}

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
        let quizCount = 0;
        let predCount = 0;
        
        // Load quiz history
        const quizResponse = await fetch(`${API_URL}/api/user/${currentUser.id}/history/quizzes`);
        if (quizResponse.ok) {
            const data = await quizResponse.json();
            const quizzes = data.quiz_history || [];
            quizCount = quizzes.length;
            loadQuizDashboard(quizzes);
        }
        
        // Load predictions
        const predResponse = await fetch(`${API_URL}/api/user/${currentUser.id}/history/predictions`);
        if (predResponse.ok) {
            const data = await predResponse.json();
            const predictions = data.prediction_history || [];
            predCount = predictions.length;
            loadPredictionDashboard(predictions);
        }
        
        // Load user data for stats
        const userResponse = await fetch(`${API_URL}/api/user/${currentUser.id}`);
        if (userResponse.ok) {
            const user = await userResponse.json();
            currentUser.points = user.total_points || 0;
            currentUser.badges = user.badges || [];  // Store badges in currentUser
            updateHeader();
            loadAchievements(currentUser.badges);
        }
        
        // Update quick stats with actual counts
        document.getElementById('quick-quiz-count').textContent = quizCount;
        document.getElementById('quick-pred-count').textContent = predCount;
        
        // Calculate medal count based on points (same as leaderboard - consistent display)
        let medalCount = 0;
        if (currentUser.points >= 1300) medalCount = 6;      // Crown
        else if (currentUser.points >= 900) medalCount = 5;  // Diamond
        else if (currentUser.points >= 600) medalCount = 4;  // Platinum
        else if (currentUser.points >= 350) medalCount = 3;  // Gold
        else if (currentUser.points >= 180) medalCount = 2;  // Silver
        else if (currentUser.points >= 70) medalCount = 1;   // Bronze
        
        document.getElementById('quick-badge-count').textContent = medalCount;
        
        console.log('Dashboard initialized - Quizzes:', quizCount, 'Predictions:', predCount, 'Medals:', medalCount, 'Points:', currentUser.points);
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
        // Check if prediction has a system outcome (resolved)
        const isResolved = pred.system_outcome && pred.system_outcome.length > 0;
        const status = isResolved ? 
            (pred.is_correct ? '✅' : '❌') : 
            '⏳';
        
        html += `
            <div style="padding: 1rem 0; border-bottom: 1px solid var(--border);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong>${pred.team1} vs ${pred.team2}</strong>
                    <span>${status}</span>
                </div>
                <small style="color: var(--text-secondary);">
                    Your Prediction: ${pred.user_prediction}
                </small>
            </div>
        `;
    });
    container.innerHTML = html;
}

function loadAchievements(badges, points) {
    const userPoints = points !== undefined ? points : (currentUser.points || 0);
    console.log('loadAchievements called with points:', userPoints);
    
    // Medal points thresholds
    const medalTiers = [
        { name: 'Bronze', icon: '🥉', points: 70 },
        { name: 'Silver', icon: '🥈', points: 180 },
        { name: 'Gold', icon: '🥇', points: 350 },
        { name: 'Platinum', icon: '💎', points: 600 },
        { name: 'Diamond', icon: '💠', points: 900 },
        { name: 'Crown', icon: '👑', points: 1300 }
    ];
    
    // Update each badge based on points
    const badgeElements = document.querySelectorAll('#achievements-dashboard .badge');
    badgeElements.forEach((badge, index) => {
        const medal = medalTiers[index];
        const unlocked = userPoints >= medal.points;
        
        // Calculate progress to next tier
        const prevPoints = index > 0 ? medalTiers[index - 1].points : 0;
        const progress = Math.min(100, Math.round(((userPoints - prevPoints) / (medal.points - prevPoints)) * 100));
        
        console.log(`Medal ${medal.name}: ${unlocked ? 'UNLOCKED' : 'LOCKED'} (${userPoints} >= ${medal.points})`);
        
        // Update classes
        if (unlocked) {
            badge.classList.remove('locked');
            badge.classList.add('unlocked');
        } else {
            badge.classList.remove('unlocked');
            badge.classList.add('locked');
        }
        
        // Update badge content
        badge.innerHTML = `
            <div class="badge-icon">${medal.icon}</div>
            <div class="badge-name">${medal.name}</div>
            <div style="font-size: 0.7rem; margin-top: 0.25rem; color: var(--text-secondary);">${medal.points}+ pts</div>
            <div style="font-size: 0.7rem; margin-top: 0.25rem; color: var(--text-secondary);">${progress}%</div>
            ${!unlocked ? '<div style="font-size: 0.7rem; margin-top: 0.25rem; color: var(--text-secondary);">Locked</div>' : ''}
        `;
    });
}

// ===== Quiz System =====
async function initializeQuizSelection() {
    const container = document.getElementById('quiz-selection');
    container.innerHTML = '';
    
    let html = '';
    TEAMS.forEach(team => {
        const sportInfo = getTeamSport(team);
        html += `
            <div class="team-card" onclick="showQuizOverview('${team}')">
                <h2 class="team-logo">${sportInfo.logo}</h2>
                <h3>${team}</h3>
                <p>Select Team</p>
            </div>
        `;
    });
    
    container.innerHTML = html;
    document.getElementById('quiz-display').classList.add('hidden');
    document.getElementById('quiz-results').classList.add('hidden');
}

async function showQuizOverview(team) {
    quizState.team = team;
    const sportInfo = getTeamSport(team);
    
    try {
        // Get team points from progress endpoint
        const progressResponse = await fetch(`${API_URL}/api/user/${currentUser.id}/progress/${team}`);
        let teamPoints = 0;
        let currentLevel = 'Easy';
        let hasProgress = false;
        
        if (progressResponse.ok) {
            const data = await progressResponse.json();
            hasProgress = data.has_progress || false;
            currentLevel = data.current_level || 'Easy';
            teamPoints = data.team_points || 0;
        }
        
        // Show quiz overview screen
        const overviewHtml = `
            <div class="quiz-overview">
                <div class="overview-header">
                    <h2 class="overview-logo">${sportInfo.logo}</h2>
                    <h1>${team}</h1>
                </div>
                
                <div class="overview-stats">
                    <div class="stat-card">
                        <div class="stat-label">Current Level</div>
                        <div class="stat-value">${currentLevel}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Team Points</div>
                        <div class="stat-value">${teamPoints}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Status</div>
                        <div class="stat-value">${hasProgress ? '🔄 In Progress' : '🆕 Not Started'}</div>
                    </div>
                </div>
                
                <div class="overview-actions">
                    <button class="btn btn-primary" onclick="startQuizForTeam('${team}')">
                        ${hasProgress ? '▶️ Continue Quiz' : '▶️ Start Quiz'}
                    </button>
                    <button class="btn btn-secondary" onclick="initializeQuizSelection()">
                        ← Back to Teams
                    </button>
                </div>
            </div>
        `;
        
        const container = document.getElementById('quiz-selection');
        container.innerHTML = overviewHtml;
        
    } catch (error) {
        console.error('Error loading quiz overview:', error);
        alert('Error loading quiz. Please try again.');
    }
}

async function startQuizForTeam(team) {
    quizState.team = team;
    quizState.answers = {};
    quizState.currentQuestionIndex = 0;
    
    try {
        // Check for existing progress
        const progressResponse = await fetch(`${API_URL}/api/user/${currentUser.id}/progress/${team}`);
        let suggestedLevel = 'Easy';
        if (progressResponse.ok) {
            const data = await progressResponse.json();
            if (data.has_progress && data.current_level) {
                suggestedLevel = data.current_level;
            }
        }
        
        // Fetch available teams to check if this team has questions
        const teamsResponse = await fetch(`${API_URL}/api/teams/available`);
        if (!teamsResponse.ok) {
            throw new Error('Failed to load available teams');
        }
        const teamsData = await teamsResponse.json();
        
        // Find this team in the available teams list
        const selectedTeam = teamsData.teams.find(t => t.name === team);
        if (!selectedTeam) {
            const errorHtml = `
                <div class="quiz-overview">
                    <div class="overview-header" style="text-align: center;">
                        <h1>❌ No Questions Available</h1>
                        <p style="color: var(--text-secondary); margin-top: 1rem;">Unfortunately, we don't have questions for <strong>${team}</strong> yet.</p>
                    </div>
                    
                    <div style="background: #f5f5f5; padding: 1.5rem; border-radius: 8px; margin: 2rem 0; text-align: center;">
                        <p style="color: var(--text-secondary);">Questions are available for these teams:</p>
                        <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; margin-top: 1rem;">
                            ${teamsData.teams.map(t => `<span style="background: white; padding: 0.5rem 1rem; border-radius: 4px; font-size: 0.9rem;">${t.name}</span>`).join('')}
                        </div>
                    </div>
                    
                    <div class="overview-actions">
                        <button class="btn btn-primary" onclick="showQuizOverview('${team}')">
                            ← Select Another Team
                        </button>
                    </div>
                </div>
            `;
            const container = document.getElementById('quiz-selection');
            container.innerHTML = errorHtml;
            return;
        }
        
        // Show level selection screen with only available levels
        let buttonsHtml = '';
        if (selectedTeam.has_easy) {
            buttonsHtml += `<button class="btn btn-primary" style="padding: 2rem; font-size: 1.2rem;" onclick="loadQuizForLevel('${team}', 'Easy')">⭐ EASY</button>`;
        }
        if (selectedTeam.has_medium) {
            buttonsHtml += `<button class="btn btn-primary" style="padding: 2rem; font-size: 1.2rem;" onclick="loadQuizForLevel('${team}', 'Medium')">⭐⭐ MEDIUM</button>`;
        }
        if (selectedTeam.has_hard) {
            buttonsHtml += `<button class="btn btn-primary" style="padding: 2rem; font-size: 1.2rem;" onclick="loadQuizForLevel('${team}', 'Hard')">⭐⭐⭐ HARD</button>`;
        }
        
        const levelSelectionHtml = `
            <div class="quiz-overview">
                <div class="overview-header">
                    <h1>Select Difficulty Level</h1>
                    <p>Choose which level you want to play for <strong>${team}</strong>:</p>
                </div>
                
                <div class="level-selection" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin: 2rem 0;">
                    ${buttonsHtml}
                </div>
                
                <div class="overview-actions">
                    <button class="btn btn-secondary" onclick="showQuizOverview('${team}')">
                        ← Back
                    </button>
                </div>
            </div>
        `;
        
        const container = document.getElementById('quiz-selection');
        container.innerHTML = levelSelectionHtml;
        
    } catch (error) {
        console.error('Error starting quiz:', error);
        const errorHtml = `
            <div class="quiz-overview">
                <div class="overview-header" style="text-align: center;">
                    <h1>⚠️ Error Loading Quiz</h1>
                    <p style="color: var(--text-secondary); margin-top: 1rem;">There was a problem loading the quiz. Please try again.</p>
                </div>
                <div class="overview-actions">
                    <button class="btn btn-secondary" onclick="showQuizOverview('${team}')">
                        ← Back to Teams
                    </button>
                </div>
            </div>
        `;
        document.getElementById('quiz-selection').innerHTML = errorHtml;
    }
}

async function loadQuizForLevel(team, level) {
    try {
        // Call the new quiz generation endpoint that prevents repeated questions
        const response = await fetch(`${API_URL}/api/quiz/generate/${currentUser.id}/${team}/${level}`);
        
        // Handle error responses
        if (!response.ok) {
            let errorMessage = 'Failed to load quiz';
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
                const errorData = await response.json();
                if (errorData.detail) {
                    errorMessage = errorData.detail;
                }
            } else {
                errorMessage = `${response.status}: ${response.statusText}`;
            }
            
            // Show user-friendly error message
            const errorHtml = `
                <div class="quiz-overview">
                    <div class="overview-header" style="text-align: center;">
                        <h1>❌ Quiz Not Available</h1>
                        <p style="color: var(--text-secondary); margin-top: 1rem;">${errorMessage}</p>
                    </div>
                    <div class="overview-actions">
                        <button class="btn btn-secondary" onclick="startQuizForTeam('${team}')">
                            ← Back to Difficulty Selection
                        </button>
                    </div>
                </div>
            `;
            document.getElementById('quiz-selection').innerHTML = errorHtml;
            return;
        }
        
        const data = await response.json();
        
        // Check if questions are exhausted
        if (data.status === 'questions_exhausted') {
            showExhaustedModal(team, data);
            return;
        }
        
        if (data.status !== 'success' || !data.questions) {
            throw new Error('Invalid quiz data');
        }
        
        quizState.level = level;
        quizState.questions = data.questions;
        displayQuiz(data.questions, level);
        
    } catch (error) {
        console.error('Error loading quiz:', error);
        alert('Error loading quiz. Please try again.');
    }
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
            let levelToLoad = 1;
            
            if (data.current_level && data.current_level > 1) {
                const confirmResume = confirm(
                    `You have progress on Level ${data.current_level}. Resume from here?`
                );
                if (confirmResume) {
                    levelToLoad = data.current_level;
                }
            }
            
            // Load the appropriate level
            loadQuizForLevel(team, levelToLoad);
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
    const levelValue = level === 'Easy' ? 1 : level === 'Medium' ? 2 : 3;
    const progressPercent = (levelValue / 3) * 100;
    const levelNames = { 'Easy': '1/3', 'Medium': '2/3', 'Hard': '3/3' };
    
    let html = `
        <div class="quiz-header">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <div>
                    <h3>${quizState.team} - ${level} Level</h3>
                    <p style="color: var(--text-secondary);">${totalQuestions} questions</p>
                </div>
                <button class="btn btn-secondary btn-small" onclick="confirmCancelQuiz()">Exit</button>
            </div>
            <div class="quiz-progress">
                <span>${level}</span>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progressPercent}%"></div>
                </div>
                <span>Hard</span>
            </div>
        </div>
        
        <div class="quiz-questions">
    `;
    
    questions.forEach((q, idx) => {
        const selectedIndex = quizState.answers[idx];
        html += `
            <div class="quiz-question">
                <h4>Question ${idx + 1} of ${totalQuestions}</h4>
                <p style="margin-bottom: 1.5rem; font-weight: 500; font-size: 1.1rem;">${q.question}</p>
                <div class="quiz-options">
        `;
        
        q.options.forEach((option, optIdx) => {
            const isSelected = selectedIndex === optIdx;
            html += `
                <label class="quiz-option ${isSelected ? 'selected' : ''}">
                    <input 
                        type="radio" 
                        name="question-${idx}" 
                        value="${optIdx}"
                        ${isSelected ? 'checked' : ''}
                        onchange="selectQuizAnswer(${idx}, ${optIdx})"
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
            <button class="btn btn-secondary" onclick="confirmCancelQuiz()">Exit Quiz</button>
            <button class="btn btn-primary" onclick="submitQuiz()" style="flex: 1;">
                Submit Answers
            </button>
        </div>
    `;
    
    container.innerHTML = html;
}

function selectQuizAnswer(questionIndex, answerIndex) {
    quizState.answers[questionIndex] = answerIndex;
}

function confirmCancelQuiz() {
    if (confirm('Exit quiz? Your progress will not be saved.')) {
        initializeQuizSelection();
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
        // Convert answer indices to option text for backend
        const answerText = {};
        for (let idx in quizState.answers) {
            const answerIndex = quizState.answers[idx];
            answerText[idx] = quizState.questions[idx].options[answerIndex];
        }
        
        const response = await fetch(`${API_URL}/api/quiz/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: currentUser.id,
                team: quizState.team,
                level: quizState.level,
                answers: answerText,
                questions: quizState.questions
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            displayQuizResults(result);
            await updateHeader(); // Refresh points
            updateDashboardStats(); // Update quick stats
            loadLeaderboard(); // Refresh leaderboard
        }
    } catch (error) {
        console.error('Submit error:', error);
        alert('Error submitting quiz. Please try again.');
    }
}

function displayQuizResults(result) {
    const container = document.getElementById('quiz-results');
    const nextLevelMap = { 'Easy': 'Medium', 'Medium': 'Hard', 'Hard': 'Hard' };
    const nextLevel = nextLevelMap[result.level] || result.level;
    const accuracy = Math.round((result.correct / result.total) * 100);
    
    let html = `
        <div class="results-header">
            <h2>${result.level} Level Complete! 🎉</h2>
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
    if (result.level !== 'Hard') {
        html += `
            <div class="progression-choice">
                <h3>Do you want to continue to ${nextLevel} Level?</h3>
                <div class="progression-buttons">
                    <button class="btn btn-secondary" style="flex: 1;" onclick="handleLevelChoice('${result.level}', false)">
                        No, Stop Here ⛔
                    </button>
                    <button class="btn btn-primary" style="flex: 1;" onclick="handleLevelChoice('${result.level}', true)">
                        Yes, Continue → ${nextLevel}
                    </button>
                </div>
            </div>
        `;
    } else {
        html += `
            <div style="background: linear-gradient(135deg, var(--success), rgba(16, 185, 129, 0.5)); color: white; padding: 2rem; border-radius: 8px; text-align: center; margin: 2rem 0;">
                <h2 style="margin-bottom: 1rem;">🏆 Congratulations! 🏆</h2>
                <p style="font-size: 1.1rem;">You have completed all difficulty levels of ${quizState.team}!</p>
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
        const levelProgression = { 'Easy': 'Medium', 'Medium': 'Hard', 'Hard': 'Hard' };
        const nextLevel = levelProgression[completedLevel] || completedLevel;
        if (shouldContinue && completedLevel !== 'Hard') {
            // Load the next level quiz directly
            loadQuizForLevel(quizState.team, nextLevel);
        } else {
            // User stopped - return to dashboard
            initializeQuizSelection();
        }
    } catch (error) {
        console.error('Level choice error:', error);
        alert('Error loading next level. Please try again.');
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

function calculateMedalCount(points) {
    // Medal tiers based on points
    if (points >= 1300) return 6; // Crown
    if (points >= 900) return 5;  // Diamond
    if (points >= 600) return 4;  // Platinum
    if (points >= 350) return 3;  // Gold
    if (points >= 180) return 2;  // Silver
    if (points >= 70) return 1;   // Bronze
    return 0;
}

function displayLeaderboard(entries) {
    const container = document.getElementById('leaderboard-list');
    let html = '';
    
    entries.forEach((entry, idx) => {
        const isCurrentUser = entry.user_id === currentUser.id;
        const rankColor = idx === 0 ? '👑' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '';
        const medalCount = calculateMedalCount(entry.points);
        
        html += `
            <div class="leaderboard-row ${isCurrentUser ? 'current-user' : ''}">
                <div class="rank">${rankColor || '#' + (idx + 1)}</div>
                <div class="name">${entry.username}</div>
                <div class="team">${entry.team}</div>
                <div class="points">${entry.points}</div>
                <div class="badges">${medalCount} 🎖️</div>
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

// ===== PREDICTIONS FEATURE =====

let currentSport = 'soccer';
let selectedTeam1 = null;
let selectedTeam2 = null;
let selectedPrediction = null;

// Team mapping by sport
const TEAMS_BY_SPORT = {
    soccer: [
        'Manchester United', 'Liverpool', 'Arsenal', 'Manchester City', 'Chelsea', 'Tottenham',
        'Real Madrid', 'Barcelona', 'Atletico Madrid', 'Sevilla', 'Real Sociedad',
        'AC Milan', 'Inter Milan', 'Napoli', 'Juventus', 'AS Roma',
        'Bayern Munich', 'Borussia Dortmund', 'Bayer Leverkusen', 'RB Leipzig',
        'Paris Saint-Germain', 'Marseille', 'Lyon', 'Lens'
    ],
    nba: [
        'Los Angeles Lakers', 'Boston Celtics', 'Golden State Warriors', 'Miami Heat', 'Denver Nuggets',
        'Milwaukee Bucks', 'Phoenix Suns', 'Los Angeles Clippers', 'Dallas Mavericks', 'Houston Rockets',
        'Toronto Raptors', 'Chicago Bulls', 'New York Knicks', 'Brooklyn Nets', 'Philadelphia 76ers',
        'Atlanta Hawks', 'Miami Heat', 'Orlando Magic', 'Washington Wizards', 'Memphis Grizzlies'
    ],
    nfl: [
        'Kansas City Chiefs', 'Buffalo Bills', 'Los Angeles Rams', 'San Francisco 49ers', 'Dallas Cowboys',
        'New England Patriots', 'Green Bay Packers', 'Pittsburgh Steelers', 'New York Giants', 'Philadelphia Eagles',
        'Miami Dolphins', 'Tampa Bay Buccaneers', 'Baltimore Ravens', 'Tennessee Titans', 'Cincinnati Bengals',
        'Jacksonville Jaguars', 'Los Angeles Chargers', 'Las Vegas Raiders', 'Seattle Seahawks', 'Denver Broncos'
    ]
};

function selectSport(sport) {
    currentSport = sport;
    selectedTeam1 = null;
    selectedTeam2 = null;
    selectedPrediction = null;
    
    // Update active button
    document.querySelectorAll('.sport-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update team lists
    updateTeamList();
    
    // Show/hide draw option based on sport
    const drawBtn = document.getElementById('draw-btn');
    if (drawBtn) {
        if (sport === 'soccer') {
            drawBtn.style.display = 'block';
        } else {
            drawBtn.style.display = 'none';
        }
    }
    
    resetPredictionForm();
}

function updateTeamList() {
    const teams = TEAMS_BY_SPORT[currentSport];
    
    // Get select elements
    const team1Select = document.getElementById('team1-select');
    const team2Select = document.getElementById('team2-select');
    
    // Clear and repopulate team1 select
    team1Select.innerHTML = '<option value="">Select Team 1</option>';
    teams.forEach(team => {
        const option = document.createElement('option');
        option.value = team;
        option.textContent = team;
        team1Select.appendChild(option);
    });
    
    // Clear and repopulate team2 select
    team2Select.innerHTML = '<option value="">Select Team 2</option>';
    teams.forEach(team => {
        const option = document.createElement('option');
        option.value = team;
        option.textContent = team;
        team2Select.appendChild(option);
    });
    
    // Attach event listeners
    team1Select.onchange = function() {
        selectedTeam1 = this.value;
        console.log('Team 1 changed to:', selectedTeam1);
        updateTeam2Options();
        updatePredictionButtons();
    };
    
    team2Select.onchange = function() {
        selectedTeam2 = this.value;
        console.log('Team 2 changed to:', selectedTeam2);
        updatePredictionButtons();
    };
}

function updateTeam2Options() {
    // Prevent selecting the same team
    const team2Select = document.getElementById('team2-select');
    const options = team2Select.querySelectorAll('option');
    
    options.forEach(option => {
        if (option.value === selectedTeam1 && option.value !== '') {
            option.disabled = true;
        } else {
            option.disabled = false;
        }
    });
}

function updatePredictionButtons() {
    // Update button text to show actual team names
    const team1NameSpan = document.getElementById('team1-name');
    const team2NameSpan = document.getElementById('team2-name');
    
    console.log('Updating buttons - Team1:', selectedTeam1, 'Team2:', selectedTeam2);
    
    if (team1NameSpan && selectedTeam1) {
        team1NameSpan.textContent = selectedTeam1;
    } else if (team1NameSpan) {
        team1NameSpan.textContent = 'Team 1';
    }
    
    if (team2NameSpan && selectedTeam2) {
        team2NameSpan.textContent = selectedTeam2;
    } else if (team2NameSpan) {
        team2NameSpan.textContent = 'Team 2';
    }
}

function selectPrediction(choice) {
    if (!selectedTeam1 || !selectedTeam2) {
        alert('Please select both teams first');
        return;
    }
    
    // Convert choice to actual team name or 'Draw'
    let predictionValue;
    if (choice === 'team1') {
        predictionValue = selectedTeam1;
    } else if (choice === 'team2') {
        predictionValue = selectedTeam2;
    } else if (choice === 'draw') {
        predictionValue = 'Draw';
    }
    
    selectedPrediction = predictionValue;
    
    // Update button states
    document.querySelectorAll('.pred-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    event.target.classList.add('selected');
    
    // Enable submit button
    document.getElementById('submit-pred-btn').disabled = false;
}

async function submitPrediction() {
    if (!selectedTeam1 || !selectedTeam2 || !selectedPrediction) {
        alert('Please complete all selections');
        return;
    }
    
    // Capture values before they might be cleared
    const team1 = selectedTeam1;
    const team2 = selectedTeam2;
    const prediction = selectedPrediction;
    
    try {
        const response = await fetch(`${API_URL}/api/predictions/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: currentUser.id,
                sport: currentSport,
                team1: team1,
                team2: team2,
                user_prediction: prediction
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Prediction submission failed:', response.status, errorData);
            throw new Error(`Failed to submit prediction: ${errorData.detail || response.statusText}`);
        }
        
        const result = await response.json();
        console.log('Prediction submitted successfully:', result);
        displayPredictionResult(result);
        
        // Immediately add the new prediction to the history display using captured values
        const container = document.getElementById('predictions-list');
        const date = new Date().toLocaleDateString();
        const statusIcon = '⏳'; // Pending
        
        const newPredictionHTML = `
            <div class="prediction-item">
                <h4>${statusIcon} ${team1} vs ${team2}</h4>
                <div class="prediction-item-details">
                    <div class="prediction-item-detail">
                        <strong>Your Pick:</strong> ${prediction}
                    </div>
                    <div class="prediction-item-detail">
                        <strong>Result:</strong> Pending
                    </div>
                    <div class="prediction-item-detail">
                        <strong>Points:</strong> ${result.points_earned || 0} 🎯
                    </div>
                    <div class="prediction-item-detail">
                        <strong>Date:</strong> ${date}
                    </div>
                </div>
            </div>
        `;
        
        // Prepend new prediction to the top of the list
        if (container.innerHTML.includes('No predictions yet')) {
            container.innerHTML = newPredictionHTML;
        } else {
            container.innerHTML = newPredictionHTML + container.innerHTML;
        }
        
        // Reload history and stats in the background after 2 seconds
        // This gives time for the user to see their prediction first
        setTimeout(async () => {
            loadPredictionHistory();
            loadPredictionStats();
            await updateHeader();
            updateDashboardStats(); // Update quick stats on dashboard
            loadLeaderboard(); // Refresh leaderboard
        }, 2000);
        
    } catch (error) {
        console.error('Error submitting prediction:', error);
        alert('Error submitting prediction: ' + error.message);
    }
}

function displayPredictionResult(result) {
    const resultCard = document.getElementById('prediction-result');
    const resultData = result.result || result;
    const isCorrect = resultData.is_correct;
    
    resultCard.innerHTML = `
        <div class="result-card">
            <h3>Prediction Result</h3>
            <p><strong>Your Prediction:</strong> ${resultData.user_prediction}</p>
            <p><strong>Actual Outcome:</strong> ${resultData.system_outcome}</p>
            <p><strong>Explanation:</strong> ${resultData.explanation}</p>
            <p><strong>Points Earned:</strong> <span id="result-points">${resultData.points_earned} 🎯</span></p>
            <div class="result-status ${isCorrect ? 'correct' : 'incorrect'}">
                ${isCorrect ? '✅ Correct!' : '❌ Incorrect'}
            </div>
        </div>
    `;
    
    resultCard.classList.add('show');
    resultCard.scrollIntoView({ behavior: 'smooth' });
}

function resetPredictionForm() {
    selectedTeam1 = null;
    selectedTeam2 = null;
    selectedPrediction = null;
    
    document.getElementById('team1-select').value = '';
    document.getElementById('team2-select').value = '';
    
    document.querySelectorAll('.pred-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    document.getElementById('submit-pred-btn').disabled = true;
    document.getElementById('prediction-result').classList.remove('show');
}

async function loadPredictionHistory() {
    try {
        // Use the correct API endpoint that returns prediction_history
        const response = await fetch(`${API_URL}/api/user/${currentUser.id}/history/predictions`);
        if (!response.ok) {
            throw new Error('Failed to load prediction history');
        }
        
        const data = await response.json();
        const predictions = data.prediction_history || [];
        const container = document.getElementById('predictions-list');
        
        if (!predictions || predictions.length === 0) {
            container.innerHTML = '<p class="no-predictions">No predictions yet. Make your first prediction!</p>';
            return;
        }
        
        let html = '';
        predictions.slice(0, 20).forEach(pred => {
            const date = new Date(pred.created_at).toLocaleDateString();
            const statusIcon = pred.is_correct !== null ? (pred.is_correct ? '✅' : '❌') : '⏳';
            
            html += `
                <div class="prediction-item">
                    <h4>${statusIcon} ${pred.team1} vs ${pred.team2}</h4>
                    <div class="prediction-item-details">
                        <div class="prediction-item-detail">
                            <strong>Your Pick:</strong> ${pred.user_prediction}
                        </div>
                        <div class="prediction-item-detail">
                            <strong>Result:</strong> ${pred.system_outcome || 'Pending'}
                        </div>
                        <div class="prediction-item-detail">
                            <strong>Points:</strong> ${pred.points_earned || 0} 🎯
                        </div>
                        <div class="prediction-item-detail">
                            <strong>Date:</strong> ${date}
                        </div>
                        ${pred.explanation ? `<div class="prediction-item-detail explanation"><strong>Analysis:</strong> ${pred.explanation}</div>` : ''}
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading prediction history:', error);
        document.getElementById('predictions-list').innerHTML = '<p class="no-predictions">Error loading history</p>';
    }
}

async function loadPredictionStats() {
    try {
        const response = await fetch(`${API_URL}/api/predictions/stats/${currentUser.id}`);
        if (!response.ok) {
            throw new Error('Failed to load prediction stats');
        }
        
        const data = await response.json();
        const stats = data.stats || data;
        
        document.getElementById('stat-total').textContent = stats.total_predictions || 0;
        document.getElementById('stat-correct').textContent = stats.correct_predictions || 0;
        
        const accuracy = stats.total_predictions > 0 
            ? ((stats.correct_predictions / stats.total_predictions) * 100).toFixed(1)
            : 0;
        document.getElementById('stat-accuracy').textContent = accuracy + '%';
        
        document.getElementById('stat-points').textContent = stats.total_points || 0;
    } catch (error) {
        console.error('Error loading prediction stats:', error);
    }
}

function initPredictionsView() {
    currentSport = 'soccer';
    selectedTeam1 = null;
    selectedTeam2 = null;
    selectedPrediction = null;
    
    updateTeamList();
    loadPredictionHistory();
    loadPredictionStats();
}
