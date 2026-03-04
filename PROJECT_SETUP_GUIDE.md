# Refined System Project Setup Guide

## Overview

This guide walks you through setting up the **Peer-to-Peer Debt Management System** (Refined Version 2.0) from scratch, aligning with the new architecture that decouples from the original M-Pesa-integrated concept and focuses on a **standalone platform with selective M-Pesa Fuliza integration**.

---

## Phase 1: Repository & Folder Structure Setup

### Step 1.1: Clean Up Existing Structure

The original system had the following that we'll **refactor**:

**Remove or Archive:**
- Old M-Pesa USSD-specific modules (MPESA_SIMTOOLKIT_INTEGRATION.md)
- Old Offline-first database schema (OFFLINE_DATABASE_SCHEMA.md)
- Original concept documents that reference M-Pesa as primary (not secondary)

**Keep (Refactor):**
- `/src` directory (will be renamed to `/backend`)
- `/web` directory (will be renamed to `/frontend`)
- `package.json` (update dependencies)
- Database scripts (refactor for new schema)

### Step 1.2: Create New Folder Structure

```bash
# From project root: c:/Users/ADMIN/Desktop/XAMPP 2025/htdocs/Peer-Peer M-Pesa debt management/

# Create directories
mkdir -p backend/src/{middleware,routes,controllers,services,jobs,models,utils,ml}
mkdir -p backend/tests/{unit,integration,e2e}
mkdir -p frontend/src/{pages,components,services,hooks,styles,utils}
mkdir -p frontend/tests/{unit,integration}
mkdir -p mobile/src/{screens,components,services,styles}
mkdir -p mobile/tests
mkdir -p ussd/src/{menus,services,controllers}
mkdir -p ussd/tests
mkdir -p ml-models/{models,notebooks,src}
mkdir -p database/migrations
mkdir -p docs
mkdir -p scripts
mkdir -p config/kubernetes
mkdir -p infra/{terraform,monitoring}
```

### Step 1.3: Directory Mapping

| Old Path | New Path | Status |
|----------|----------|--------|
| `/src` | `/backend/src` | Refactor |
| `/web` | `/frontend/src` | Refactor |
| `/tests` | `/backend/tests` + `/frontend/tests` | Refactor |
| `/scripts` | `/scripts` | Keep & expand |
| Root `.sql` files | `/database/migrations` | Archive originals, create v2 schema |

---

## Phase 2: Core Backend Setup

### Step 2.1: Update Backend package.json

Create or update `backend/package.json`:

```json
{
  "name": "p2p-debt-management-backend",
  "version": "2.0.0",
  "description": "Peer-to-Peer Debt Management System with M-Pesa Fuliza Integration",
  "main": "server.js",
  "scripts": {
    "dev": "nodemon server.js",
    "start": "node server.js",
    "test": "jest --detectOpenHandles",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "jest --testPathPattern=e2e",
    "migrate": "node scripts/runMigrations.js",
    "seed": "node scripts/seedData.js",
    "ml:train": "python src/ml/train.py",
    "lint": "eslint .",
    "format": "prettier --write ."
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.10.0",
    "redis": "^4.6.0",
    "bull": "^4.11.0",
    "jsonwebtoken": "^9.0.0",
    "bcryptjs": "^2.4.3",
    "joi": "^17.9.0",
    "dotenv": "^16.0.3",
    "axios": "^1.4.0",
    "pdfkit": "^0.13.0",
    "twilio": "^3.83.0",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "morgan": "^1.10.0",
    "uuid": "^9.0.0",
    "moment": "^2.29.4"
  },
  "devDependencies": {
    "nodemon": "^2.0.22",
    "jest": "^29.5.0",
    "supertest": "^6.3.3",
    "eslint": "^8.40.0",
    "prettier": "^2.8.8"
  },
  "engines": {
    "node": ">=16.0.0",
    "npm": ">=8.0.0"
  }
}
```

### Step 2.2: Environment Configuration

Create `backend/.env.example`:

```env
# Server
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=debt_management_db
DB_USER=postgres
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_in_prod
JWT_REFRESH_SECRET=your_super_secret_refresh_key
JWT_EXPIRY=3600
JWT_REFRESH_EXPIRY=604800

# M-Pesa Integration
MPESA_API_KEY=your_safaricom_mpesa_api_key
MPESA_BASE_URL=https://api.sandbox.safaricom.co.ke
MPESA_WEBHOOK_URL=https://yourdomain.com/api/v1/mpesa/callbacks

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+your_twilio_phone

# Encryption
ENCRYPTION_KEY=your_32_char_encryption_key_here
ENCRYPTION_IV=your_16_char_iv_key_

# ML Model
ML_MODEL_PATH=./src/ml/models/xgboost_v2.1.pkl
ML_MODEL_VERSION=2.1

# Admin
ADMIN_PHONE=07XXXXXXXXX
ADMIN_EMAIL=admin@debtmgmt.example.com

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```

### Step 2.3: Core Configuration Files

Create `backend/config/database.js`:

```javascript
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

module.exports = pool;
```

Create `backend/config/redis.js`:

```javascript
const redis = require('redis');
require('dotenv').config();

const client = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD || undefined,
});

client.on('error', (err) => {
  console.error('Redis Client Error', err);
});

client.connect();

module.exports = client;
```

---

## Phase 3: Database Setup

### Step 3.1: Create PostgreSQL Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE debt_management_db;
CREATE USER debt_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE debt_management_db TO debt_user;
\q
```

### Step 3.2: Create Migration Schema

Create `database/migrations/001_initial_schema.sql`:

```sql
-- This is the v2.0 refined schema

-- ENUM TYPES
CREATE TYPE user_role AS ENUM ('borrower', 'lender', 'both', 'admin');
CREATE TYPE kyc_status_enum AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE loan_status_enum AS ENUM ('pending_approval', 'active', 'closed', 'defaulted', 'declined');
CREATE TYPE transaction_type_enum AS ENUM ('disbursement', 'repayment', 'interest_accrual', 'penalty_accrual', 'reversal');
CREATE TYPE dispute_status_enum AS ENUM ('open', 'under_review', 'resolved_upheld', 'resolved_denied', 'resolved_partial');
CREATE TYPE dispute_type_enum AS ENUM ('erroneous_deduction', 'system_error', 'unauthorized', 'not_received', 'interest_calculation_error');

-- USERS TABLE
CREATE TABLE users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(15) UNIQUE NOT NULL,
  email VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  kyc_status kyc_status_enum DEFAULT 'pending',
  kyc_verified_date TIMESTAMP,
  national_id VARCHAR(20) UNIQUE,
  profile_complete BOOLEAN DEFAULT FALSE
);

-- PROFILES TABLE
CREATE TABLE profiles (
  profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  date_of_birth DATE,
  occupation VARCHAR(100),
  employer VARCHAR(100),
  monthly_income_range VARCHAR(50),
  bio TEXT,
  profile_photo_url TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- LOANS TABLE
CREATE TABLE loans (
  loan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  borrower_id UUID NOT NULL REFERENCES users(user_id),
  lender_id UUID NOT NULL REFERENCES users(user_id),
  principal DECIMAL(12, 2) NOT NULL,
  current_balance DECIMAL(12, 2) NOT NULL,
  interest_rate DECIMAL(5, 2) NOT NULL,
  interest_type VARCHAR(20) DEFAULT 'daily',
  penalty_daily_rate DECIMAL(5, 2) DEFAULT 10.00,
  penalty_cap_percent DECIMAL(5, 2) DEFAULT 50.00,
  grace_period_days INT DEFAULT 7,
  repayment_method VARCHAR(30) NOT NULL,
  repayment_amount DECIMAL(12, 2),
  repayment_percentage DECIMAL(5, 2),
  trigger_threshold DECIMAL(12, 2) DEFAULT 100,
  disbursement_date TIMESTAMP NOT NULL,
  due_date DATE NOT NULL,
  first_repayment_date DATE,
  status loan_status_enum DEFAULT 'pending_approval',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_date TIMESTAMP,
  notes TEXT
);

-- Continue with other tables (see full schema in REFINED_SYSTEM_DESIGN_V2.md)
```

### Step 3.3: Run Migrations

Create `scripts/runMigrations.js`:

```javascript
const fs = require('fs');
const path = require('path');
const pool = require('../backend/config/database');

async function runMigrations() {
  const migrationsDir = path.join(__dirname, '../database/migrations');
  const files = fs.readdirSync(migrationsDir).sort();

  for (const file of files) {
    if (file.endsWith('.sql')) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      try {
        console.log(`Running ${file}...`);
        await pool.query(sql);
        console.log(`✅ ${file} completed`);
      } catch (error) {
        console.error(`❌ ${file} failed:`, error.message);
        process.exit(1);
      }
    }
  }

  console.log('All migrations completed!');
  pool.end();
}

runMigrations();
```

---

## Phase 4: Frontend Setup

### Step 4.1: Initialize Frontend with Vite

```bash
cd frontend
npm create vite@latest . -- --template react
npm install
```

### Step 4.2: Frontend package.json Updates

Update `frontend/package.json` to include:

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.11.0",
    "axios": "^1.4.0",
    "zustand": "^4.3.7",
    "date-fns": "^2.30.0",
    "recharts": "^2.7.0",
    "react-signature-canvas": "^1.0.6"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^4.3.9"
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "test": "vitest"
  }
}
```

---

## Phase 5: USSD Backend Setup

### Step 5.1: USSD Entry Point

Create `ussd/ussd-server.js`:

```javascript
const express = require('express');
const app = express();
require('dotenv').config();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// USSD routes
const ussdRouter = require('./src/controllers/ussdController');
app.post('/api/v1/ussd', ussdRouter);

const PORT = process.env.USSD_PORT || 3001;
app.listen(PORT, () => {
  console.log(`USSD Server running on port ${PORT}`);
});
```

---

## Phase 6: ML Models Setup

### Step 6.1: Python Environment

Create `ml-models/requirements.txt`:

```
xgboost==1.7.0
scikit-learn==1.3.0
pandas==2.0.0
numpy==1.24.0
shap==0.42.0
joblib==1.3.0
scipy==1.11.0
```

Create `ml-models/src/train.py`:

```python
import pandas as pd
from xgboost import XGBClassifier
from sklearn.preprocessing import StandardScaler
import joblib

def train_model():
    # Load training data from database
    # Feature engineering
    # Train XGBoost model
    # Save model artifacts
    pass

if __name__ == "__main__":
    train_model()
```

---

## Phase 7: Docker & Deployment

### Step 7.1: Docker Compose for Local Development

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: debt_management_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DB_HOST=postgres
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - redis
    volumes:
      - ./backend:/app

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app

volumes:
  postgres_data:
  redis_data:
```

### Step 7.2: Backend Dockerfile

Create `backend/Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

---

## Phase 8: Initial Code Scaffolding

### Step 8.1: Create Express Server

Create `backend/server.js`:

```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Routes (stub for now)
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
```

### Step 8.2: Create React App Stub

Create `frontend/src/App.jsx`:

```jsx
import { useState } from 'react';
import './App.css';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="App">
      <h1>P2P Debt Management</h1>
      <div className="dashboard">
        <section>
          <h2>Your Dashboard</h2>
          <p>Loading...</p>
        </section>
      </div>
    </div>
  );
}

export default App;
```

---

## Phase 9: Testing Setup

### Step 9.1: Jest Configuration

Create `backend/jest.config.js`:

```javascript
module.exports = {
  testEnvironment: 'node',
  coveragePathIgnorePatterns: ['/node_modules/'],
  testTimeout: 10000,
};
```

### Step 9.2: Sample Test

Create `backend/tests/unit/utils.test.js`:

```javascript
describe('Utility Functions', () => {
  test('should calculate interest correctly', () => {
    const principal = 5000;
    const dailyRate = 0.01;
    const expectedDaily = 50;
    expect(principal * dailyRate).toBe(expectedDaily);
  });
});
```

---

## Phase 10: Documentation Generation

### Step 10.1: API Documentation

Create `docs/API_DOCUMENTATION.md`:

```markdown
# P2P Debt Management - API Documentation

## Authentication

All endpoints (except `/auth/*`) require JWT token in header:

```
Authorization: Bearer {JWT_TOKEN}
```

## Endpoints

### POST /api/v1/loans
Create a new loan request...

[Detailed endpoint documentation]
```

---

## Quick Start Commands

```bash
# 1. Setup environment
cd "c:/Users/ADMIN/Desktop/XAMPP 2025/htdocs/Peer-Peer M-Pesa debt management"

# 2. Copy .env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env (if applicable)

# 3. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 4. Start with Docker Compose
cd ..
docker-compose up -d

# 5. Run migrations
npm run migrate

# 6. Seed sample data
npm run seed

# 7. Start development servers
# Backend (terminal 1)
cd backend && npm run dev

# Frontend (terminal 2)
cd frontend && npm run dev

# Access:
# Frontend: http://localhost:5173
# Backend: http://localhost:3000
# API Health: http://localhost:3000/api/v1/health
```

---

## What's Next

1. **Implement Core Services** (`loanService.js`, `transactionService.js`, etc.)
2. **Build API Routes** (loans, transactions, disputes, scores)
3. **Create Frontend Components** (Dashboard, LoanForm, AgreementReview, etc.)
4. **Integrate M-Pesa** (Mock first, then real API)
5. **Implement ML Scoring** (Data pipeline, model training)
6. **Add Job Queues** (Interest accrual, penalty application, triggers)
7. **Testing** (Unit, integration, e2e)
8. **Deployment** (AWS/GCP/Azure setup)

---

## References

- **Full System Design:** `REFINED_SYSTEM_DESIGN_V2.md`
- **Database Schema:** `database/migrations/001_initial_schema.sql`
- **Architecture Diagrams:** See REFINED_SYSTEM_DESIGN_V2.md Section 2

---
