# Modal Deployment Guide for Sports Fan Arena

## Prerequisites
- Modal account (already have ✅)
- Modal CLI installed
- GitHub repo access

## Quick Start

### 1. Install Modal CLI
```bash
pip install modal
```

### 2. Authenticate with Modal
```bash
modal token new
```
This will open your browser to authenticate and create a token.

### 3. Deploy to Modal

#### Option A: Simple Deployment (Recommended for first time)
```bash
cd /Users/prabinroka/Desktop/Capstone-CSCI-480-/Final_Proj
modal deploy modal_app.py
```

#### Option B: Run in Development Mode
```bash
modal run modal_app.py
```

### 4. Get Your Public URL
After deployment, Modal will provide a public URL like:
```
https://your-username--sports-fan-arena-app.modal.run
```

Visit this URL to access your app!

---

## Environment Variables

Modal reads from your local `.env` file. Make sure you have:

```env
OPENROUTER_API_KEY=your_key_here
DATABASE_PATH=./backend/data/fan_engagement.db
```

To set on Modal:
```bash
modal env set OPENROUTER_API_KEY "your_key_here"
```

---

## File Structure for Modal

```
Final_Proj/
├── modal_app.py              # Modal configuration
├── requirements.txt          # Python dependencies
├── .env                      # Environment variables
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── agent/
│   │   ├── memory/
│   │   └── predictions/
│   └── data/
│       └── fan_engagement.db
└── frontend/
    ├── index.html
    ├── styles.css
    ├── script.js
    └── static/
        ├── script.js
        └── styles.css
```

---

## Important Notes

### Database Persistence
- **Current**: SQLite database - data resets when container restarts
- **Recommendation**: For production, migrate to PostgreSQL or use Modal's Volume mounts

To add volume persistence:
```python
volume = modal.Volume.from_name("sports-fan-data", create_if_missing=True)
```

### API Endpoints
- **Frontend**: `https://your-url.modal.run`
- **Backend API**: `https://your-url.modal.run` (same domain, port 9000)
- **Frontend automatically detects**: Backend at `{current_domain}:9000`

### Performance
- Modal allocates 1GB RAM by default
- For better performance, update in `modal_app.py`:
```python
@app.function(
    image=image,
    memory=2048,  # 2GB
    cpu=2.0,
    timeout=3600,
    concurrency_limit=10
)
```

---

## Troubleshooting

### Check Logs
```bash
modal tail sports-fan-arena
```

### Check Status
```bash
modal list
```

### Redeploy with Latest Code
```bash
modal deploy modal_app.py --force
```

### Connection Issues
If frontend can't connect to backend:
1. Check that both ports (8000, 9000) are accessible
2. Verify `API_URL` in frontend/static/script.js
3. Check CORS headers in backend/app/main.py

---

## Next Steps

1. ✅ Install Modal CLI
2. ✅ Run `modal token new`
3. ✅ Deploy: `modal deploy modal_app.py`
4. ✅ Visit your public URL
5. ✅ Test the app!

**Questions?** Check Modal docs: https://modal.com/docs
