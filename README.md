# FixTogether: AI-Assisted Community Repair & Donation Platform

[![Live Demo](https://img.shields.io/badge/Live-fixtogether.vercel.app-0ea5e9?style=for-the-badge&logo=vercel)](https://fixtogether.vercel.app)
[![API](https://img.shields.io/badge/API-fixtogether--api.onrender.com-10b981?style=for-the-badge&logo=render)](https://fixtogether-api.onrender.com/api/health)

FixTogether is a full-stack community platform that helps people **repair, reuse, donate**, and **responsibly recycle** damaged or unwanted items. Built with the MERN stack, it connects item owners with verified technicians, donation organizations, and recycling facilities.

A core feature is the **AI-Powered Diagnosis & Safety Engine**, which analyzes problem descriptions to suggest repair pathways, flag safety hazards, and match users with appropriate technicians.

## 🌐 Live Demo

| Service | URL |
|---------|-----|
| **Frontend** | [fixtogether.vercel.app](https://fixtogether.vercel.app) |
| **Backend API** | [fixtogether-api.onrender.com](https://fixtogether-api.onrender.com/api/health) |

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@fixtogether.com` | `Admin123!` |
| Owner | `rahim@example.com` | `Owner123!` |
| Technician | `sumon@example.com` | `Tech123!` |
| Organization | `hope@example.com` | `Org1234!` |

> **Note:** The Render free tier may take ~30 seconds to spin up on first request if the server has been idle.

## ✨ Features

- **Multi-Role System** — Distinct workflows for Item Owners, Technicians, Organizations, and Admins
- **AI Diagnosis** — Analyzes repair requests to extract symptoms, suggest pathways, and identify required skills
- **Safety First Engine** — Intercepts descriptions with dangerous keywords (e.g., "spark", "swollen battery") to flag risks and block unsafe AI advice
- **Smart Matching** — Connects owners with technicians based on skills, categories, and availability
- **Quotation System** — Transparent quoting with labor, parts, and warranty breakdowns
- **End-to-End Tracking** — Real-time status updates (Draft → Published → Awaiting Quotes → In Progress → Completed)
- **Donations & Recycling** — Dedicated flow for unrepairable items, connecting to verified charities or recyclers
- **Real-time Notifications** — Socket.IO integration for instant alerts

## 🛠 Technology Stack

### Frontend
- React 18, Vite, Tailwind CSS
- TanStack Query (React Query), React Hook Form, Zod
- React Router, Sonner (toast notifications)
- Lucide React (icons), Leaflet (maps)

### Backend
- Node.js, Express.js, MongoDB (Mongoose)
- JWT Authentication (Access & Refresh tokens), HTTP-only cookies
- Socket.IO (real-time), Winston (logging)
- Joi (validation), Multer (file uploads)
- Helmet, CORS, express-rate-limit (security)

### Infrastructure
- **Frontend Hosting**: Vercel
- **Backend Hosting**: Render
- **Database**: MongoDB Atlas
- **File Storage**: Cloudinary (with local fallback)
- **AI**: OpenAI API (with mock provider for development)

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas URI)

### 1. Clone & Install
```bash
git clone https://github.com/eii-sayed/fixtogether.git
cd fixtogether
npm run install:all
```

### 2. Configure Environment
Copy and configure the example env files:
```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```
Edit `server/.env` with your MongoDB URI and other settings.

### 3. Seed the Database
```bash
npm run seed
```
Check the console output for demo login credentials.

### 4. Run Development Server
```bash
npm run dev
```
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000/api/v1

### Docker (Alternative)
```bash
docker compose up
```

## 🧪 Testing

```bash
# Backend tests
npm run test:server

# Frontend tests
npm run test:client
```

## 📁 Project Structure

```
fixtogether/
├── client/                  # React frontend (Vite)
│   ├── src/
│   │   ├── api/             # Axios API client
│   │   ├── components/      # Reusable UI components
│   │   ├── context/         # React context (Auth)
│   │   └── pages/           # Route pages
│   └── vercel.json          # Vercel SPA routing config
├── server/                  # Express.js backend
│   ├── src/
│   │   ├── config/          # App configuration
│   │   ├── controllers/     # Route handlers
│   │   ├── middleware/      # Auth, validation, error handling
│   │   ├── models/          # Mongoose schemas
│   │   ├── routes/          # API route definitions
│   │   ├── services/        # Business logic (AI, matching, safety)
│   │   ├── validators/      # Joi validation schemas
│   │   └── scripts/         # Database seeding
│   └── tests/               # Jest test suites
├── docker-compose.yml       # Docker development setup
└── package.json             # Root workspace scripts
```

## 🔑 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/register` | Register new user |
| `POST` | `/api/v1/auth/login` | Login |
| `GET` | `/api/v1/auth/me` | Get current user |
| `GET` | `/api/v1/items` | List items |
| `POST` | `/api/v1/items` | Create item |
| `GET` | `/api/v1/repair-requests` | List repair requests |
| `POST` | `/api/v1/repair-requests` | Create repair request |
| `GET` | `/api/v1/technicians` | List technicians |
| `GET` | `/api/v1/donations` | List donations |
| `GET` | `/api/v1/categories` | List categories |
| `GET` | `/api/v1/notifications` | List notifications |
| `GET` | `/api/v1/admin/dashboard` | Admin dashboard stats |

## 📝 Design Decisions

1. **AI Abstraction** — Factory pattern with `mock` and `openai` providers. Mock provider runs without API costs during development.
2. **Safety Engine** — Deterministic keyword-based safety checks run *before* AI analysis. Hardcoded rules ensure critical hazards (battery fires, electric shocks) are flagged instantly without relying on LLM accuracy.
3. **JWT Strategy** — Access tokens (15min) + Refresh tokens (7 days) with rotation. Refresh tokens stored in HTTP-only cookies with `SameSite=None` for cross-origin deployment.
4. **Payments** — Cost tracking is internal. Payment gateway integration (Stripe/PayPal) is architected for future phases.
5. **No TypeScript** — Standard JavaScript with strict runtime validation via Joi (backend) and Zod (frontend).

## 👤 Author

University Software Engineering Project by [Abu Sayed](https://github.com/eii-sayed)
