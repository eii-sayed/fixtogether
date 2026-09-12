# FixTogether: AI-Assisted Community Repair, Reuse, Donation & Forum Platform

[![Live Demo](https://img.shields.io/badge/Live-fixtogether.vercel.app-0ea5e9?style=for-the-badge&logo=vercel)](https://fixtogether.vercel.app/)
[![API Status](https://img.shields.io/badge/API-fixtogether--api.onrender.com-10b981?style=for-the-badge&logo=render)](https://fixtogether-api.onrender.com/api/health)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Real--Time-010101?style=for-the-badge&logo=socket.io)](https://socket.io/)

FixTogether is an enterprise-grade full-stack community platform designed to bridge circular economy workflows: **repairing, reusing, donating, refurbishing, and community knowledge sharing** for electronics, appliances, and home goods.

Built on the MERN stack (MongoDB, Express, React 18, Node.js) with real-time Socket.IO communication, multimodal AI diagnosis (Google Gemini), Facebook-style nested community Q&A forums, deterministic safety governance, transactional outbox event delivery, and fine-grained role-based access control.

---

## 🌐 Live Deployment & Endpoints

| Service | URL | Notes |
|---|---|---|
| **Frontend Web App** | [fixtogether.vercel.app](https://fixtogether.vercel.app/) | Single Page Application deployed on Vercel |
| **Backend API** | [fixtogether-api.onrender.com/api/v1](https://fixtogether-api.onrender.com/api/health) | REST API & Socket.IO server deployed on Render |
| **Health Check** | `/api/health` | High-priority unthrottled uptime heartbeat |

### 🔑 Verified Demonstration Accounts

The platform comes pre-seeded with verified test accounts across all key roles:

| Role | Demo Email | Password | Primary Workspace / Capabilities |
|---|---|---|---|
| **Administrator** | `admin@fixtogether.com` | `Admin123!` | Platform Command Center, Review Queue, Safety Engine, Disputes, User Moderation |
| **Technician** | `sumon@example.com` | `Tech123!` | Quotation Engine, Diagnostic Inspections, Active Repair Jobs, Milestone Tracking |
| **Organization** | `hope@example.com` / `greenrepair@example.com` | `Org1234!` (or `Org123!`) | Donation Offers, Community Needs, Collections, Refurbishment, Impact Tracking |
| **Item Owner** | `rahim@example.com` | `Owner123!` | Digital Garage, AI Repair Diagnostic Assistant, Request Lifecycle, Forum Q&A |

> **Tip**: Quick-login buttons are available directly on the `/login` page for instant role switching during review.

---

## 🌟 Core Feature Matrix

### 1. 💬 Community Forum & Threaded Q&A
- **Thread Post Creation**: Users can ask repair questions, share DIY guides, or request technician recommendations with rich category tagging, item references, and images.
- **Nested Facebook-Style Discussion**: Multi-level hierarchical comment and reply tree allowing deep, context-aware community conversations.
- **Engagement & Reactions**: Upvote counters, helpful reactions, and real-time reply counts.
- **Accepted Answers**: Thread authors can mark the best community answer as "Accepted/Solved", highlighting the resolution for future users.
- **Discovery & Search**: Real-time keyword search, filter by category (`Repair Help`, `DIY Projects`, `Parts Recommendation`, etc.), and filter by resolution status.

### 2. 🛡️ Administrator Command Center & Governance Hub
- **Unified Responsive Sidebar**: Modern navigation layout with collapsible sidebar, instant search (`Ctrl+K`), and live badge indicators for urgent tasks.
- **Triage Review Queue**: Centralized queue for flagged content, license verification requests, and pending dispute claims with optimistic locking.
- **Dispute Arbitration Bench**: Structured dispute handling with evidence evaluation, internal admin notes, and binding resolution actions.
- **User Governance**: Role filtering, account suspension/activation, compliance warning logs, and last-admin safeguards.
- **Safety Rule Engine**: Deterministic regex and keyword rules intercepting hazardous DIY instructions (high voltage, microwave transformers, swollen lithium batteries).
- **Taxonomy & Category Editor**: Dynamic item category and repair skill tree manager with synonym merging.
- **Audit & AI Ledger**: Immutable audit log tracing all administrative actions, correlation IDs, and AI usage metrics.

### 3. 🤝 Organization & Donation Operations
- **Donation Marketplace**: Public listing of available items for donation and community needs (`/donations`, `/donations/new`).
- **Direct Claim & Match Workflow**: Organizations can claim donated items and manage doorstep collection schedules.
- **Refurbishment Pipeline**: Multi-stage tracking from intake inspection, sanitization, part replacement, testing, to redistribution.
- **Environmental Impact Metrics**: Automatic tracking of e-waste diverted from landfills (kg) and community economic value generated.

### 4. 🔧 Technician Workspace
- **Quotation System**: Itemized bidding with transparent labor costs, parts breakdown, estimated turnaround, and warranty terms.
- **Active Repair Jobs**: Milestone tracker (`Diagnosing`, `Awaiting Parts`, `Repairing`, `Ready for Pickup`, `Completed`).
- **Real-Time Messaging**: Repair-request-scoped direct chat with typing indicators and status updates.
- **Technician Public Profile**: Skill badges, trade verification status, customer ratings, and completed job showcase.

### 5. 📦 Owner & Digital Garage
- **Digital Garage**: Catalog owned appliances and devices with purchase history, specs, and condition logs.
- **Multimodal AI Diagnosis**: Interactive floating AI assistant powered by Google Gemini (with Pro to Flash fallback) analyzing photos and symptoms.
- **Deterministic Safety Interceptor**: Automatically blocks dangerous DIY repairs before AI generation, providing safety warnings and advising professional technician intake.
- **Quotation Comparison & Technician Assignment**: Inspect bids side-by-side, view technician credentials, and award jobs with one click.
- **Real-Time Notification Hub**: Live unread badge count, filter by unread status, mark-all-as-read, and direct deep-linking to related entities.

---

## 🛠️ Technology Stack

```
Frontend:
├── React 18 & Vite (Blazing-fast SPA architecture)
├── Vanilla CSS Design Tokens (Responsive dark & light mode)
├── TanStack Query v5 (Server-state caching & optimistic updates)
├── React Hook Form & Zod / Joi (Input validation)
├── React Router DOM v6 (Nested and role-protected routes)
├── Socket.IO Client (Real-time events & chat)
├── Lucide React (Streamlined modern icon library)
└── Sonner (Accessible toast notifications)

Backend:
├── Node.js & Express.js (RESTful API & WebSocket gateway)
├── MongoDB & Mongoose (Document database with compound indexes)
├── JWT Authentication (Access tokens + HTTP-only rotating refresh tokens)
├── Socket.IO (Authenticated room-based pub/sub with JWT handshake)
├── Google Gemini API (Multimodal visual inspection & symptom analysis)
├── Winston & Morgan (Structured logging with correlation IDs)
├── Multer & Cloudinary (Image upload with local disk fallback)
├── Helmet, CORS & Express Rate Limit (Defense-in-depth API security)
└── Supertest & Jest (Integration & API test suites)
```

---

## 🏗️ Architecture & Engineering Highlights

```
                          ┌──────────────────────────┐
                          │   React 18 SPA (Vite)    │
                          └─────────────┬────────────┘
                                        │ HTTPS / WSS
                                        ▼
                          ┌──────────────────────────┐
                          │     Express.js API       │
                          ├──────────────────────────┤
                          │ • Helmet / CORS / Limiter│
                          │ • JWT & Refresh Cookies  │
                          │ • Central RBAC Matrix    │
                          │ • Safety Interceptor     │
                          └───────┬───────────┬──────┘
                                  │           │
                     Database I/O │           │ Transactional Outbox
                                  ▼           ▼
                         ┌─────────────┐  ┌──────────────────┐
                         │   MongoDB   │  │ Outbox Worker    │
                         │   Atlas     │  │ (At-Least-Once)  │
                         └─────────────┘  └─────────┬────────┘
                                                    │
                                                    ▼
                                          ┌──────────────────┐
                                          │ Socket.IO Server │
                                          │ (Real-Time Push) │
                                          └──────────────────┘
```

1. **Centralized RBAC Matrix**: Fine-grained permissions (`repair_request.*`, `quotation.*`, `repair_job.*`, `donation_offer.*`, `admin.*`) decoupling controller endpoints from hardcoded roles.
2. **Deterministic Safety Guardrails**: Server-side interceptor parsing hardware symptoms against high-voltage, microwave capacitor, and lithium battery swell risks before any generative AI prompt runs.
3. **Transactional Outbox Worker**: Guarantees reliable, at-least-once notification and WebSocket push delivery across state transitions even under transient network spikes.
4. **JWT Rotation with Reuse Detection**: Access tokens paired with rotating HTTP-only refresh tokens. If a token reuse anomaly occurs, the entire refresh family is invalidated immediately.

---

## 🚀 Quick Start & Local Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB**: Local MongoDB daemon or MongoDB Atlas URI

### 1. Clone the Repository
```bash
git clone https://github.com/eii-sayed/fixtogether.git
cd fixtogether
```

### 2. Install Dependencies
```bash
# Installs root, client, and server dependencies in one step
npm run install:all
```

### 3. Environment Configuration

Copy example environment files:
```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

**Server Configuration (`server/.env`):**
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/fixtogether
JWT_ACCESS_SECRET=your_super_secret_access_key_min_32_chars
JWT_REFRESH_SECRET=your_super_secret_refresh_key_min_32_chars
AI_PROVIDER=mock
# Optional: GEMINI_API_KEY=your_gemini_api_key
# Optional: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
```

**Client Configuration (`client/.env`):**
```env
VITE_API_URL=http://localhost:5000/api/v1
VITE_SOCKET_URL=http://localhost:5000
```

### 4. Seed Database

Populate the database with complete mock data across all modules:
```bash
# Seed core users, categories, skills, safety rules, items, requests & quotations
npm run seed

# Seed community donation marketplace and NGO needs
npm run seed:donations

# Seed community Q&A forum threads, nested comments, and replies
npm run seed:threads
```

### 5. Start Development Servers
```bash
npm run dev
```
- **Frontend Application**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000/api/v1`
- **Health Check**: `http://localhost:5000/api/health`

---

## 🧪 Testing & Quality Assurance

FixTogether includes comprehensive backend test suites covering API contracts, authorization matrices, edge cases, and safety interceptors.

### Run Backend Tests (Jest & Supertest)
```bash
npm run test:server
```

### Run Frontend Tests (Vitest)
```bash
npm run test:client
```

### Production Build Verification
```bash
npm run build
```

---

## 📡 API Endpoint Overview

| Resource | Method | Path | Description | Access |
|---|---|---|---|---|
| **Auth** | `POST` | `/api/v1/auth/register` | Register new user account | Public |
| | `POST` | `/api/v1/auth/login` | Login & receive JWT + HTTP-only cookie | Public |
| | `POST` | `/api/v1/auth/refresh` | Rotate refresh token & get new access token | Public |
| | `POST` | `/api/v1/auth/logout` | Clear refresh token session | Authenticated |
| **Threads (Forum)** | `GET` | `/api/v1/threads` | List forum threads (search, filter, paginate) | Public |
| | `POST` | `/api/v1/threads` | Create new thread post / question | Authenticated |
| | `GET` | `/api/v1/threads/:id` | Get thread details & nested comments | Public |
| | `POST` | `/api/v1/threads/:id/comments` | Post comment / reply to thread | Authenticated |
| | `POST` | `/api/v1/threads/:id/upvote` | Upvote / toggle helpful vote on thread | Authenticated |
| | `PATCH` | `/api/v1/threads/:id/solve` | Mark comment as accepted solution | Thread Author |
| **Repair Requests** | `GET` | `/api/v1/repair-requests` | List repair requests with role filters | Authenticated |
| | `POST` | `/api/v1/repair-requests` | Create repair request from digital item | Item Owner |
| | `GET` | `/api/v1/repair-requests/:id` | Full request details, timeline, and quotes | Authenticated |
| | `GET` | `/api/v1/repair-requests/:id/matches` | Matched technician recommendations | Authenticated |
| **Quotations** | `POST` | `/api/v1/quotations` | Technician submits repair quote | Technician |
| | `PATCH` | `/api/v1/quotations/:id/accept` | Owner accepts quote & assigns job | Item Owner |
| **Donations** | `GET` | `/api/v1/donations` | List donation offers & community needs | Public / Auth |
| | `POST` | `/api/v1/donations` | Publish item donation offer | Authenticated |
| **Notifications** | `GET` | `/api/v1/notifications` | Get user notifications (supports `unreadOnly=true`) | Authenticated |
| | `GET` | `/api/v1/notifications/unread-count` | Real-time badge counter | Authenticated |
| | `PATCH` | `/api/v1/notifications/read-all` | Mark all user notifications as read | Authenticated |
| **Admin** | `GET` | `/api/v1/admin/review-queue` | Unified triage bench for reports & safety flags | Admin |
| | `GET` | `/api/v1/admin/audit-logs` | Immutable audit log trail | Admin |

---

## 🐳 Docker Deployment

To run FixTogether inside a containerized environment:

```bash
docker compose up --build
```

---

## 📄 License & Attribution

University Software Engineering Capstone Project authored by [Abu Sayed](https://github.com/eii-sayed).  
Licensed under the [MIT License](LICENSE).