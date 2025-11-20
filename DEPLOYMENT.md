# QueryViz Deployment Guide (Render.com)

## 🚀 Quick Deploy to Render

### Prerequisites
- GitHub repository with your code pushed
- OpenAI API key
- Render.com account (free tier available)

### Step 1: Prepare Your Repository

1. **Ensure all changes are committed:**
```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### Step 2: Deploy on Render

#### Option A: Using render.yaml (Recommended)

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Blueprint"**
3. Connect your GitHub repository
4. Render will automatically detect `render.yaml`
5. Set the environment variable:
   - `OPENAI_API_KEY`: Your OpenAI API key
6. Click **"Apply"**

#### Option B: Manual Setup

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name**: queryviz
   - **Runtime**: Node
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free
5. Add Environment Variables:
   - `NODE_ENV` = `production`
   - `PORT` = `5000`
   - `OPENAI_API_KEY` = Your OpenAI API key
   - `FRONTEND_URL` = Your Render app URL (e.g., https://queryviz.onrender.com)
6. Click **"Create Web Service"**

### Step 3: Monitor Deployment

1. Watch the build logs in Render dashboard
2. Deployment takes 5-10 minutes on free tier
3. Once deployed, your app will be live at: `https://queryviz.onrender.com` (or your custom URL)

### Step 4: Update Frontend URL

After first deployment:
1. Copy your Render app URL
2. Go to **Environment** tab in Render dashboard
3. Update `FRONTEND_URL` to your actual URL
4. Save changes (triggers auto-redeploy)

## 🔧 Environment Variables

Required for production:

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Enables production optimizations |
| `PORT` | `5000` | Server port (auto-set by Render) |
| `OPENAI_API_KEY` | Your API key | OpenAI authentication |
| `FRONTEND_URL` | Your Render URL | CORS configuration |

## 📦 Build Process

The build process runs automatically:

```bash
# 1. Install dependencies
npm install

# 2. Build frontend (React + Vite)
cd frontend && npm install && npm run build

# 3. Build backend (TypeScript)
cd backend && npm install && npm run build

# 4. Start server (serves frontend + API)
cd backend && npm start
```

## 🏗️ Architecture

```
Production Server (Render)
│
├── Backend (Express)
│   ├── /api/analyze/* (REST API)
│   ├── /health (Health check)
│   └── /* (Serves static frontend)
│
└── Frontend (Static Build)
    └── /frontend/dist/* (React SPA)
```

## ✅ Verify Deployment

1. **Health Check**: Visit `https://your-app.onrender.com/health`
   - Should return: `{"status":"ok","timestamp":"..."}`

2. **Frontend**: Visit `https://your-app.onrender.com`
   - Should load the QueryViz homepage

3. **API Test**: Try analyzing a query plan
   - Paste a PostgreSQL EXPLAIN JSON
   - Click "Analyze Query"
   - Should return AI analysis

## 🐛 Troubleshooting

### Build Fails

**Issue**: "Cannot find module..."
**Solution**: Check that all dependencies are in `package.json`, not just devDependencies

**Issue**: "Build command failed"
**Solution**: Verify build locally first:
```bash
npm run build
npm start
```

### Runtime Errors

**Issue**: "OPENAI_API_KEY environment variable is not set"
**Solution**: Add the environment variable in Render dashboard

**Issue**: "Cannot serve frontend files"
**Solution**: Ensure frontend builds successfully and `dist` folder exists

**Issue**: CORS errors
**Solution**: Update `FRONTEND_URL` to match your Render app URL exactly

### Performance Issues

**Free Tier Limitations**:
- Spins down after 15 minutes of inactivity
- First request after spin-down takes ~30 seconds
- 512 MB RAM limit

**Upgrade to Starter Plan** ($7/month):
- Always-on instances
- 512 MB RAM
- Better performance

## 🔄 Continuous Deployment

Render automatically redeploys when you push to GitHub:

```bash
git add .
git commit -m "Update feature"
git push origin main
# Render automatically rebuilds and deploys
```

## 📊 Monitoring

1. **Logs**: View in Render dashboard under "Logs" tab
2. **Metrics**: Check "Metrics" tab for CPU/RAM usage
3. **Health Check**: Render pings `/health` every 5 minutes

## 💰 Cost Estimate

| Tier | Cost | Features |
|------|------|----------|
| **Free** | $0/month | 750 hours/month, sleeps after 15min inactivity |
| **Starter** | $7/month | Always-on, 512MB RAM, better performance |
| **Standard** | $25/month | 2GB RAM, more resources |

**Recommendation**: Start with Free tier, upgrade if needed.

## 🔐 Security Best Practices

1. **Never commit `.env` files** (already in `.gitignore`)
2. **Use Render's secret storage** for `OPENAI_API_KEY`
3. **Enable rate limiting** (already configured: 50 req/15min)
4. **Keep dependencies updated**: `npm audit fix`

## 📚 Additional Resources

- [Render Node.js Deployment Guide](https://render.com/docs/deploy-node-express-app)
- [Render Environment Variables](https://render.com/docs/environment-variables)
- [Render Free Tier Limits](https://render.com/docs/free)

---

**Need Help?** Check Render's logs first - they're very detailed and usually point to the exact issue.
