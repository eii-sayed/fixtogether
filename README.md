# FixTogether: AI-Assisted Community Repair & Donation Platform

FixTogether is a comprehensive, full-stack community platform designed to help people repair, reuse, donate, and responsibly recycle damaged or unwanted items. Built with the MERN stack (MongoDB, Express, React, Node.js), it connects item owners with verified technicians, donation organizations, and recycling facilities. 

A core feature is the **AI-Powered Diagnosis & Safety Engine**, which analyzes problem descriptions to suggest repair pathways, flag safety hazards, and match users with appropriate technicians.

## Features

* **Multi-Role System**: Distinct workflows for Item Owners, Technicians, Organizations, and Admins.
* **AI Diagnosis**: Analyzes repair requests to extract symptoms, suggest pathways, and identify required skills.
* **Safety First Engine**: Intercepts descriptions with dangerous keywords (e.g., "spark", "swollen battery") to immediately flag risks and optionally block AI advice, prioritizing human safety.
* **Smart Matching**: Connects owners with technicians based on skills, categories, location, and availability.
* **Quotation System**: Transparent quoting system with labor, parts, and warranty breakdowns.
* **End-to-End Tracking**: Real-time status updates for repair jobs (Draft -> Published -> Awaiting Quotes -> In Progress -> Completed).
* **Donations & Recycling**: Dedicated flow for items that can't be repaired, connecting them to verified charities or recyclers.
* **Real-time Notifications**: Socket.IO integration for instant alerts.

## Technology Stack

* **Frontend**: React 18, Vite, Tailwind CSS, TanStack Query (React Query), React Hook Form, Zod, React Router, Sonner.
* **Backend**: Node.js, Express.js, MongoDB (Mongoose).
* **Authentication**: JWT (Access & Refresh tokens), HTTP-only cookies.
* **File Uploads**: Cloudinary (or local fallback).
* **AI Integration**: OpenAI (configurable to use mock provider for dev).
* **DevOps**: Docker, Docker Compose, Vitest (Frontend), Jest (Backend).

## Quick Start (Docker)

The easiest way to run the entire application (Database, Backend, Frontend) is using Docker Compose.

1. Ensure Docker and Docker Compose are installed.
2. Run the application:
   ```bash
   npm run docker:up
   # Or directly: docker compose up -d
   ```
3. Access the platforms:
   - **Frontend**: http://localhost:5173
   - **Backend API**: http://localhost:5000/api/v1

## Local Development Setup

If you prefer to run the services manually without Docker:

### Prerequisites
- Node.js (v18+)
- MongoDB (running locally on port 27017 or a cloud URI)

### 1. Install Dependencies
From the root directory, install everything:
```bash
npm run install:all
```

### 2. Configure Environment Variables
* **Server**: A `.env` file is already created in `server/` with default development settings. If you want to use real OpenAI analysis, change `AI_PROVIDER=openai` and add `OPENAI_API_KEY=your_key`.
* **Client**: A `.env` file is already created in `client/` pointing to the local API.

### 3. Seed the Database (Important)
Populate the database with test users, categories, safety rules, items, and repair requests:
```bash
npm run seed
```
*Note: Check the console output of this script for demo login credentials!*

### 4. Run the Application
Run both frontend and backend concurrently:
```bash
npm run dev
```

## Testing

Run backend tests:
```bash
npm run test:server
```
Run frontend tests:
```bash
npm run test:client
```

## Assumptions & Design Decisions

1. **AI Abstraction**: The AI service uses a factory pattern. By default, it runs on a `mock` provider to avoid incurring API costs during general testing and development.
2. **Safety Engine**: We implemented a deterministic keyword-based safety engine *before* the AI step. LLMs can hallucinate or downplay risks. Hardcoded rules ensure critical safety hazards (like lithium battery fires) are flagged instantly.
3. **Payments**: The platform currently tracks costs and status internally. Real payment gateway integration (Stripe/PayPal) is architected for future phases but currently mocked as state transitions.
4. **Location**: For matching, we assume coordinates are provided during profile creation. The demo uses basic scoring.
5. **No TypeScript**: As per the project requirements, standard JavaScript was used throughout, relying on Joi/Zod for strict runtime validation.

## Author
Built for the University Software Engineering Project.
