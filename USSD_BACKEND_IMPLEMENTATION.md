# USSD Backend Implementation - Phase 1 Complete

## Overview

Complete USSD backend system implemented for M-PESA debt allocation system. Enables offline access via *383# code and Safaricom integration.

**Status:** ✅ Phase 1 Complete  
**Implementation Date:** November 2025

---

## Architecture

```
┌─────────────────────────────────────┐
│   USSD User (*383# dial)            │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│   Safaricom USSD Gateway            │
│   (External Service)                │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│  /api/ussd/handler                  │
│  ├─ Session Management              │
│  ├─ State Machine                   │
│  └─ Menu Navigation                 │
└────────────┬────────────────────────┘
             │
        ┌────┴────────────┐
        ↓                 ↓
   ┌─────────┐    ┌──────────────┐
   │ Online  │    │  Offline     │
   │ Mode    │    │  Queue (Sync)│
   └────┬────┘    └──────┬───────┘
        │                │
        ↓                ↓
   ┌─────────────────────────────────┐
   │ PostgreSQL Backend              │
   │ (Users, Loans, Transactions)    │
   └─────────────────────────────────┘
```

---

## Core Components

### 1. **USSD Session Manager** (`ussd-session.js`)

Manages user session state during USSD interaction.

**Features:**
- Auto-timeout after 3 minutes (Safaricom standard)
- State tracking (MAIN_MENU, REQUEST_LOAN, etc.)
- Session data storage
- Activity tracking

**Key Methods:**
```javascript
getOrCreateSession(sessionId, phoneNumber)  // Create/get session
session.setState(newState)                  // Change state
session.setData(key, value)                 // Store data
session.getAllData()                        // Get all data
session.reset()                             // Reset to main menu
```

**Example Usage:**
```javascript
const session = getOrCreateSession('sess-123', '254701234567');
session.setState('REQUEST_LOAN_PHONE');
session.setData('lenderPhone', '254702345678');
```

---

### 2. **USSD Offline Storage** (`ussd-storage.js`)

Handles offline data caching and sync queuing.

**Features:**
- User data caching
- Sync queue management
- Retry logic
- Offline-capable operations

**Key Methods:**
```javascript
cacheUserData(phoneNumber, userData)        // Cache locally
queueTransaction(phoneNumber, transaction)  // Queue for sync
queueLoanRequest(phoneNumber, loanRequest) // Queue loan
getUnsyncedQueue()                          // Get pending syncs
markAsSynced(itemId)                        // Mark as synced
```

**Storage Structure:**
```
data/ussd-cache/
├── sync-queue.json          # Queue of pending operations
└── users/
    ├── 254701234567.json    # Cached user data
    └── 254702345678.json
```

---

### 3. **USSD Menu Builder** (`ussd-menu.js`)

Pre-built menu templates for consistent UX.

**Available Menus:**
```javascript
getMainMenu()                      // Main menu
getLoanRequestStep1/2/3()         // Loan request flow
getViewLoansMenu(loans)           // View loans
getApprovalMenu(pendingLoans)     // Approve loans
getBalanceView(balance)           // Check balance
getTransactionsMenu(transactions) // Transaction history
getSuccessMenu(message)           // Success notifications
getErrorMenu(errorMessage)        // Error messages
```

**Menu Example:**
```
M-PESA LOANS
1. Request Loan
2. View My Loans
3. Approve Loan
4. View Balance
5. Transactions
0. Exit
```

---

### 4. **USSD Business Logic** (`ussd-logic.js`)

Core logic for USSD operations.

**Main Functions:**

#### Phone & Amount Validation
```javascript
validatePhoneNumber(phone)     // Validates Kenyan phone numbers
validateAmount(amount)         // Validates amounts (min: 100)
```

**Supported Formats:**
- `+254701234567`
- `254701234567`
- `0701234567`

#### User Operations
```javascript
getUserByPhone(phoneNumber)          // Get user account
getUserBorrowerLoans(userId)         // Get loans as borrower
getUserLenderLoans(userId)           // Get loans as lender
getPendingApprovals(userId)          // Get pending approvals
getWalletBalance(userId)             // Get wallet balance
getTransactionHistory(userId, limit) // Get transaction history
```

#### Loan Operations
```javascript
createLoanRequest(borrowerId, lenderPhone, amount, repayment)
approveLoan(loanId, lenderId)
queueLoanForSync(phoneNumber, lenderPhone, amount, repayment)
```

#### Input Processing
```javascript
processUSSDInput(session, input, user)  // State machine logic
```

---

## API Endpoints

### 1. **POST /api/ussd/handler**
Main USSD handler - processes requests from Safaricom.

**Request Format (from Safaricom):**
```json
{
  "sessionId": "unique-session-id",
  "phoneNumber": "254701234567",
  "text": "1",
  "serviceCode": "*383"
}
```

**Response Format:**
```json
{
  "responseType": "input",
  "message": "M-PESA LOANS\n1. Request Loan\n2. View My Loans\n..."
}
```

**Response Types:**
- `"input"` - Continue session (show menu for more input)
- `"notification"` - End session (final message)

---

### 2. **POST /api/ussd/sync**
Sync offline queued data when user comes online.

**Request:**
```json
{
  "phoneNumber": "254701234567"
}
```

**Response:**
```json
{
  "success": true,
  "synced": 3,
  "total": 3,
  "errors": []
}
```

---

### 3. **GET /api/ussd/queue/:phoneNumber**
Check user's sync queue status.

**Response:**
```json
{
  "phoneNumber": "254701234567",
  "totalItems": 2,
  "syncedItems": 0,
  "unsyncedItems": 2,
  "items": [
    {
      "id": "1234567890",
      "type": "LOAN_REQUEST",
      "data": {...},
      "queuedAt": 1701356400000,
      "synced": false
    }
  ]
}
```

---

### 4. **POST /api/ussd/test**
Test USSD flows without Safaricom integration.

**Request:**
```json
{
  "sessionId": "test-session-1",
  "phoneNumber": "254701234567",
  "text": "1"
}
```

**Response:**
```json
{
  "sessionId": "test-session-1",
  "phoneNumber": "254701234567",
  "state": "REQUEST_LOAN_PHONE",
  "message": "REQUEST LOAN\nEnter lender phone:",
  "continueSession": true
}
```

---

### 5. **GET /api/ussd/sessions**
Get active sessions (monitoring).

**Response:**
```json
{
  "activeSessions": 5,
  "sessions": [
    {
      "sessionId": "sess-123",
      "phoneNumber": "254701234567",
      "state": "REQUEST_LOAN_PHONE",
      "createdAt": "2025-11-30T10:30:00Z",
      "lastActivityAt": "2025-11-30T10:32:00Z",
      "idleTime": 45000
    }
  ]
}
```

---

### 6. **POST /api/ussd/sessions/clear**
Clear all sessions (testing/maintenance).

**Response:**
```json
{
  "message": "All sessions cleared"
}
```

---

### 7. **GET /api/ussd/health**
Health check for USSD service.

**Response:**
```json
{
  "status": "USSD service is running",
  "timestamp": "2025-11-30T10:33:00Z",
  "activeSessions": 5
}
```

---

## USSD State Machine

```
START
  ↓
[MAIN_MENU]
  ├─ 1 → [REQUEST_LOAN_PHONE]
  │        ├─ Valid phone → [REQUEST_LOAN_AMOUNT]
  │        │                ├─ Valid amount → [REQUEST_LOAN_REPAYMENT]
  │        │                │                 ├─ Valid repayment → [REQUEST_LOAN_CONFIRM]
  │        │                │                 │                    ├─ 1 → Create Loan → [MAIN_MENU]
  │        │                │                 │                    └─ 0 → [MAIN_MENU]
  │        │                │                 └─ Invalid → [REQUEST_LOAN_REPAYMENT]
  │        │                └─ Invalid → [REQUEST_LOAN_AMOUNT]
  │        └─ Invalid → [REQUEST_LOAN_PHONE]
  │
  ├─ 2 → [VIEW_LOANS_MENU]
  │        ├─ Select loan → Show details → 0 → [MAIN_MENU]
  │        └─ 0 → [MAIN_MENU]
  │
  ├─ 3 → [APPROVAL_MENU]
  │        ├─ Select loan → [APPROVAL_CONFIRM]
  │        │                ├─ 1 → Approve → [MAIN_MENU]
  │        │                └─ 0 → [MAIN_MENU]
  │        └─ 0 → [MAIN_MENU]
  │
  ├─ 4 → Show balance → 0 → [MAIN_MENU]
  │
  ├─ 5 → Show transactions → 0 → [MAIN_MENU]
  │
  └─ 0 → END SESSION
```

---

## Complete USSD Flow Example

### Request a Loan

**Step 1:** User dials *383#
```
RESPONSE:
M-PESA LOANS
1. Request Loan
2. View My Loans
3. Approve Loan
4. View Balance
5. Transactions
0. Exit
```

**Step 2:** User enters "1"
```
REQUEST:
{
  "sessionId": "sess-123",
  "phoneNumber": "254701234567",
  "text": "1"
}

RESPONSE:
REQUEST LOAN
Enter lender phone:
```

**Step 3:** User enters "254702345678"
```
REQUEST:
{
  "sessionId": "sess-123",
  "phoneNumber": "254701234567",
  "text": "254702345678"
}

RESPONSE:
Enter loan amount (Ksh):
```

**Step 4:** User enters "5000"
```
RESPONSE:
Enter repayment per (Ksh):
```

**Step 5:** User enters "500"
```
RESPONSE:
CONFIRM LOAN
Lender: 254702345678
Amount: Ksh 5000
Repayment: Ksh 500
1. Confirm 0. Cancel
```

**Step 6:** User enters "1"
```
RESPONSE:
SUCCESS
Loan request sent to 254702345678
0. Back
```

---

## Testing USSD Locally

### Using the Test Endpoint

```bash
# 1. Start the server
npm run dev

# 2. Test main menu
curl -X POST http://localhost:5000/api/ussd/test \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-1",
    "phoneNumber": "254701234567",
    "text": ""
  }'

# 3. Request loan
curl -X POST http://localhost:5000/api/ussd/test \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-1",
    "phoneNumber": "254701234567",
    "text": "1"
  }'

# 4. Enter lender phone
curl -X POST http://localhost:5000/api/ussd/test \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-1",
    "phoneNumber": "254701234567",
    "text": "254702345678"
  }'
```

### Check Active Sessions

```bash
curl http://localhost:5000/api/ussd/sessions

# Response:
{
  "activeSessions": 1,
  "sessions": [
    {
      "sessionId": "test-1",
      "phoneNumber": "254701234567",
      "state": "REQUEST_LOAN_PHONE",
      "createdAt": "2025-11-30T10:33:00Z",
      "lastActivityAt": "2025-11-30T10:33:30Z",
      "idleTime": 5000
    }
  ]
}
```

### Check Sync Queue

```bash
curl http://localhost:5000/api/ussd/queue/254701234567

# Response:
{
  "phoneNumber": "254701234567",
  "totalItems": 1,
  "syncedItems": 0,
  "unsyncedItems": 1,
  "items": [...]
}
```

---

## Safaricom Integration Steps

### 1. Register with Safaricom Developer Portal

Visit: https://developer.safaricom.co.ke

1. Create account
2. Register app
3. Request USSD code (*383# or custom)
4. Get API credentials

### 2. Configure Webhook

In Safaricom dashboard, set webhook URL to:
```
https://your-domain.com/api/ussd/handler
```

### 3. Test in Sandbox

```bash
# Use Postman to test with Safaricom sandbox
POST https://api.safaricom.co.ke/ussd/handler

# Body:
{
  "sessionId": "unique-id",
  "phoneNumber": "254701234567",
  "text": "1",
  "serviceCode": "*383"
}
```

### 4. Deploy to Production

Once tested, deploy to production:
- Use HTTPS (required by Safaricom)
- Enable request signing (if required)
- Monitor webhook responses

---

## File Structure

```
src/
├── services/
│   ├── ussd-session.js     # Session management
│   ├── ussd-storage.js     # Offline caching & sync queue
│   ├── ussd-menu.js        # Menu templates
│   └── ussd-logic.js       # Business logic & state machine
│
└── routes/
    └── ussd.js             # API endpoints

data/
└── ussd-cache/
    ├── sync-queue.json
    └── users/
        ├── 254701234567.json
        └── 254702345678.json
```

---

## Key Features Implemented

✅ **Session Management**
- Auto-timeout (3 minutes)
- State tracking
- Data persistence per session

✅ **Offline Support**
- Queue transactions offline
- Sync when online
- Retry logic

✅ **USSD Menus**
- Main menu navigation
- Loan request workflow
- Loan approval flow
- Balance checking
- Transaction history

✅ **Validation**
- Phone number validation
- Amount validation
- User existence checks

✅ **Database Integration**
- User auto-registration
- Loan creation
- Approval handling
- Notification sending

✅ **Error Handling**
- Invalid input handling
- Session timeout
- Database error recovery
- Offline fallback

✅ **Testing**
- USSD test endpoint
- Session monitoring
- Queue status checking
- Health checks

---

## Configuration

No additional configuration needed. System uses existing database and environment variables.

**Safaricom Specific** (add to .env when ready):
```
SAFARICOM_CONSUMER_KEY=your_key
SAFARICOM_CONSUMER_SECRET=your_secret
SAFARICOM_USSD_CODE=*383#
USSD_WEBHOOK_URL=https://your-domain.com/api/ussd/handler
```

---

## Testing Checklist

- [x] Session creation and timeout
- [x] State machine transitions
- [x] Phone number validation
- [x] Amount validation
- [x] Loan request workflow
- [x] Loan approval workflow
- [x] Balance checking
- [x] Offline queuing
- [x] Sync workflow
- [x] Error handling
- [x] Multiple concurrent sessions
- [x] Database integration

---

## Next Steps

1. **Phase 2:** Offline Database Schema (SQLite for Android/iOS)
2. **Phase 3:** Sync Engine (conflict resolution)
3. **Phase 4:** Android Implementation
4. **Phase 5:** Safaricom Integration
5. **Phase 6:** Testing Framework

---

## Status Summary

**Phase 1 Complete:** ✅

All USSD backend components are implemented and tested.

- ✅ Session manager
- ✅ Offline storage service
- ✅ Menu builder
- ✅ Business logic
- ✅ API routes
- ✅ Test endpoints
- ✅ Documentation

System is ready to integrate with Safaricom or test locally.

---

**Created:** November 30, 2025  
**Status:** Complete  
**Next Phase:** Offline Database Schema
