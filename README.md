## 1. Project overview

This project is an AI-assisted appointment booking and chat application for authenticated users. A React frontend provides the user experience, while a TypeScript backend handles authentication, appointments, chat sessions, and AI orchestration. The system is designed to interpret appointment requests in natural language, request clarification when needed, and convert valid intent into bookings managed by backend business rules.

AI interprets requests but backend owns business logic. This keeps the AI layer focused on intent extraction and classification, while the backend remains the source of truth for validation, scheduling rules, conflict checks, authorization, and persistence.

## 2. Features

- User signup, login, and session-based authentication with JWTs.
- Appointment listing, creation, read, and status updates.
- AI-assisted appointment intent classification from chat text.
- Clarifying questions when required details are missing.
- Prevents overlapping bookings for a user.
- Realtime chat using Socket.IO for joined session messaging.
- Persistent chat history and metadata storage per session.
- PostgreSQL-backed data persistence for users, appointments, and chat sessions.
- Schema validation for AI responses before any business action is taken.

## 3. Architecture diagram

```mermaid
flowchart LR
    U[User] --> FE[React + Vite Frontend]
    FE --> API[Express API]
    FE --> WS[Socket.IO realtime chat]
    API --> AUTH[JWT auth + route validation]
    API --> APP[Appointment service]
    API --> CHAT[Chat service]
    CHAT --> AI[Google Gemini model]
    AI --> VALIDATE[Zod schema validation]
    APP --> PG[(PostgreSQL)]
    CHAT --> PG
    AUTH --> PG
```

## 4. Tech stack

- Frontend: React, TypeScript, Vite, React Router
- Backend: Node.js, TypeScript, Express
- Realtime: Socket.IO
- Persistence: PostgreSQL via Prisma ORM
- AI: Google Gemini via @google/generative-ai
- Validation: Zod
- Auth: JWT + bcrypt
- Runtime: Node.js

## 5. Database design

PostgreSQL stores persistent application data. The schema is managed with Prisma and includes the following core models:

- User
  - id
  - email
  - passwordHash
  - name
  - phone
  - timezone
  - createdAt, updatedAt
- Appointment
  - id
  - userId
  - title
  - notes
  - startsAt
  - endsAt
  - status
  - createdAt, updatedAt
- ChatSession
  - id
  - userId
  - status
  - title
  - history
  - metadata
  - startedAt, lastMessageAt, endedAt
  - createdAt, updatedAt

The appointment model enforces user-scoped scheduling and overlap checks, while the chat session model tracks conversation state and AI interaction metadata.

## 6. API overview

The backend exposes HTTP endpoints under the /api namespace and a health-check endpoint at /health.

- Authentication
  - POST /api/auth/signup
  - POST /api/auth/login
  - GET /api/auth/me
- Appointments
  - POST /api/appointments
  - GET /api/appointments
  - GET /api/appointments/:id
  - PATCH /api/appointments/:id
- Chat
  - POST /api/chat/sessions
  - GET /api/chat/sessions/:id
  - POST /api/chat/sessions/:id/messages
- Health
  - GET /health

The API uses JSON payloads, JWT bearer tokens, request validation, and structured error responses. Socket.IO provides realtime chat events such as chat:join and chat:message for session-aware messaging.

## 7. AI workflow

1. The user sends a chat message from the frontend.
2. The backend chat service appends the user message to the session history.
3. The AI service calls the Gemini model with the current message and recent context.
4. The model returns a structured JSON payload describing intent and extracted fields.
5. AI output is schema-validated. If parsing or validation fails, the backend falls back to a lightweight recovery heuristic and requests clarification when needed.
6. The backend applies business rules, including required field checks, scheduling rules, availability validation, and appointment creation logic.
7. The assistant response is appended to chat history and returned through the API or Socket.IO event stream.

This design keeps AI interpretation separate from the authoritative business layer while ensuring that actions only occur once the model output passes validation.

## 8. Environment variables

Create a .env file in the backend folder and a separate environment file in the frontend for local development. The project expects the following variables:

```env
# backend
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/appointment_chatbot
JWT_SECRET=replace-with-a-random-32-character-minimum-secret
CLIENT_ORIGIN=http://localhost:5173
JWT_ISSUER=appointment-chatbot
JWT_AUDIENCE=appointment-chatbot-client
GEMINI_API_KEY=your-google-gemini-key
GEMINI_MODEL=gemini-2.5-flash

# frontend
VITE_API_URL=http://localhost:3000
```

Notes:
- CLIENT_ORIGIN may contain a comma-separated list of allowed origins.
- JWT_SECRET is required and must be at least 32 characters long.
- If GEMINI_API_KEY is absent, the app still boots but the AI feature is unavailable.

## 9. Local setup

1. Install backend dependencies:

```bash
cd backend
npm install
```

2. Install frontend dependencies:

```bash
cd frontend
npm install
```

3. Configure environment variables in the backend and frontend as described above.

4. Start the backend:

```bash
cd backend
npm run dev
```

5. Start the frontend:

```bash
cd frontend
npm run dev
```

The frontend typically runs on http://localhost:5173 and the backend on http://localhost:3000 unless overridden.

## 10. Database migration/seed

The project uses Prisma migrations for schema evolution and a seed script for sample data.

```bash
cd backend
npm run db:generate
npm run db:migrate
npm run db:seed
```

The migration files live under backend/prisma/migrations and the seed script is defined in backend/prisma/seed.ts. The seed script creates a sample user, appointment, and chat session for local testing.

## 11. Testing

The backend package includes a Node test runner script:

```bash
cd backend
npm test
```

This project includes a test runner configuration but the repo should be treated as a small application with focused validation rather than a broad enterprise test suite. Test coverage should be expanded before relying on it for production decisions.

## 12. Deployment

Deployment should be planned as a standard Node.js application with:

- a PostgreSQL instance for persistent data
- a secure environment file or secret manager for JWT and AI keys
- a reverse proxy or load balancer in front of the backend
- TLS termination for HTTPS traffic
- separate configuration for frontend build output and backend runtime

A typical deployment flow is:

1. Build the frontend with Vite.
2. Start the backend with the production environment variables.
3. Secure database access and service credentials.
4. Configure a process manager or container runtime for the backend service.

This project is not positioned as production-ready out of the box; deployment requires operational hardening beyond the local code baseline.

## 13. Design decisions/tradeoffs

- Prisma + PostgreSQL was chosen for structured persistence, type safety, and straightforward schema management.
- Express was selected for a lightweight API layer without unnecessary framework overhead.
- Socket.IO provides realtime chat without introducing a more complex event broker.
- AI interpretation is intentionally narrow and limited to classification and extraction; the backend still validates and enforces final outcomes.
- Zod validation is used at the AI boundary to reduce malformed or unsafe outputs from reaching business logic.
- The app currently stores chat history as JSON within the chat session model for simplicity rather than using a dedicated event store or document database.

## 14. Assumptions

- Each authenticated user owns their own appointments and chat sessions.
- The appointment domain is centered on a single user and a 30-minute booking flow.
- Requests are primarily in English and a user timezone is available or defaulted to UTC.
- The AI provider is available during normal application runtime.
- The backend is the only component that can create, update, or reject schedule changes.

## 15. Known limitations

- AI request interpretation can be uncertain for ambiguous phrasing, colloquial language, or multi-step scheduling requests.
- The app does not integrate with external calendar providers, email, or SMS scheduling systems.
- Appointment creation currently assumes a 30-minute default meeting duration and a simple future-date validation model.
- Chat session history is stored in a JSON field, which is sufficient for a small project but can become harder to query at scale.
- There is no broad CI pipeline, production monitoring stack, or automated load testing in the current repo.
- This project is a focused prototype and should not be treated as a complete production scheduling platform without further hardening, testing, and operational controls.
