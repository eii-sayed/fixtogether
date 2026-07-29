# FixTogether: An AI-Assisted Community Repair, Reuse, and Donation Platform

## Complete Project Specification

> This document is the source of truth for the entire FixTogether project development.

---

## 1. PROJECT PURPOSE

FixTogether is a community platform that helps people repair, reuse, donate, recover parts from, or responsibly recycle damaged and unwanted items.

The platform connects item owners with:

1. Verified technicians
2. Community repair groups
3. Donation organizations
4. Spare-parts providers
5. Approved recycling facilities

Users can submit damaged items with descriptions and photographs. AI assists by:

1. Categorizing the item
2. Extracting symptoms from the description
3. Identifying missing information
4. Generating clarification questions
5. Recommending suitable technicians
6. Suggesting possible repair, donation, parts-reuse, or recycling pathways
7. Detecting potentially duplicated listings

The AI must only provide preliminary assistance. It must not provide dangerous repair instructions, confirm hardware diagnoses, determine that an item is safe, or replace professional inspection.

---

## 2. REQUIRED TECHNOLOGY STACK

### Frontend
- React.js with Vite
- JavaScript
- React Router
- Tailwind CSS
- Axios
- React Hook Form
- Zod for client-side validation
- TanStack Query for server-state management
- Recharts for dashboard charts
- Lucide React for icons
- Sonner for notifications

### Backend
- Node.js
- Express.js
- JavaScript
- RESTful API architecture
- Mongoose
- JSON Web Tokens
- bcrypt
- Joi for validation
- Multer for upload handling
- Helmet
- CORS
- express-rate-limit
- Winston for logging

### Database
- MongoDB with Mongoose ODM
- MongoDB Atlas compatible

### File Storage
- Cloudinary for item photographs, evidence, verification documents, and completion images
- Local-development fallback if Cloudinary credentials are unavailable

### AI
- AI service abstraction with OpenAI API support
- Mock AI provider for development without paid API key
- Structured JSON outputs with validation

### Optional Supporting Technology
- Socket.IO for real-time notifications
- Nodemailer for email notifications
- OpenStreetMap and Leaflet for maps

### Testing
- Jest, Supertest, React Testing Library
- Playwright for end-to-end tests

### Deployment
- Frontend: Vercel
- Backend: Render
- Database: MongoDB Atlas
- Images: Cloudinary
- Docker for local development

---

## 3. PROJECT STRUCTURE

```
fixtogether/
  client/
    src/
      api/
      assets/
      components/
      context/
      hooks/
      layouts/
      pages/
      routes/
      services/
      utils/
      validations/
  server/
    src/
      config/
      controllers/
      middleware/
      models/
      routes/
      services/
      validators/
      utils/
      jobs/
      constants/
      app.js
      server.js
    tests/
  docs/
  .env.example
  docker-compose.yml
  README.md
  package.json
```

---

## 4. USER ROLES

1. **Owner** - Item owners who submit repair requests, donations
2. **Technician** - Repair service providers
3. **Organization** - Community repair groups, donation organizations, recycling facilities
4. **Administrator** - Platform managers

---

## 5-28. See full specification sections in the original prompt.

*This document serves as the canonical reference for all development decisions.*
