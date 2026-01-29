# 🚀 Sports Fan Arena - Modal Deployment Quick Start

## One-Time Setup (5 minutes)

### 1. Install Modal CLI
```bash
pip install modal
```

### 2. Authenticate
```bash
modal token new
# Opens browser to authenticate
```

### 3. Verify Configuration
```bash
chmod +x deploy_modal.sh
./deploy_modal.sh
```

---

## Deploy (30 seconds)

### Option 1: Production Deployment
```bash
modal deploy modal_app.py
```
✅ Your app goes live with a public URL

### Option 2: Test First (Local)
```bash
modal run modal_app.py
```
✅ Test everything before deploying

---

## After Deployment

1. **Find your URL**
   ```bash
   modal list
   # Look for sports-fan-arena in the list
   ```

2. **View your app**
   - Open the provided URL (e.g., `https://username--sports-fan-arena.modal.run`)

3. **Monitor logs**
   ```bash
   modal tail sports-fan-arena
   ```

4. **Update OPENROUTER_API_KEY**
   ```bash
   modal env set OPENROUTER_API_KEY "your_key_here"
   ```

---

## File Descriptions

| File | Purpose |
|------|---------|
| `modal_app.py` | Main Modal configuration (both servers) |
| `requirements.txt` | Python dependencies |
| `.env` | Local environment variables |
| `MODAL_DEPLOYMENT.md` | Full deployment guide |
| `deploy_modal.sh` | Setup verification script |

---

## Key Features

✅ **Persistent Database** - Uses Modal Volumes (data survives restarts)
✅ **Both Servers** - Frontend (8000) + Backend (9000) on same deployment
✅ **Public URL** - Instantly accessible from anywhere
✅ **No Server Management** - Modal handles scaling & infrastructure
✅ **Free Tier Available** - Great for testing

---

## Troubleshooting

**App crashes?**
```bash
modal tail sports-fan-arena --follow
```

**Redeploy with latest code?**
```bash
modal deploy modal_app.py --force
```

**Check what's running?**
```bash
modal list
modal logs sports-fan-arena
```

**Remove app?**
```bash
modal app delete sports-fan-arena
```

---

## What's Different from Local?

| Aspect | Local | Modal |
|--------|-------|-------|
| URL | `localhost:8000` | `https://app.modal.run` |
| Data | Temporary | Persistent (volume) |
| Access | Local only | Public worldwide |
| Uptime | Manual | 24/7 (when in use) |
| Cost | Free | Free tier generous |

---

## Next: Add to GitHub (Optional)

```bash
git add modal_app.py MODAL_DEPLOYMENT.md deploy_modal.sh
git commit -m "feat: Add Modal deployment configuration"
git push origin main
```

---

**Ready? Run:** `modal deploy modal_app.py` 🎉
