# Complete API Reference Guide

## Base URL
```
http://localhost:5000/api
```

## Authentication Header (for protected routes)
```
Authorization: Bearer <JWT_TOKEN>
```

---

## 🔐 Authentication Endpoints

### POST /auth/register
Register a new user account

**No Authentication Required**

**Request Body:**
```json
{
  "phone_number": "+254701234567",
  "full_name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (201 Created):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid-here",
    "phone_number": "254701234567",
    "full_name": "John Doe",
    "email": "john@example.com",
    "created_at": "2024-03-01T10:00:00Z"
  }
}
```

**Error Responses:**
```json
// 400 - Missing fields
{ "error": "Missing required fields" }

// 400 - User exists
{ "error": "User already exists" }
```

---

### POST /auth/login
Authenticate user and get JWT token

**No Authentication Required**

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "phone_number": "254701234567",
    "full_name": "John Doe",
    "email": "john@example.com",
    "wallet_balance": 5000
  }
}
```

**Error Responses:**
```json
// 401 - Invalid credentials
{ "error": "Invalid credentials" }
```

---

## 👤 User Management Endpoints

### GET /users/profile
Retrieve current user's profile information

**Authentication Required** ✅

**Response (200 OK):**
```json
{
  "id": "uuid-here",
  "phone_number": "254701234567",
  "full_name": "John Doe",
  "email": "john@example.com",
  "wallet_balance": 5000,
  "status": "active",
  "created_at": "2024-01-01T10:00:00Z"
}
```

**Error Responses:**
```json
// 401 - No valid token
{ "error": "Invalid token" }

// 404 - User not found
{ "error": "User not found" }
```

---

### POST /users/wallet/add-funds
Add funds to user's wallet (Mock M-PESA)

**Authentication Required** ✅

**Request Body:**
```json
{
  "amount": 1000
}
```

**Response (200 OK):**
```json
{
  "message": "Funds added successfully",
  "wallet_balance": 6000
}
```

**Error Responses:**
```json
// 400 - Invalid amount
{ "error": "Invalid amount" }

// 401 - Invalid token
{ "error": "Invalid token" }
```

---

## 💰 Loan Management Endpoints

### POST /loans/request
Borrower requests loan from lender

**Authentication Required** ✅

**Request Body:**
```json
{
  "lender_phone": "+254702345678",
  "principal_amount": 5000,
  "repayment_method": "fixed",
  "repayment_amount": 500,
  "repayment_start_date": "2024-03-15"
}
```

**Parameters:**
- `lender_phone`: Lender's phone number (any format, will be normalized)
- `principal_amount`: Loan amount in Ksh
- `repayment_method`: "fixed" or "percentage"
  - If "fixed": repayment_amount is deducted each time
  - If "percentage": repayment_amount is % of transaction
- `repayment_amount`: Amount or percentage value
- `repayment_start_date`: Date repayment begins

**Response (201 Created):**
```json
{
  "message": "Loan request created successfully",
  "loan": {
    "id": "loan-uuid",
    "borrower_id": "borrower-uuid",
    "lender_id": "lender-uuid",
    "principal_amount": 5000,
    "remaining_balance": 5000,
    "repayment_method": "fixed",
    "repayment_amount": 500,
    "repayment_start_date": "2024-03-15",
    "status": "pending",
    "created_at": "2024-03-01T10:00:00Z"
  }
}
```

**Error Responses:**
```json
// 400 - Missing fields
{ "error": "Missing required fields" }

// 404 - Lender not found
{ "error": "Lender not found" }
```

---

### PATCH /loans/:loanId/approval
Lender approves or declines loan request

**Authentication Required** ✅

**Request Body:**
```json
{
  "approved": true
}
```

**Response (200 OK):**
```json
{
  "message": "Loan active successfully",
  "loan": {
    "id": "loan-uuid",
    "borrower_id": "borrower-uuid",
    "lender_id": "lender-uuid",
    "principal_amount": 5000,
    "remaining_balance": 5000,
    "repayment_method": "fixed",
    "repayment_amount": 500,
    "repayment_start_date": "2024-03-15",
    "status": "active",
    "created_at": "2024-03-01T10:00:00Z",
    "updated_at": "2024-03-01T10:05:00Z"
  }
}
```

**Error Responses:**
```json
// 403 - Not the lender
{ "error": "Only lender can approve/decline" }

// 404 - Loan not found
{ "error": "Loan not found" }
```

---

### GET /loans/borrower
Get all loans where user is the borrower

**Authentication Required** ✅

**Query Parameters:** None

**Response (200 OK):**
```json
[
  {
    "id": "loan-uuid",
    "borrower_id": "your-uuid",
    "lender_id": "lender-uuid",
    "principal_amount": 5000,
    "remaining_balance": 4500,
    "repayment_method": "fixed",
    "repayment_amount": 500,
    "repayment_start_date": "2024-03-15",
    "status": "active",
    "lender_name": "Jane Doe",
    "lender_phone": "254702345678",
    "created_at": "2024-03-01T10:00:00Z",
    "updated_at": "2024-03-01T10:30:00Z"
  }
]
```

---

### GET /loans/lender
Get all loans where user is the lender

**Authentication Required** ✅

**Query Parameters:** None

**Response (200 OK):**
```json
[
  {
    "id": "loan-uuid",
    "borrower_id": "borrower-uuid",
    "lender_id": "your-uuid",
    "principal_amount": 5000,
    "remaining_balance": 4500,
    "repayment_method": "fixed",
    "repayment_amount": 500,
    "repayment_start_date": "2024-03-15",
    "status": "active",
    "borrower_name": "John Doe",
    "borrower_phone": "254701234567",
    "created_at": "2024-03-01T10:00:00Z",
    "updated_at": "2024-03-01T10:30:00Z"
  }
]
```

---

## 💳 Transaction Endpoints

### POST /transactions/incoming
Simulate incoming M-PESA transaction (triggers auto-repayment)

**Authentication Required** ✅

**Request Body:**
```json
{
  "amount": 1000,
  "source_phone": "+254712345678",
  "description": "Payment from employer"
}
```

**Parameters:**
- `amount`: Transaction amount (≥ Ksh 100 triggers repayment)
- `source_phone`: (Optional) Sender's phone
- `description`: (Optional) Transaction description

**Response (201 Created):**
```json
{
  "message": "Transaction recorded successfully",
  "transaction": {
    "id": "transaction-uuid",
    "user_id": "your-uuid",
    "amount": 1000,
    "transaction_type": "incoming",
    "created_at": "2024-03-01T10:15:00Z"
  }
}
```

**Behind the scenes:**
1. Wallet balance increased by 1000
2. Active loans identified
3. For each active loan:
   - Repayment amount calculated
   - Loan balance updated
   - Repayment record created
   - Notifications sent

**Error Responses:**
```json
// 400 - Invalid amount
{ "error": "Invalid amount" }
```

---

### GET /transactions
Get all transactions for current user

**Authentication Required** ✅

**Response (200 OK):**
```json
[
  {
    "id": "transaction-uuid",
    "user_id": "your-uuid",
    "amount": 1000,
    "transaction_type": "incoming",
    "description": "Payment from employer",
    "source_phone": "254712345678",
    "created_at": "2024-03-01T10:15:00Z"
  }
]
```

---

## 📊 Repayment Endpoints

### GET /repayments/loan/:loanId
Get repayment history for specific loan

**Authentication Required** ✅

**URL Parameters:**
- `loanId`: The loan ID

**Response (200 OK):**
```json
[
  {
    "id": "repayment-uuid",
    "loan_id": "loan-uuid",
    "amount_deducted": 500,
    "remaining_balance_after": 4500,
    "transaction_id": "transaction-uuid",
    "status": "completed",
    "created_at": "2024-03-01T10:20:00Z"
  },
  {
    "id": "repayment-uuid-2",
    "loan_id": "loan-uuid",
    "amount_deducted": 500,
    "remaining_balance_after": 4000,
    "transaction_id": "transaction-uuid-2",
    "status": "completed",
    "created_at": "2024-03-01T11:20:00Z"
  }
]
```

**Error Responses:**
```json
// 403 - Not borrower or lender
{ "error": "Unauthorized" }

// 404 - Loan not found
{ "error": "Loan not found" }
```

---

### GET /repayments/borrower/all
Get all repayments for loans user borrowed

**Authentication Required** ✅

**Response (200 OK):**
```json
[
  {
    "id": "repayment-uuid",
    "loan_id": "loan-uuid",
    "amount_deducted": 500,
    "remaining_balance_after": 4500,
    "transaction_id": "transaction-uuid",
    "status": "completed",
    "principal_amount": 5000,
    "lender_id": "lender-uuid",
    "created_at": "2024-03-01T10:20:00Z"
  }
]
```

---

### GET /repayments/lender/all
Get all repayments for loans user lent

**Authentication Required** ✅

**Response (200 OK):**
```json
[
  {
    "id": "repayment-uuid",
    "loan_id": "loan-uuid",
    "amount_deducted": 500,
    "remaining_balance_after": 4500,
    "transaction_id": "transaction-uuid",
    "status": "completed",
    "principal_amount": 5000,
    "borrower_id": "borrower-uuid",
    "created_at": "2024-03-01T10:20:00Z"
  }
]
```

---

## 🔔 Notification Endpoints

### GET /notifications
Get all notifications for current user

**Authentication Required** ✅

**Response (200 OK):**
```json
[
  {
    "id": "notification-uuid",
    "user_id": "your-uuid",
    "loan_id": "loan-uuid",
    "repayment_id": null,
    "notification_type": "loan_request",
    "message": "New loan request: Ksh 5000 from borrower",
    "status": "unread",
    "delivery_method": "in-app",
    "created_at": "2024-03-01T10:00:00Z"
  },
  {
    "id": "notification-uuid-2",
    "user_id": "your-uuid",
    "loan_id": "loan-uuid",
    "repayment_id": null,
    "notification_type": "repayment",
    "message": "Ksh 500 deducted for loan repayment. Balance: Ksh 4500",
    "status": "unread",
    "delivery_method": "in-app",
    "created_at": "2024-03-01T10:20:00Z"
  }
]
```

---

### PATCH /notifications/:notificationId/read
Mark notification as read

**Authentication Required** ✅

**URL Parameters:**
- `notificationId`: The notification ID

**Response (200 OK):**
```json
{
  "message": "Notification marked as read"
}
```

---

### GET /notifications/unread/count
Get count of unread notifications

**Authentication Required** ✅

**Response (200 OK):**
```json
{
  "unread_count": 3
}
```

---

## 📱 USSD Endpoints (Basic Support)

### POST /api/ussd
Process USSD requests (Safaricom integration)

**No Authentication Required**

**Request Body:**
```json
{
  "phone": "254701234567",
  "text": "request"
}
```

---

## 🔄 Sync Endpoints (Offline Support)

### POST /api/sync/upload
Upload offline changes to server

**Authentication Required** ✅

---

### GET /api/sync/download
Download latest data for offline use

**Authentication Required** ✅

---

## ✅ Health Check

### GET /api/health
Check if server is running

**No Authentication Required**

**Response (200 OK):**
```json
{
  "status": "Server is running",
  "timestamp": "2024-03-01T10:00:00Z"
}
```

---

## Error Response Format

All errors follow this format:

```json
{
  "error": "Error message",
  "message": "Detailed error (if available)"
}
```

### HTTP Status Codes
- **200 OK**: Request successful
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid input/validation error
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: User doesn't have permission
- **404 Not Found**: Resource doesn't exist
- **500 Internal Server Error**: Server error

---

## Authentication Flow Example

### Complete Login & Use Example

```javascript
// Step 1: Login
POST /api/auth/login
{
  "email": "john@example.com",
  "password": "password123"
}
// Get token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

// Step 2: Get Profile (using token)
GET /api/users/profile
Header: Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
// Response: { id, phone, name, email, wallet_balance, ... }

// Step 3: Add Funds
POST /api/users/wallet/add-funds
Header: Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
{
  "amount": 5000
}
// Response: { message, wallet_balance: 5000 }

// Step 4: Request Loan
POST /api/loans/request
Header: Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
{
  "lender_phone": "+254702345678",
  "principal_amount": 5000,
  "repayment_method": "fixed",
  "repayment_amount": 500,
  "repayment_start_date": "2024-03-15"
}
// Response: { message, loan { ... with status: pending } }
```

---

## Testing with cURL

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+254701234567",
    "full_name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'

# Get Profile (replace TOKEN with actual JWT)
curl -X GET http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer TOKEN"

# Add Funds
curl -X POST http://localhost:5000/api/users/wallet/add-funds \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 5000}'

# Simulate Transaction
curl -X POST http://localhost:5000/api/transactions/incoming \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000}'
```

---

## Testing with Postman

1. Import `postman-collection.json` in project root
2. Set environment variable `token` after login
3. All requests automatically include token in headers
4. Test full workflow: Register → Login → Add Funds → Request Loan → Approve → Simulate Transaction
