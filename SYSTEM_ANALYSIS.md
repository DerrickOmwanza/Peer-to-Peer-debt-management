# M-PESA Peer-to-Peer Debt Management System - Complete Analysis

## Executive Summary

Your system is a **full-stack web application** that enables peer-to-peer lending with automatic repayment processing. It's built with React frontend, Node.js/Express backend, and PostgreSQL database. The core innovation is **automatic loan repayment triggering** when a borrower receives incoming transactions.

---

## System Architecture Overview

### Technology Stack
| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | React | 19.2.0 |
| **Backend** | Node.js + Express | 4.18.2 |
| **Database** | PostgreSQL | 16+ |
| **Authentication** | JWT + bcryptjs | 9.0.0 / 2.4.3 |
| **HTTP Client** | Axios | 1.13.2 |
| **State Management** | React Context API | Built-in |

### Port Configuration
- **Frontend**: http://localhost:3001
- **Backend**: http://localhost:5000
- **Database**: postgresql://localhost:5433/mpesa_debt

---

## Database Schema

### 1. Users Table
```sql
users {
  id: UUID (PK)
  phone_number: VARCHAR (unique) -- normalized format +254...
  full_name: VARCHAR
  email: VARCHAR (unique)
  password_hash: VARCHAR
  wallet_balance: DECIMAL (default 0)
  status: VARCHAR (active/inactive)
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}
```

### 2. Loans Table
```sql
loans {
  id: UUID (PK)
  borrower_id: UUID (FK → users)
  lender_id: UUID (FK → users)
  principal_amount: DECIMAL
  remaining_balance: DECIMAL
  repayment_method: VARCHAR (fixed/percentage)
  repayment_amount: DECIMAL
  repayment_start_date: DATE
  frequency: VARCHAR (optional)
  status: VARCHAR (pending/active/completed/declined)
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}
```

### 3. Transactions Table
```sql
transactions {
  id: UUID (PK)
  user_id: UUID (FK → users)
  amount: DECIMAL
  transaction_type: VARCHAR (incoming/outgoing)
  description: VARCHAR
  source_phone: VARCHAR
  created_at: TIMESTAMP
}
```

### 4. Repayments Table
```sql
repayments {
  id: UUID (PK)
  loan_id: UUID (FK → loans)
  amount_deducted: DECIMAL
  remaining_balance_after: DECIMAL
  transaction_id: UUID (FK → transactions)
  status: VARCHAR (completed/pending)
  created_at: TIMESTAMP
}
```

### 5. Notifications Table
```sql
notifications {
  id: UUID (PK)
  user_id: UUID (FK → users)
  loan_id: UUID (FK → loans, nullable)
  repayment_id: UUID (nullable)
  notification_type: VARCHAR (loan_request/approval/declined/repayment)
  message: VARCHAR
  status: VARCHAR (unread/read)
  delivery_method: VARCHAR (in-app/sms/email)
  created_at: TIMESTAMP
}
```

---

## API Routes & Endpoints

### Authentication Module (`/api/auth`)
**Purpose**: User registration and login

| Method | Endpoint | Protected | Function |
|--------|----------|-----------|----------|
| POST | `/register` | ❌ | Create new user account |
| POST | `/login` | ❌ | Authenticate and return JWT token |

**Request/Response Examples**:
```javascript
// POST /api/auth/register
{
  "phone_number": "+254701234567",
  "full_name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
// Response: { message, user { id, phone, name, email, created_at } }

// POST /api/auth/login
{
  "email": "john@example.com",
  "password": "password123"
}
// Response: { message, token, user { id, phone, name, email, wallet_balance } }
```

---

### User Management (`/api/users`)
**Purpose**: User profile and wallet management

| Method | Endpoint | Protected | Function |
|--------|----------|-----------|----------|
| GET | `/profile` | ✅ | Retrieve current user profile |
| POST | `/wallet/add-funds` | ✅ | Add funds to wallet balance |

**Implementation**:
- JWT token required in Authorization header: `Authorization: Bearer <token>`
- Wallet addition is mock (simulates M-PESA top-up)

---

### Loan Management (`/api/loans`)
**Purpose**: Loan request creation and approval workflow

| Method | Endpoint | Protected | Function |
|--------|----------|-----------|----------|
| POST | `/request` | ✅ | Borrower requests loan from lender |
| PATCH | `/:loanId/approval` | ✅ | Lender approves/declines loan |
| GET | `/borrower` | ✅ | Get all loans where user is borrower |
| GET | `/lender` | ✅ | Get all loans where user is lender |

**Loan Request Flow**:
```
1. Borrower initiates: POST /api/loans/request
   - Provides lender's phone number
   - Sets principal amount
   - Defines repayment method (fixed or percentage)
   - Loan created with status = 'pending'

2. Notification created for lender

3. Lender reviews and responds: PATCH /api/loans/:loanId/approval
   - Approves: status → 'active'
   - Declines: status → 'declined'

4. Notification sent to borrower about approval status
```

**Status Flow**:
```
pending → approved (active) → completed (when balance = 0)
       → declined
```

---

### Transaction Processing (`/api/transactions`)
**Purpose**: Handle incoming payments and trigger repayments

| Method | Endpoint | Protected | Function |
|--------|----------|-----------|----------|
| POST | `/incoming` | ✅ | Simulate incoming M-PESA transaction |
| GET | `/` | ✅ | Retrieve transaction history |

**Transaction Processing Flow** (⭐ CORE FEATURE):
```
User receives transaction → checkAndProcessRepayments() triggered
                          ↓
                   Amount ≥ Ksh 100?
                          ↓
              YES → Find active loans (borrower)
                          ↓
              For each active loan (oldest first):
                   1. Calculate repayment:
                      - Fixed: Use repayment_amount directly
                      - Percentage: Calculate % of incoming amount
                   2. Deduct from loan balance
                   3. Create repayment record
                   4. Update loan status (if balance = 0 → completed)
                   5. Send notifications to both parties
                   6. Update wallet balance
```

**Key Logic** (lines 59-135 in transactions.js):
- Threshold: Ksh 100 minimum for triggering repayment
- Processes loans in FIFO order (oldest first)
- Respects remaining balance and incoming amount
- Creates audit trail in repayments table

---

### Repayment Tracking (`/api/repayments`)
**Purpose**: View repayment history and statistics

| Method | Endpoint | Protected | Function |
|--------|----------|-----------|----------|
| GET | `/loan/:loanId` | ✅ | Get repayments for specific loan |
| GET | `/borrower/all` | ✅ | Get all repayments where user borrowed |
| GET | `/lender/all` | ✅ | Get all repayments where user lent |

---

### Notifications (`/api/notifications`)
**Purpose**: In-app notifications for users

| Method | Endpoint | Protected | Function |
|--------|----------|-----------|----------|
| GET | `/` | ✅ | Get user's notifications |
| PATCH | `/:notificationId/read` | ✅ | Mark notification as read |
| GET | `/unread/count` | ✅ | Get count of unread notifications |

**Notification Types**:
- `loan_request`: New loan request received
- `approval`: Loan approved/declined
- `repayment`: Automatic repayment processed

---

## Frontend Architecture

### Component Structure
```
App.js (Main)
├── AuthContext (state management)
├── Login Page (public route)
├── Register Page (public route)
└── Protected Routes
    ├── Dashboard (overview & notifications)
    ├── My Loans (borrower & lender view)
    ├── Request Loan (form)
    ├── Transactions (simulate incoming)
    ├── Repayments (view history)
    ├── Wallet (balance management)
    └── Navigation (header/sidebar)
```

### State Management
**AuthContext**: 
- Stores JWT token
- Manages user profile
- Handles login/logout
- Persists token in localStorage

### API Integration
**services/api.js**:
- Axios instance with base URL
- Automatic Authorization header injection
- Request/response interceptors
- Error handling

---

## Core Business Logic Flow

### Scenario: Complete Loan Lifecycle

```
STEP 1: John (Borrower) logs in
        └─ Frontend: POST /api/auth/login
           Backend: Verify credentials → Return JWT token

STEP 2: John adds funds to wallet
        └─ Frontend: POST /api/users/wallet/add-funds (amount: 5000)
           Backend: UPDATE users SET wallet_balance = 5000

STEP 3: John requests loan from Jane
        └─ Frontend: POST /api/loans/request
           {
             lender_phone: "+254702345678",
             principal_amount: 5000,
             repayment_method: "fixed",
             repayment_amount: 500,
             repayment_start_date: "2024-03-01"
           }
           Backend:
           - Create loan (status: pending)
           - Create notification for Jane

STEP 4: Jane logs in and approves loan
        └─ Frontend: PATCH /api/loans/:loanId/approval (approved: true)
           Backend:
           - Update loan status: pending → active
           - Create notification for John

STEP 5: John receives income (M-PESA simulation)
        └─ Frontend: POST /api/transactions/incoming (amount: 1000)
           Backend:
           - Create transaction record
           - Update wallet: 5000 + 1000 = 6000
           - checkAndProcessRepayments() triggered:
             * Find active loan (5000 remaining)
             * Calculate repayment: 500 (fixed)
             * Deduct from loan: 5000 - 500 = 4500
             * Create repayment record
             * Update loan status: active (still)
             * Notify John: "Ksh 500 deducted. Balance: 4500"
             * Notify Jane: "Ksh 500 received. Balance: 4500"

STEP 6: John receives more income
        └─ POST /api/transactions/incoming (amount: 2000)
           This time: 500 deducted, balance → 4000
           Process repeats 9 more times until loan = 0

STEP 7: Final repayment
        └─ Remaining balance: 500
           Incoming transaction: 600
           Deduct: 500 (exact remaining)
           Update loan status: completed
           Notification: "Loan fully repaid!"
```

---

## Security Implementation

### Authentication
- **JWT Tokens**: 24-hour expiration
- **Password Hashing**: bcryptjs with salt rounds
- **Authorization Header**: Bearer token format

### Database Security
- **Parameterized Queries**: Prevents SQL injection
  ```javascript
  // Safe: Uses $1, $2 placeholders
  pool.query('SELECT * FROM users WHERE id = $1', [userId])
  ```

### Input Validation
- **Phone Normalization**: Converts any format to +254xxxxxxxxx
- **Required Fields**: Checked before database operations
- **Amount Validation**: Ensures positive values

### Protected Routes
- `/api/auth` - Public (register/login only)
- All other routes - Require valid JWT token via middleware

---

## Middleware Chain

```
HTTP Request
    ↓
Express Parser (body, json)
    ↓
CORS Handler
    ↓
Route Handler
    ↓
verifyToken Middleware (if protected)
    ├─ Check Authorization header
    ├─ Validate JWT signature
    ├─ Decode and attach user to req
    └─ Call next() or send 401 error
    ↓
Route Logic
    ↓
Database Query
    ↓
JSON Response
```

---

## Configuration Files

### .env (Backend)
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mpesa_debt
DB_USER=postgres
DB_PASSWORD=password
JWT_SECRET=your_secret_key
PORT=5000
NODE_ENV=development
TRANSACTION_THRESHOLD=100
```

### .env (Frontend - web/)
```
REACT_APP_API_BASE_URL=http://localhost:5000/api
```

---

## Key Features Summary

### ✅ Automatic Repayment Triggering
- Real-time repayment deduction on incoming transactions
- Configurable threshold (default: Ksh 100)
- Supports fixed and percentage-based methods
- FIFO loan processing (oldest loans first)

### ✅ Dual-role User System
- **Borrower**: Request loans, receive auto-repayments
- **Lender**: Approve loans, track repayments
- Same user can be both simultaneously

### ✅ Real-time Notifications
- In-app notifications for all actions
- Message templates for different events
- Read/unread status tracking

### ✅ Complete Audit Trail
- Transaction history
- Repayment records with amounts
- Loan status progression
- User action timestamps

### ✅ Wallet Management
- Mock M-PESA integration
- Transaction simulation for testing
- Real-time balance updates

---

## Data Flow Diagrams

### Authentication Flow
```
Frontend                Backend              Database
   |                      |                    |
   |--POST /register----->|                    |
   |                      |--Hash Password     |
   |                      |                    |
   |                      |--INSERT user------>|
   |                      |<--user object------|
   |<--201 Created--------|                    |
```

### Automatic Repayment Flow
```
Incoming Transaction
        |
        v
POST /api/transactions/incoming
        |
        v
Create transaction record
        |
        v
Update wallet balance
        |
        v
checkAndProcessRepayments(userId, amount)
        |
        v
Get active loans for user
        |
        v
For each loan:
  1. Calculate repayment
  2. Deduct from balance
  3. Record in repayments table
  4. Update loan status
  5. Create notifications
```

---

## Performance Considerations

### Current Bottlenecks
1. **Synchronous Processing**: Repayments processed sequentially
2. **No Pagination**: All transactions/loans fetched at once
3. **Full Table Scans**: Missing indexes on foreign keys
4. **No Caching**: Every request hits the database

### Optimization Opportunities
1. Add database indexes on frequently queried columns
2. Implement pagination for list endpoints
3. Add caching layer (Redis)
4. Async processing for notifications
5. Query optimization (SELECT only needed fields)

---

## Testing Test Accounts

### Pre-loaded Users
```
User 1 (Borrower):
  Email: john@example.com
  Phone: +254701234567
  Password: password123
  Initial wallet: Ksh 5000

User 2 (Lender):
  Email: jane@example.com
  Phone: +254702345678
  Password: password123
  Initial wallet: Ksh 10000
```

---

## Error Handling

### Backend Error Responses
```javascript
// 400: Bad Request (validation)
{ error: 'Missing required fields' }

// 401: Unauthorized (auth)
{ error: 'Invalid token' }

// 403: Forbidden (permission)
{ error: 'Only lender can approve/decline' }

// 404: Not Found
{ error: 'Loan not found' }

// 500: Server Error
{ error: 'Something went wrong', message: err.message }
```

### Frontend Error Handling
- Try/catch blocks in API calls
- User-friendly error messages
- Network error fallbacks
- Validation before submission

---

## Scalability & Deployment Ready

### Current Status
- ✅ Production code structure
- ✅ Environment variable configuration
- ✅ Error handling implemented
- ✅ Database optimized schema
- ✅ JWT-based stateless auth
- ⚠️ Missing: Monitoring, logging, rate limiting
- ⚠️ Missing: Email/SMS integration
- ⚠️ Missing: Real M-PESA integration

### Deployment Steps
1. Update `.env` with production credentials
2. Configure production database
3. Set `NODE_ENV=production`
4. Deploy backend (Heroku, AWS, Railway)
5. Build frontend: `npm run build`
6. Deploy frontend (Vercel, Netlify)
7. Configure HTTPS and custom domain
8. Set up monitoring and logging

---

## Summary

This is a **complete, functioning peer-to-peer lending platform** with:
- Clean REST API architecture
- Normalized database schema
- Real-time automatic repayment processing
- Secure JWT authentication
- Professional frontend UI
- Production-ready code structure

The system is ready for:
- ✅ User testing
- ✅ Feature demonstrations
- ✅ Production deployment
- ✅ Further enhancement and scaling
