# FixTogether: AI-Assisted Community Repair & Donation Platform

[![Live Demo](https://img.shields.io/badge/Live-fixtogether.vercel.app-0ea5e9?style=for-the-badge&logo=vercel)](https://fixtogether.vercel.app/)
[![API](https://img.shields.io/badge/API-fixtogether--api.onrender.com-10b981?style=for-the-badge&logo=render)](https://fixtogether-api.onrender.com/api/health)

FixTogether is a full-stack community platform that helps people **repair, reuse, donate, and responsibly recycle** damaged or unwanted items.

Built with the MERN stack, FixTogether connects item owners with verified technicians, donation organizations, and recycling facilities.

A core feature is the **AI-Powered Diagnosis & Safety Engine**, which analyzes problem descriptions, suggests repair pathways, identifies required technical skills, flags potential safety hazards, and matches users with appropriate technicians.

## 🌐 Live Demo

| Service | URL |
|---|---|
| **Frontend** | [fixtogether.vercel.app](https://fixtogether.vercel.app/) |
| **Backend API** | https://fixtogether-api.onrender.com/api/health |

### Demo Accounts

Demo accounts are created when the database seed script is executed:

```bash
npm run seed
```

Check the seed command output for the available demo email addresses and passwords.

> **Security note:** Do not publish unrestricted administrator credentials. If a public administrator demo account is provided, sensitive and destructive operations should be disabled for that account.
>
> **Hosting note:** The Render free tier may take approximately 30 seconds to start after the backend has been idle.

## ✨ Features

- **Multi-Role System:** Dedicated workflows for item owners, technicians, organizations, and administrators
- **AI Diagnosis:** Analyzes repair requests to extract symptoms, recommend repair pathways, and identify required skills
- **Safety First Engine:** Runs deterministic hazard checks before AI analysis and blocks unsafe automated repair advice
- **Smart Matching:** Connects owners with technicians based on skills, categories, and availability
- **Quotation System:** Provides labor, parts, warranty, and estimated total cost breakdowns
- **End-to-End Tracking:** Tracks requests from draft and publication through quotation, repair, and completion
- **Image Upload:** Supports drag-and-drop multi-image upload with up to five images per item
- **Cloudinary Storage:** Stores uploaded media in Cloudinary with a local development fallback
- **Owner and Technician Messaging:** Provides repair-request-scoped messaging with typing indicators, read receipts, and message history
- **Donations and Recycling:** Connects owners of unrepairable or unwanted items with organizations and recycling facilities
- **Real-Time Notifications:** Uses authenticated Socket.IO connections for notifications and messaging updates

## 🛠 Technology Stack

### Frontend

- React 18
- Vite
- Tailwind CSS
- TanStack Query
- React Hook Form
- Zod
- React Router
- Sonner
- Lucide React
- Leaflet

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- JSON Web Tokens
- Socket.IO
- Winston
- Joi
- Multer
- Helmet
- CORS
- express-rate-limit

### Infrastructure

- **Frontend Hosting:** Vercel
- **Backend Hosting:** Render
- **Database:** MongoDB Atlas
- **File Storage:** Cloudinary with a local development fallback
- **AI Provider:** OpenAI API with a mock provider for development

## 🚀 Quick Start

### Prerequisites

Install the following software before running the project:

- Node.js 18 or later
- npm
- MongoDB locally or a MongoDB Atlas connection URI
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/eii-sayed/fixtogether.git
cd fixtogether
```

### 2. Install Dependencies

Install the root, frontend, and backend dependencies:

```bash
npm run install:all
```

### 3. Configure Environment Variables

Copy the example environment files:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Configure `server/.env` with the required values, including:

- MongoDB connection URI
- Access-token secret
- Refresh-token secret
- Allowed frontend origin
- Cloudinary credentials
- OpenAI API key, if the OpenAI provider is enabled

Configure `client/.env` with the backend API URL and other public frontend settings.

> Never commit `.env` files or production secrets to the repository.

### 4. Seed the Database

```bash
npm run seed
```

The seed script creates demonstration data and prints the available demo credentials.

### 5. Start the Development Environment

```bash
npm run dev
```

Development services:

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000/api/v1

## 🐳 Docker

As an alternative to installing and running the services individually:

```bash
docker compose up
```

To rebuild the containers:

```bash
docker compose up --build
```

## 🧪 Testing

Run the backend test suite:

```bash
npm run test:server
```

Run the frontend test suite:

```bash
npm run test:client
```

Run both suites before opening a pull request or deploying major changes.

## 📁 Project Structure

```text
fixtogether/
├── client/
│   ├── src/
│   │   ├── api/             # Axios API client
│   │   ├── components/      # Reusable UI, chat, layout, and auth components
│   │   ├── context/         # Authentication and Socket.IO contexts
│   │   └── pages/           # Route-level pages
│   └── vercel.json          # Vercel SPA routing configuration
├── server/
│   ├── src/
│   │   ├── config/          # Application configuration
│   │   ├── controllers/     # HTTP route handlers
│   │   ├── middleware/      # Authentication, validation, and error handling
│   │   ├── models/          # Mongoose schemas
│   │   ├── routes/          # API route definitions
│   │   ├── services/        # AI, matching, safety, and business logic
│   │   ├── validators/      # Joi validation schemas
│   │   └── scripts/         # Database seed scripts
│   └── tests/               # Backend test suites
├── docker-compose.yml       # Docker development configuration
└── package.json             # Root workspace scripts
```

## 🔑 API Endpoints

The following table presents the primary API endpoints. Some endpoints require authentication and role-specific authorization.

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Register a user |
| `POST` | `/api/v1/auth/login` | Authenticate a user |
| `GET` | `/api/v1/auth/me` | Return the authenticated user |

### Items

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/items` | List accessible items |
| `POST` | `/api/v1/items` | Create an item |
| `POST` | `/api/v1/items/:id/images` | Upload item images using multipart form data |

### Repair Requests

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/repair-requests` | List accessible repair requests |
| `POST` | `/api/v1/repair-requests` | Create a repair request |
| `POST` | `/api/v1/repair-requests/:id/analyze` | Run safety checks and AI analysis |
| `POST` | `/api/v1/repair-requests/:id/publish` | Publish a repair request |

### Messaging

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/messages/conversations` | List the authenticated user's conversations |
| `GET` | `/api/v1/messages/:repairRequestId` | Get messages for an authorized repair request |
| `POST` | `/api/v1/messages/:repairRequestId` | Send a repair-request-scoped message |
| `PATCH` | `/api/v1/messages/:repairRequestId/read` | Mark messages as read |
| `GET` | `/api/v1/messages/unread-count` | Get the unread-message count |

### Platform Resources

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/technicians` | List technicians |
| `GET` | `/api/v1/donations` | List donations |
| `GET` | `/api/v1/categories` | List item categories |
| `GET` | `/api/v1/notifications` | List notifications |
| `GET` | `/api/v1/admin/dashboard` | Return administrator dashboard statistics |

## 🏗 Architecture and Design Decisions

### 1. AI Provider Abstraction

The AI service uses a factory-based provider abstraction with `mock` and `openai` providers.

The mock provider allows developers to run the diagnosis workflow without external API costs. The OpenAI provider can be enabled through environment configuration.

### 2. Deterministic Safety Engine

Safety checks run before AI analysis.

The server checks descriptions for high-risk conditions such as:

- Sparks or exposed electrical wiring
- Electric shock
- Smoke or burning smells
- Swollen or overheating batteries
- Suspected gas leaks
- Water near live electrical components

When a critical hazard is detected, FixTogether blocks unsafe automated repair instructions and displays an appropriate safety warning.

The AI provider must not be allowed to override a deterministic safety block.

### 3. JWT Authentication

Authentication uses:

- Short-lived access tokens
- Rotating refresh tokens
- HTTP-only refresh-token cookies
- Secure production cookie settings
- Cross-origin cookie support when required by the deployed architecture

The documented default lifetimes are:

- **Access token:** 15 minutes
- **Refresh token:** 7 days

### 4. Messaging Architecture

Messages are scoped to repair requests and are exchanged between authorized owners and technicians.

The recipient is resolved from the repair-request context instead of being trusted directly from arbitrary client input.

Socket.IO connections require authentication before clients can receive messaging and notification events.

### 5. File Upload Architecture

Item images can be uploaded using multipart form data.

Production media is stored in Cloudinary. Local storage is intended only as a development fallback and should not be treated as durable production storage.

### 6. Payments

The platform currently tracks quotation and repair costs internally.

External payment processing through services such as Stripe or PayPal is outside the current implementation scope and may be added in a future phase.

### 7. JavaScript and Runtime Validation

The project uses standard JavaScript rather than TypeScript.

Runtime validation is provided by:

- Joi on the backend
- Zod on the frontend

## 🔐 Security Considerations

FixTogether includes the following security controls:

- HTTP security headers through Helmet
- CORS configuration
- Request rate limiting
- Server-side Joi validation
- Frontend Zod validation
- Role-based access control
- Resource ownership checks
- HTTP-only refresh-token cookies
- Refresh-token rotation
- Server-side AI safety checks
- Authenticated Socket.IO connections
- Restricted image uploads
- Structured server logging

Security-sensitive configuration must be supplied through environment variables.

Never commit:

```text
.env
.env.local
node_modules/
dist/
build/
.vercel/
```

## ⚠️ Known Limitations

- The Render free tier may introduce a cold-start delay.
- The local upload fallback is intended for development only.
- Payment gateway integration is not included.
- The deterministic safety engine cannot replace evaluation by a qualified professional.
- AI-generated analysis may be incomplete or inaccurate and should not be treated as professional repair or safety advice.
- Public demonstration data may be reset periodically.
- Real-time communication depends on the availability of the backend Socket.IO service.

## 📄 License

No license has been specified yet.

Before accepting external contributions or allowing reuse, add an appropriate `LICENSE` file and update this section.

## 👤 Author

University Software Engineering Project by [Abu Sayed](https://github.com/eii-sayed).