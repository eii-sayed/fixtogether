# FixTogether — Production Multi-Subdomain Deployment Guide

This guide details how to deploy the **FixTogether** decoupled architecture to production with dedicated web addresses:
- **Public Client Application:** `https://app.fixtogether.com` (or `https://fixtogether.com`)
- **Admin Command Center:** `https://admin.fixtogether.com`
- **Backend API & WebSockets:** `https://api.fixtogether.com`

---

## 1. Domain & DNS Configuration

At your domain registrar or DNS provider (e.g., Cloudflare, Namecheap, GoDaddy, AWS Route 53), configure the following DNS records:

| Record Type | Host / Name | Target / Value | Purpose |
| :--- | :--- | :--- | :--- |
| **A** (or CNAME) | `app` (or `@`) | Your Frontend Server / Vercel CNAME | Public Client Portal |
| **CNAME** | `admin` | Your Admin Server / Vercel CNAME | Standalone Admin Command Center |
| **A** (or CNAME) | `api` | Your Backend VPS IP / Render URL | Express API & WebSocket Server |

---

## 2. Environment Variables Matrix

### A. Backend Server (`server/.env` or Render Environment Variables)
```ini
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/fixtogether?retryWrites=true&w=majority

# Multi-Origin CORS (Permits both Client and Admin applications)
# For Vercel Free Tier:
CLIENT_URL=https://fixtogether.vercel.app
ADMIN_URL=https://fixtogether-admin.vercel.app
# (Or if using custom domains: https://app.fixtogether.com and https://admin.fixtogether.com)

# JWT Secrets (Generate strong random 64-char keys)
JWT_ACCESS_SECRET=your_super_strong_production_access_secret_64chars
JWT_REFRESH_SECRET=your_super_strong_production_refresh_secret_64chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# AI Provider Configuration
AI_PROVIDER=gemini
GEMINI_API_KEY=your_production_google_gemini_api_key
```

### B. Public Client Application (`client/.env.production` or Vercel Environment Variables)
```ini
# Defaults automatically when deployed on vercel.app, or configure manually:
VITE_API_BASE_URL=https://fixtogether-api.onrender.com/api/v1
VITE_SOCKET_URL=https://fixtogether-api.onrender.com
VITE_ADMIN_URL=https://fixtogether-admin.vercel.app
VITE_APP_NAME=FixTogether
```

### C. Standalone Admin Application (`admin/.env.production` or Vercel Environment Variables)
```ini
# Defaults automatically when deployed on vercel.app, or configure manually:
VITE_API_BASE_URL=https://fixtogether-api.onrender.com/api/v1
VITE_PUBLIC_CLIENT_URL=https://fixtogether.vercel.app
```

---

## 3. Deployment Option A: Cloud Platforms (Recommended for Simplicity)

This approach requires **zero server maintenance** and provides automated SSL, CDN edge caching, and auto-deployments on git push.

```
       ┌────────────────────────┐
       │   https://github.com/  │
       └───────────┬────────────┘
                   │ Git Push
      ┌────────────┼────────────┐
      ▼            ▼            ▼
┌───────────┐ ┌───────────┐ ┌───────────┐
│  Client   │ │   Admin   │ │  Server   │
│  (Vercel) │ │  (Vercel) │ │ (Render)  │
└─────┬─────┘ └─────┬─────┘ └─────┬─────┘
      ▼             ▼             ▼
app.fixtogether  admin.fixtogether api.fixtogether
```

### Step 1: Deploy Backend API (Render / Railway / Fly.io)
1. Link your GitHub repository in [Render](https://render.com) or [Railway](https://railway.app).
2. Create a new **Web Service**.
3. Set the **Root Directory** to `server`.
4. Build command: `npm install`
5. Start command: `npm start`
6. Add the environment variables from Section 2A.
7. Under Custom Domains, add `api.fixtogether.com` and point DNS CNAME.

### Step 2: Deploy Public Client (Vercel)
1. In [Vercel](https://vercel.com), click **Add New Project** and import the repository.
2. Under **Root Directory**, click Edit and select `client`.
3. Framework Preset: **Vite**.
4. Add the Environment Variables from Section 2B.
5. Click **Deploy**.
6. In Project Settings ➔ Domains, add `app.fixtogether.com` (or your root domain `fixtogether.com`).

### Step 3: Deploy Standalone Admin (Vercel)
1. In Vercel, click **Add New Project** and import the **same repository** a second time.
2. Under **Root Directory**, click Edit and select `admin`.
3. Framework Preset: **Vite**.
4. Add the Environment Variables from Section 2C.
5. Click **Deploy**.
6. In Project Settings ➔ Domains, add `admin.fixtogether.com`.

*Note: Both `client/vercel.json` and `admin/vercel.json` have been configured so client-side SPA routing works seamlessly without 404s.*

---

## 4. Deployment Option B: Docker Compose on a Single VPS (Ubuntu / AWS / DigitalOcean)

If you prefer hosting everything on a single virtual server ($10–$20/mo droplet or EC2 instance):

### Step 1: Clone Repository on Server
```bash
git clone https://github.com/eii-sayed/fixtogether.git /opt/fixtogether
cd /opt/fixtogether
```

### Step 2: Configure Environment
Copy the production environment variables into their respective `.env` files:
```bash
nano server/.env
```

### Step 3: Build & Launch with Production Docker Compose
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
This boots up 5 containers:
1. `fixtogether-mongodb-prod` (Database)
2. `fixtogether-server-prod` (Express Backend on port 5000)
3. `fixtogether-client-prod` (Nginx serving client static build)
4. `fixtogether-admin-prod` (Nginx serving admin static build)
5. `fixtogether-gateway` (Master Nginx routing requests by subdomain)

### Step 4: Add Free SSL with Certbot
Install Certbot on your host machine to secure all three subdomains:
```bash
sudo apt update && sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d app.fixtogether.com -d admin.fixtogether.com -d api.fixtogether.com
```

---

## 5. Security & Verification Checklist

- [ ] **Cross-Origin Resource Sharing (CORS):** Ensure `server/.env` contains exact domain strings (`https://app.fixtogether.com`, `https://admin.fixtogether.com`) without trailing slashes.
- [ ] **Token Isolation:** Confirm that `localStorage.getItem('adminAccessToken')` is used in the admin app and `localStorage.getItem('accessToken')` in the client app.
- [ ] **Admin Gateway Safeguard:** Try accessing `https://admin.fixtogether.com` using a regular owner or technician account; verify that the login rejects them with `403 Forbidden: Administrator privileges required`.
- [ ] **Public Portal Redirection:** Navigate to `https://app.fixtogether.com/admin` in your browser; verify that it automatically redirects to `https://admin.fixtogether.com/`.
