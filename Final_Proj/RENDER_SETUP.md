# Render.com Deployment Guide

This guide helps you deploy the Sports Fan Arena app to Render.com with separate frontend and backend services.

## ✅ What We're Setting Up

1. **Backend Service** - FastAPI/Python running on Render
2. **Frontend Service** - Static site or Flask server on Render
3. **Environment Variables** - Secure API keys and configuration
4. **Python Version Management** - `runtime.txt` for consistency

## 🚀 Deployment Steps

### Step 1: Prepare Your Repository

Ensure all files are committed to GitHub:
```bash
cd /Users/prabinroka/Desktop/Capstone-CSCI-480-/Final_Proj
git add .
git commit -m "Setup Render deployment configuration"
git push origin main
```

### Step 2: Create Backend Service on Render

1. Go to [render.com](https://render.com) and sign in
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. **Service Configuration:**
   - **Name:** `sports-fan-backend`
   - **Runtime:** `Python 3.11`
   - **Build Command:**
     ```
     cd Final_Proj && pip install --upgrade pip && pip install -r requirements.txt
     ```
   - **Start Command:**
     ```
     cd Final_Proj && uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT
     ```
   - **Plan:** Free (or paid)

5. **Add Environment Variables:**
   - `OPENROUTER_API_KEY` → Your API key
   - `DATABASE_PATH` → `./backend/data/fan_engagement.db`
   - `PYTHON_VERSION` → `3.11.7`

6. Click **Create Web Service**

### Step 3: Create Frontend Service on Render

**Option A: Static Site (Recommended)**

1. Click **New +** → **Static Site**
2. Connect your GitHub repository
3. **Configuration:**
   - **Name:** `sports-fan-frontend`
   - **Build Command:** Leave empty or `echo "Ready"`
   - **Publish Directory:** `Final_Proj/frontend`
   - **Environment Variables:**
     - `BACKEND_URL` → `https://sports-fan-backend.onrender.com`

4. Click **Create Static Site**

**Option B: Web Service (Alternative)**

1. Click **New +** → **Web Service**
2. **Configuration:**
   - **Name:** `sports-fan-frontend`
   - **Runtime:** `Python 3.11`
   - **Build Command:**
     ```
     cd Final_Proj && pip install flask
     ```
   - **Start Command:**
     ```
     cd Final_Proj && python frontend_server.py
     ```
   - **Environment Variables:**
     - `BACKEND_URL` → `https://sports-fan-backend.onrender.com`

### Step 4: Update Frontend API URL

The frontend needs to know the backend URL. Update `frontend/static/script.js`:

```javascript
// At the top of the file, replace the API_URL detection:
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_URL = isLocalhost 
    ? `http://${window.location.hostname}:9000`
    : 'https://sports-fan-backend.onrender.com';  // Use Render backend URL
```

### Step 5: Database Setup

1. The database will be created automatically on first run
2. The `DATABASE_PATH` should remain as `./backend/data/fan_engagement.db`
3. Data persists in Render's filesystem for free tier

**Note:** For production, consider using:
- PostgreSQL (Render provides this)
- SQLite with backup strategy
- AWS S3 for data backup

### Step 6: Verify Deployment

After services deploy:

1. **Backend Health Check:**
   - Visit: `https://sports-fan-backend.onrender.com/docs` (should show API docs)
   - Or: `https://sports-fan-backend.onrender.com/api/health`

2. **Frontend Access:**
   - Visit the frontend URL from your Static Site
   - Check browser console for API errors
   - Test login functionality

3. **Troubleshoot Issues:**
   - Check Render logs: Dashboard → Service → Logs
   - Look for Python version errors
   - Check environment variables are set

## ⚠️ Python Version Issues & Solutions

**Problem:** Render uses Python 3.10 by default, but dependencies may require 3.11+

**Solution 1: Use runtime.txt**
```
python-3.11.7
```

**Solution 2: Specify in Build Command**
```
apt-get update && apt-get install -y python3.11 && python3.11 -m pip install -r requirements.txt
```

**Solution 3: Update requirements.txt**
Ensure all packages have pre-built wheels for your Python version:
```
fastapi==0.115.0      # Has 3.11 wheels
uvicorn==0.30.0       # Has 3.11 wheels
pydantic==2.10.0      # Has 3.11 wheels
```

## 📋 Checklist

- [ ] `runtime.txt` exists with `python-3.11.7`
- [ ] `Procfile` exists for backend
- [ ] `render.yaml` exists (or services configured manually)
- [ ] All files committed to GitHub
- [ ] Backend service created and running
- [ ] Frontend service created and running
- [ ] Environment variables set in Render
- [ ] Backend URL updated in frontend script
- [ ] Login tested and working
- [ ] Database persisting data

## 🔗 Useful Render Commands

### View Logs
```
# Via Render Dashboard:
Services → Your Service → Logs
```

### Redeploy Service
```
# Via Render Dashboard:
Services → Your Service → Manual Deploy → Deploy latest commit
```

### Environment Variables
```
# Via Render Dashboard:
Services → Your Service → Environment
```

## 💰 Cost Information

**Free Tier Limits:**
- Backend: 0.5 vCPU, 512MB RAM, auto-pauses after 15 mins of inactivity
- Frontend Static: 100GB/month bandwidth
- Database: SQLite (not recommended for production)

**Paid Tier Benefits:**
- Always running (no pauses)
- More resources (1 vCPU, 2GB RAM)
- PostgreSQL database support
- Better uptime guarantee

## 🆘 Common Issues

### Issue 1: Database File Not Found
**Solution:** Render auto-creates the data directory. Check database path is correct.

### Issue 2: CORS Errors
**Solution:** Backend already has CORS enabled. Ensure correct frontend URL is used.

### Issue 3: Static Files Not Loading
**Solution:** Use Static Site service, or ensure Flask server serves static files correctly.

### Issue 4: Python Package Compilation Errors
**Solution:** Use packages with pre-built wheels. Update `requirements.txt` with compatible versions.

## 📞 Need Help?

- Render Support: https://render.com/docs
- FastAPI Docs: https://fastapi.tiangolo.com/deployment/
- Check logs in Render Dashboard for specific errors

---

**Deployment Complete!** Your app is now live on Render with separate frontend and backend services. 🎉
