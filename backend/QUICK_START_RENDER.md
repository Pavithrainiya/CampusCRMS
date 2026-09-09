# ⚡ Quick Start - Deploy to Render in 10 Minutes

## 🎯 What You'll Do:
1. Push code to GitHub (5 min)
2. Create database on Render (2 min)
3. Deploy backend on Render (3 min)

---

## Step 1: Push to GitHub (If Not Already)

```powershell
# Navigate to backend folder
cd CampusCRMS-main\CampusRMS\backend

# Initialize git
git init
git add .
git commit -m "Initial commit for Render deployment"

# Create repo on GitHub (do this manually on GitHub.com)
# Then connect and push:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

---

## Step 2: Create Database (2 minutes)

1. Go to: https://dashboard.render.com/
2. Sign up/login with GitHub
3. Click **New +** → **PostgreSQL**
4. Settings:
   - Name: `campusrms-db`
   - Database: `campusrms_db`  
   - Region: Oregon (or closest)
   - Plan: **Free**
5. Click **Create Database**
6. **Copy the "Internal Database URL"** - you'll need this!

---

## Step 3: Deploy Backend (3 minutes)

1. Click **New +** → **Web Service**
2. Connect your GitHub repo
3. Settings:
   - Name: `campusrms-backend`
   - Region: **Same as database**
   - Root Directory: Leave empty if backend is at repo root, otherwise: `CampusCRMS-main/CampusRMS/backend`
   - Runtime: `Python 3`
   - Build Command: `chmod +x build.sh && ./build.sh`
   - Start Command: `gunicorn config.wsgi:application`

4. **Environment Variables** (click "Add Environment Variable"):

```
PYTHON_VERSION = 3.11.0
DATABASE_URL = [Paste your Internal Database URL here]
SECRET_KEY = [Generate new key - see below]
DEBUG = False
```

### Generate SECRET_KEY:
Open PowerShell in your project folder and run:
```powershell
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

5. Click **Create Web Service**

---

## Step 4: Wait for Build (5-10 minutes)

Watch the logs. You should see:
```
==> Installing dependencies from requirements.txt
==> Running build.sh
==> Collecting static files
==> Running migrations
==> Creating admin user
==> Creating sample resources
==> Deploy successful!
```

---

## Step 5: Test Your Backend

Your backend URL will be: `https://campusrms-backend.onrender.com`

Test it:
1. Open browser: `https://YOUR-SERVICE-NAME.onrender.com/api/resources/`
2. Should see JSON with 12 resources
3. Try login: `https://YOUR-SERVICE-NAME.onrender.com/api/login/`

---

## Step 6: Update Frontend (Vercel)

In your Vercel project settings, add environment variable:

```
VITE_API_URL = https://YOUR-SERVICE-NAME.onrender.com
```

Redeploy your frontend.

---

## ✅ Done!

🎉 Your full-stack app is now live:

- **Frontend**: https://campuscrms.netlify.app
- **Backend**: https://YOUR-SERVICE-NAME.onrender.com
- **Database**: PostgreSQL on Render

---

## 🔑 Admin Login:
- Email: `admin@campusrms.com`
- Password: `Admin@12345`

---

## ⚠️ Important Notes:

1. **Free tier sleeps after 15 min** - First request takes 30 seconds to wake up
2. **Database expires in 90 days** - You'll need to upgrade or migrate
3. **Keep your SECRET_KEY secret** - Never commit to GitHub!

---

## 🆘 Need Help?

**Build failing?**
- Check logs in Render dashboard
- Verify all environment variables are set
- Ensure `build.sh` has correct path

**Can't connect to database?**
- Use **Internal Database URL**, not External
- Check DATABASE_URL format: `postgresql://user:pass@host:port/dbname`

**CORS errors?**
- Add your frontend URL to ALLOWED_HOSTS in settings.py
- Check CORS_ALLOWED_ORIGINS includes your frontend URL

---

## 📚 Full Documentation

See `RENDER_DEPLOYMENT.md` for detailed instructions.
