# 🚀 Deploy CampusRMS Backend to Render

## 📋 Prerequisites
- GitHub account
- Render account (free tier available)
- This code pushed to GitHub

---

## Step 1: Push Code to GitHub

If not already on GitHub:

```bash
cd CampusCRMS-main/CampusRMS/backend
git init
git add .
git commit -m "Prepare for Render deployment"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

---

## Step 2: Create PostgreSQL Database on Render

1. Go to https://dashboard.render.com/
2. Click **"New +"** → **"PostgreSQL"**
3. Fill in:
   - **Name**: `campusrms-db`
   - **Database**: `campusrms_db`
   - **User**: `campusrms_user` (or leave default)
   - **Region**: Choose closest to you
   - **Plan**: Free
4. Click **"Create Database"**
5. **IMPORTANT**: Copy the **Internal Database URL** (starts with `postgresql://`)
   - Example: `postgresql://campusrms_user:password@host/campusrms_db`

---

## Step 3: Create Web Service on Render

1. Click **"New +"** → **"Web Service"**
2. Connect your **GitHub repository**
3. Select the repository with your backend code
4. Fill in:
   - **Name**: `campusrms-backend`
   - **Region**: Same as database
   - **Branch**: `main`
   - **Root Directory**: `CampusCRMS-main/CampusRMS/backend` (if not at repo root)
   - **Runtime**: `Python 3`
   - **Build Command**: `./build.sh`
   - **Start Command**: `gunicorn config.wsgi:application`

---

## Step 4: Add Environment Variables

In the **Environment** section, add these variables:

| Key | Value |
|-----|-------|
| `PYTHON_VERSION` | `3.11.0` |
| `DATABASE_URL` | *Paste the Internal Database URL from Step 2* |
| `SECRET_KEY` | *Generate a new secret key* |
| `DEBUG` | `False` |
| `ALLOWED_HOSTS` | `.onrender.com` |

### Generate a SECRET_KEY:
```python
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

---

## Step 5: Deploy

1. Click **"Create Web Service"**
2. Render will:
   - Install dependencies from `requirements.txt`
   - Run `build.sh` (collects static files, runs migrations, creates admin)
   - Start gunicorn server
3. Wait 5-10 minutes for first deployment
4. Check logs for any errors

---

## Step 6: Update Frontend to Use Render Backend

Update your Vercel frontend environment variables:

```
VITE_API_URL=https://YOUR-SERVICE-NAME.onrender.com
```

Replace `YOUR-SERVICE-NAME` with your actual Render service URL.

---

## Step 7: Test Your Deployment

1. Visit: `https://YOUR-SERVICE-NAME.onrender.com/api/resources/`
2. Should return JSON with resources
3. Login credentials:
   - Email: `admin@campusrms.com`
   - Password: `Admin@12345`

---

## 🔧 Troubleshooting

### Build fails with "ModuleNotFoundError"
- Check that all packages are in `requirements.txt`
- Verify Python version is 3.11

### Database connection fails
- Verify `DATABASE_URL` is set correctly
- Use **Internal Database URL**, not External

### Static files not loading
- Ensure `whitenoise` is in `requirements.txt`
- Check that `./build.sh` runs `collectstatic`

### Free tier limitations
- Render free tier spins down after 15 minutes of inactivity
- First request after spin-down takes ~30 seconds
- Database has 90-day expiry on free tier

---

## 📊 Monitor Your Service

- **Logs**: Dashboard → Your Service → Logs
- **Metrics**: Dashboard → Your Service → Metrics
- **Database**: Dashboard → Your Database → Metrics

---

## 🔐 Security Notes

1. **Never commit sensitive data** to GitHub
2. Use **environment variables** for all secrets
3. Set `DEBUG=False` in production
4. Use strong `SECRET_KEY`
5. Keep dependencies updated

---

## 💰 Cost

**Free Tier Includes:**
- 750 hours/month web service
- PostgreSQL database (90 days, then $7/month)
- 100 GB bandwidth/month

After 90 days, database costs $7/month or migrate to another provider.

---

## ✅ Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] PostgreSQL database created on Render
- [ ] Web service created and linked to GitHub repo
- [ ] Environment variables configured
- [ ] Build successful
- [ ] Can access API endpoints
- [ ] Frontend updated with new backend URL
- [ ] Admin can login
- [ ] Resources loading in frontend

---

## 🎉 Success!

Your backend is now deployed and connected to your Vercel frontend!

**Backend URL**: `https://YOUR-SERVICE-NAME.onrender.com`
**Frontend URL**: `https://campuscrms.netlify.app`
