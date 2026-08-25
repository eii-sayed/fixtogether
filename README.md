# FixTogether: AI-Assisted Community Repair, Reuse, Donation & Governance Platform

[![Live Demo](https://img.shields.io/badge/Live-fixtogether.vercel.app-0ea5e9?style=for-the-badge&logo=vercel)](https://fixtogether.vercel.app/)
[![API Status](https://img.shields.io/badge/API-fixtogether--api.onrender.com-10b981?style=for-the-badge&logo=render)](https://fixtogether-api.onrender.com/api/health)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Real--Time-010101?style=for-the-badge&logo=socket.io)](https://socket.io/)

FixTogether is a full-stack, enterprise-grade community platform designed to bridge circular economy workflows: **repairing, reusing, donating, refurbishing, and responsibly recycling** electronics, appliances, and home goods.

Built on the MERN stack (MongoDB, Express, React 18, Node.js) with real-time Socket.IO communication, deterministic safety governance, transactional outbox processing, and fine-grained role-based access control.

---

## 🌐 Live Demo & Endpoints

| Service | URL | Notes |
|---|---|---|
| **Frontend Web App** | [fixtogether.vercel.app](https://fixtogether.vercel.app/) | Single Page Application deployed on Vercel |
| **Backend API** | [fixtogether-api.onrender.com/api/v1](https://fixtogether-api.onrender.com/api/health) | REST API & Socket.IO server deployed on Render |
| **Health Check** | `/api/health` | Unthrottled uptime & heartbeat endpoint |

### Demo Accounts & Quick Login

Pre-configured demo accounts for all primary roles can be seeded into the database with one command:

```bash
npm run seed
```

| Role | Demo Email | Default Password | Primary Workspace / Capabilities |
|---|---|---|---|
| **Administrator** | `admin@fixtogether.com` | `Admin@123456` | Platform Command Center, Review Queue, Safety Engine, Disputes, User Moderation |
| **Technician** | `sumon@electronics.com` | `Tech@123456` | Quotation Engine, Diagnostic Inspections, Active Repair Jobs, Milestones |
| **Organization** | `contact@greenearth.org` | `Org@123456` | Donation Offers, Community Needs, Collections, Refurbishment, Impact Reports |
| **Item Owner** | `rahim@example.com` | `Owner@123456` | Digital Garage, AI Repair Diagnostic Assistant, Request Lifecycle, Direct Chat |

*Quick login buttons are also available on the `/login` screen for immediate one-click evaluation.*

---

## 🌟 Core Feature Matrix

### 1. 🛡️ Administrator Command Center & Governance Hub
- **Unified Admin Sidebar**: Responsive, collapsible left navigation panel with live urgent badge counts, quick search (`Ctrl+K`), and mobile drawer.
- **Unified Review Queue**: Real-time triage bench for critical safety hazards, license verifications, disputes, and stalled requests with optimistic concurrency locking.
- **Dispute Arbitration**: Formal mediation workspace supporting evidence review, requesting missing info, private notes, and binding dispute resolution.
- **User Governance**: Role filtering, instant search, compliance warnings, temporary/permanent suspensions, session revocation, with last-admin safeguards.
- **Verification Bench**: Dual-tab review for Technician Trade Licenses and NGO Certifications with document preview.
- **Deterministic Safety Engine**: Keyword and regular expression safety rules with live Regex Sandbox simulation and version rollback.
- **Taxonomy & Skills**: Category tree editor, skill manager, and synonym merger with technician profile impact analysis.
- **Audit & AI Ledger**: Immutable audit log tracing, correlation ID tracking, AI provider metrics, and background CSV export jobs.

### 2. 🤝 Organization & Donation Operations
- **Unified Workspace**: Multi-stage donation triage, collection scheduler, and refurbishment processing pipeline.
- **Donation Needs**: Publish community requirements with target quantities and urgency levels.
- **Refurbishment Lifecycle**: Step-by-step diagnostic triage, sanitization, testing, and redistribution tracking.
- **Impact Metrics**: Automatic calculation of e-waste diverted (kg) and community economic value generated.

### 3. 🔧 Technician Workspace
- **Quotation System**: Granular breakdowns for labor, parts, estimated completion time, and warranty terms.
- **Active Repair Jobs**: Milestones tracker (received, diagnosing, awaiting parts, repairing, ready for collection).
- **Direct Messaging**: Request-scoped real-time messaging with typing indicators, read receipts, and status templates.

### 4. 📦 Owner & Digital Garage
- **Digital Garage**: Catalog personal devices, condition history, and maintenance records.
- **AI Diagnostic Assistant**: Extracts hardware symptoms, identifies required repair skills, and assesses feasibility.
- **Deterministic Safety Interceptor**: Automatically blocks AI advice and flags high-voltage, battery swell, or gas hazards.
- **Quotation Comparison**: Compare bids, inspect technician credentials, and accept quotes.
- **Financial Transparency**: Clear disclaimers that repair fees are settled directly between owner and technician.

---

## 🛠️ Technology Stack

```
Frontend:
├── React 18 & Vite (Ultra-fast SPA bundle)
├── Tailwind CSS (Vanilla design system with dark & light tokens)
├── TanStack Query (v5 Centralized query keys, caching, and optimistic updates)
├── React Hook Form & Zod (Client-side schema validation)
├── React Router DOM (v6 Nested route architecture)
├── Socket.IO Client (Authenticated real-time bi-directional events)
├── Lucide React & Leaflet (Icons & interactive geo-mapping)
└── Sonner (Accessible toast notifications)

Backend:
├── Node.js & Express.js (REST API & WebSockets)
├── MongoDB & Mongoose (Document store with schema indexing)
├── JWT (Short-lived access tokens + HTTP-only rotating refresh tokens)
├── Socket.IO (Authenticated room-based pub/sub with JWT handshake)
├── Winston & Morgan (Structured JSON logging & correlation tracking)
├── Joi (Server-side schema validation)
├── Multer & Cloudinary (Multipart media upload with local fallback)
├── Helmet & CORS (Defense-in-depth HTTP headers)
└── express-rate-limit (Segregated auth, API, and AI rate limiting)
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
                          │ • Field DTO Serializers  │
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

### 1. Centralized Authorization Matrix (`permissionService.js`)
Fine-grained canonical permissions (`repair_request.*`, `quotation.*`, `repair_job.*`, `donation_offer.*`, `admin.*`) decoupling UI actions from hardcoded roles.

### 2. Field-Level DTO Serialization (`serializers.js`)
Projection layer preventing accidental exposure of sensitive fields (owner physical coordinates, donor phone numbers, internal administrative notes).

### 3. Transactional Outbox Pattern (`outboxService.js`)
Guarantees reliable, at-least-once socket event and notification delivery across all state transitions even under transient network interruptions.

### 4. Global Search Modal (`Ctrl+K`)
Keyboard-driven modal searching repair requests, donations, technicians, and admin modules with real-time navigation.

---

## 🚀 Quick Start & Local Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB**: Local MongoDB instance or MongoDB Atlas connection URI

### 1. Clone the Repository
```bash
git clone https://github.com/eii-sayed/fixtogether.git
cd fixtogether
```

### 2. Install Dependencies
```bash
# Install root, client, and server dependencies
npm run install:all
```

### 3. Configure Environment Variables
```bash
# Copy example environment files
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Edit `server/.env` with your credentials:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/fixtogether
JWT_ACCESS_SECRET=your_super_secret_access_key_min_32_chars
JWT_REFRESH_SECRET=your_super_secret_refresh_key_min_32_chars
AI_PROVIDER=mock
```

Edit `client/.env`:
```env
VITE_API_URL=http://localhost:5000/api/v1
VITE_SOCKET_URL=http://localhost:5000
```

### 4. Seed Demonstration Data
```bash
npm run seed
```

### 5. Start Development Servers
```bash
npm run dev
```
- **Frontend App**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000/api/v1`

---

## 🧪 Automated Testing

### Backend Test Suite (8 Suites / 82 Tests)
```bash
npm run test:server
```
Runs integration tests covering authentication, rate limiting, repair requests, technician workflows, organization donations, messaging, and administrative governance.

### Frontend Test Suite (13 Tests)
```bash
npm run test:client
```
Runs Vitest and React Testing Library tests for component rendering, user interactions, and role filters.

### Production Build Check
```bash
npm run build:client
```

---

## 🐳 Docker Deployment

To run FixTogether using Docker Compose:

```bash
docker compose up --build
```

---

## 📄 License & Attribution

University Software Engineering Capstone Project authored by [Abu Sayed](https://github.com/eii-sayed).
Licensed under the [MIT License](LICENSE).