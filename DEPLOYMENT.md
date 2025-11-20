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

