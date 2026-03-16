# AGENTS.md — P2P Debt Management System

## Build & Run
- **Backend**: `npm start` (Express on port 5000), `npm run dev` (nodemon)
- **Frontend**: `cd web && npm start` (React/CRA on port 3000)
- **DB setup**: `npm run db:init`, `npm run db:migrate`, `npm run db:seed` (PostgreSQL, db name `mpesa_debt`)
- **Tests**: `npm test` (all), `npx jest tests/<file>.test.js` (single), `npm run test:coverage`

## Architecture
- **Backend** (`server.js`, `src/`): Express + Node.js REST API with JWT auth (`src/middleware/auth.js`), PostgreSQL via `pg` (`src/config/database.js`). Routes: auth, users, loans, disputes, transactions, repayments, notifications, ussd, sync, safaricom, risk. All under `/api/`.
- **Frontend** (`web/`): React 19 + react-router-dom, axios for API calls, CRA toolchain.
- **Android** (`android/`): Companion mobile app.
- **Services** (`src/services/`): Business logic layer (M-PESA/Safaricom integration, sync engine, risk scoring via AWS Bedrock/Nova).
- **DB**: PostgreSQL — schema in `src/config/database-schema.sql`, migrations in `src/migrations/`.

## Code Style
- CommonJS (`require`/`module.exports`), no TypeScript. Node.js + Express conventions.
- Validation with `joi`, passwords with `bcryptjs`, UUIDs with `uuid`.
- Routes follow `express.Router()` pattern; export the router directly.
- Error handling: Express error middleware in `server.js`; route handlers use try/catch with `res.status().json()`.
- Frontend: functional React components, `react-app` ESLint config.
- Environment config via `dotenv`; see `.env.example` for required variables.
