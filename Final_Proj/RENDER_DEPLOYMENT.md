# 🚀 Render Deployment Guide

## Setup Instructions

### Step 1: Create a Render Account
1. Go to https://render.com
2. Sign up with GitHub (recommended for auto-deploy)
3. Connect your GitHub account

### Step 2: Deploy Backend (FastAPI)

#### Option A: Using render.yaml (Automated)
```bash
git push origin main
```
Then Render will automatically detect `render.yaml` and deploy.

#### Option B: Manual Dashboard Deployment
1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Select your GitHub repository
4. Configure:
   - **Name**: `sports-fan-arena-backend`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000`
   - **Plan**: Free tier (or paid)

5. Add Environment Variables:
   - `DATABASE_PATH` = `./backend/data/fan_engagement.db`
   - `OPENROUTER_API_KEY` = your key

6. Click "Create Web Service"

### Step 3: Deploy Frontend (Static Files)

1. Click "New +" → "Static Site"
2. Select your GitHub repository
3. Configure:
   - **Name**: `sports-fan-arena-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: (leave empty or `echo "Building..."`)

4. Click "Create Static Site"

### Step 4: Update API URLs

Since frontend and backend are on different Render URLs, update the API endpoint:

**File**: `frontend/static/script.js` (Line 1-5)

Change from:
```javascript
const API_URL = `http://${window.location.hostname}:9000`;
```

Change to:
```javascript
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:9000'
  : 'https://your-backend-url.onrender.com';
```

Replace `your-backend-url` with your actual Render backend service name.

---

## What You'll Get

| Resource | URL |
|----------|-----|
| Frontend | `https://sports-fan-arena-frontend.onrender.com` |
| Backend API | `https://sports-fan-arena-backend.onrender.com` |

---

## Pros & Cons

### ✅ Pros
- Free tier available
- Automatic HTTPS
- GitHub integration (auto-deploy on push)
- Easy to scale
- Good uptime

### ⚠️ Cons
- Free tier spins down after 15 minutes of inactivity
- SQLite database resets on redeploy
- Limited disk space on free tier

---

## Recommendations

### Option 1: Upgrade to Paid (Recommended for Production)
- $7/month per service
- Always-on deployment
- Better performance
- Persistent database

### Option 2: Use PostgreSQL instead of SQLite
1. Create a free PostgreSQL database on Render
2. Update your connection string in `.env`
3. Data persists across deployments

### Option 3: Add GitHub Actions for Auto-Deploy
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Render
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Trigger Render Deploy
        run: |
          curl -X POST https://api.render.com/deploy/srv-${{ secrets.RENDER_SERVICE_ID }}?key=${{ secrets.RENDER_API_KEY }}
```

---

## Database Persistence (Important!)

### Current Setup (SQLite)
- Data is lost when app redeploys
- Fine for testing
- NOT suitable for production

### Better Setup (PostgreSQL)
1. On Render dashboard, create a PostgreSQL database
2. Update `DATABASE_PATH` to PostgreSQL URL
3. Data persists forever

Example connection:
```
postgresql://user:password@dpg-xxx.onrender.com:5432/dbname
```

---

## Troubleshooting

### Frontend can't connect to backend
**Solution**: Update API_URL in `frontend/static/script.js`

```javascript
// For production on Render
const API_URL = 'https://sports-fan-arena-backend.onrender.com';
```

### Free tier keeps stopping after 15 minutes
**Solution**: Upgrade to paid tier ($7/month) or use "Render.com Free Tier Bypass"

### Database keeps resetting
**Solution**: Switch to PostgreSQL database (see section above)

### CORS errors
**Solution**: Check `backend/app/main.py` CORS settings - should already be configured

---

## Next Steps

1. ✅ Create Render account
2. ✅ Deploy backend service
3. ✅ Deploy frontend service
4. ✅ Update API URLs
5. ✅ Test the app
6. ✅ (Optional) Upgrade to paid tier

**Estimated time**: 10-15 minutes

---

## Files Needed
- ✅ `Procfile` - Backend startup command
- ✅ `render.yaml` - Automated deployment config
- ✅ `requirements.txt` - Python dependencies
- ✅ `backend/app/main.py` - FastAPI app
- ✅ `frontend/index.html` - Frontend files

All ready to deploy! 🎉
