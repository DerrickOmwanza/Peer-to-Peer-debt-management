# System Flow Diagrams & Sequences

## 1. AUTHENTICATION FLOW

```
┌─────────┐                                    ┌──────────┐
│ Frontend│                                    │ Backend  │
└────┬────┘                                    └────┬─────┘
     │                                              │
     │ POST /auth/register                          │
     │  { phone, name, email, password }           │
     ├─────────────────────────────────────────────>│
     │                                              │
     │                                    Hash Password
     │                                    Check Duplicates
     │                                    INSERT user
     │                                              │
     │                 201 Created                  │
     │ { user: { id, phone, name, email } }        │
     │<─────────────────────────────────────────────┤
     │                                              │
     │ Store in localStorage                        │
     │                                              │
     │ POST /auth/login                             │
     │  { email, password }                         │
     ├─────────────────────────────────────────────>│
     │                                              │
     │                                    SELECT user by email
     │                                    Compare passwords
     │                                    Generate JWT token
     │                                              │
     │ 200 OK                                       │
     │ { token: "jwt...", user: {...} }            │
     │<─────────────────────────────────────────────┤
     │                                              │
     │ Store token in localStorage                  │
     │ Set AuthContext state                        │
     │ Redirect to Dashboard                        │
```

---

## 2. LOAN REQUEST FLOW

```
┌────────────┐                                ┌──────────┐                ┌───────────┐
│ Borrower   │                                │ Backend  │                │ Database  │
└────┬───────┘                                └────┬─────┘                └─────┬─────┘
     │                                             │                            │
     │ 1. Open Request Loan Form                   │                            │
     │    Enter lender phone, amount,              │                            │
     │    repayment terms                          │                            │
     │                                             │                            │
     │ 2. POST /loans/request                      │                            │
     │    + Bearer token                           │                            │
     ├────────────────────────────────────────────>│                            │
     │                                             │                            │
     │                              Verify JWT token
     │                              Normalize phone number
     │                              Find lender by phone
     │                              Generate UUID
     │                              ────────────────────────────────────────────>│
     │                              INSERT INTO loans
     │                              (id, borrower_id, lender_id,
     │                               principal_amount, remaining_balance,
     │                               repayment_method, repayment_amount,
     │                               status: 'pending')
     │                              ────────────────────────────────────────────>│
     │                              <────────────────────────────────────────────
     │                              loan object with id
     │                              │
     │                              Create notification for lender
     │                              ────────────────────────────────────────────>│
     │                              INSERT INTO notifications
     │                              │
     │ 3. 201 Created               │
     │    { loan: {...} }           │
     │<────────────────────────────────────────────┤
     │                                             │
     │ Show confirmation                          │
     │ Navigate back to loans list                │
     │                                             │
     │                                             │
     │     ┌──────────────────────────────────┐   │
     │     │ 4. Lender receives notification  │   │
     │     │    in their notifications tab    │   │
     │     └──────────────────────────────────┘   │
     │                                             │
     │                                ┌────────────────────┐
     │                                │ Lender Reviews Loan│
     │                                │ PATCH /loans/:id   │
     │                                │  /approval         │
     │                                │ { approved: true } │
     │                                └────────┬───────────┘
     │                                         │
     │                              UPDATE loans SET
     │                              status = 'active'
     │                              ────────────────────────────────────────────>│
     │                              <────────────────────────────────────────────
     │                              │
     │ 5. Notification: Loan Active  │
     │    Loan is ready to repay     │
     │<────────────────────────────────────────────┤
```

---

## 3. AUTOMATIC REPAYMENT TRIGGER FLOW (⭐ CORE FEATURE)

```
┌─────────────┐                                ┌──────────┐                ┌───────────┐
│ Borrower    │                                │ Backend  │                │ Database  │
└────┬────────┘                                └────┬─────┘                └─────┬─────┘
     │                                             │                            │
     │ 1. Receives Income (M-PESA)                 │                            │
     │    Ksh 1000                                 │                            │
     │                                             │                            │
     │ 2. POST /transactions/incoming              │                            │
     │    { amount: 1000 }                         │                            │
     ├────────────────────────────────────────────>│                            │
     │                                             │                            │
     │                              Verify JWT
     │                              Generate transaction UUID
     │                              ────────────────────────────────────────────>│
     │                              INSERT INTO transactions
     │                              │
     │                              UPDATE users
     │                              SET wallet_balance += 1000
     │                              ────────────────────────────────────────────>│
     │                              <────────────────────────────────────────────
     │                              │
     │                              ┌────────────────────────────────────┐
     │                              │ checkAndProcessRepayments()        │
     │                              │ Called automatically               │
     │                              └────────┬─────────────────────────┘
     │                                       │
     │                              Is amount >= Threshold (100)?
     │                              YES ↓
     │                              │
     │                              GET active loans for borrower
     │                              ────────────────────────────────────────────>│
     │                              <────────────────────────────────────────────
     │                              └─ loans = [
     │                                   {
     │                                     id, remaining_balance: 5000,
     │                                     repayment_method: 'fixed',
     │                                     repayment_amount: 500
     │                                   }
     │                                ]
     │                              │
     │                              For each active loan:
     │                              ┌─────────────────────────────┐
     │                              │ 1. Get loan details          │
     │                              │ 2. Calculate repayment:      │
     │                              │    - Fixed: 500              │
     │                              │    - Percentage: 10% = 100   │
     │                              │ 3. Deduct = min(repay,       │
     │                              │             incoming,        │
     │                              │             remaining)       │
     │                              │    = min(500, 1000, 5000)    │
     │                              │    = 500                     │
     │                              │ 4. newBalance = 5000 - 500   │
     │                              │               = 4500         │
     │                              └─────────────────────────────┘
     │                              │
     │                              ────────────────────────────────────────────>│
     │                              INSERT INTO repayments
     │                              (loan_id, amount_deducted: 500,
     │                               remaining_balance_after: 4500,
     │                               transaction_id, status: 'completed')
     │                              │
     │                              UPDATE loans
     │                              SET remaining_balance = 4500,
     │                                  status = 'active' (or 'completed' if 0)
     │                              ────────────────────────────────────────────>│
     │                              <────────────────────────────────────────────
     │                              │
     │                              Create notification for BORROWER
     │                              ────────────────────────────────────────────>│
     │                              INSERT INTO notifications
     │                              message: "Ksh 500 deducted for loan repayment.
     │                                         Balance: Ksh 4500"
     │                              │
     │                              Create notification for LENDER
     │                              ────────────────────────────────────────────>│
     │                              INSERT INTO notifications
     │                              message: "Ksh 500 received from borrower.
     │                                         Loan Balance: Ksh 4500"
     │                              │
     │                              remaining_amount = 1000 - 500 = 500
     │                              │
     │                              Process next loan OR exit if 
     │                              remaining_amount <= 0
     │                              │
     │ 3. 201 Created               │
     │    Transaction recorded      │
     │<────────────────────────────────────────────┤
     │                                             │
     │ 4. Notifications appear:                    │
     │    • Repayment deducted                     │
     │    • Balance: 4500                          │
     │                                             │
     │ 5. User sees:                               │
     │    • Wallet: 1000 (not 1000)               │
     │    • Loan balance: 4500                     │
     │    • Repayment history updated              │
```

---

## 4. REPAYMENT TRACKING FLOW

```
┌────────────┐                                ┌──────────┐                ┌──────────────┐
│ User       │                                │ Backend  │                │ Database     │
│(Borrower)  │                                └────┬─────┘                └────┬─────────┘
└────┬───────┘                                     │                           │
     │                                             │                           │
     │ 1. View My Loans                            │                           │
     │    GET /loans/borrower                      │                           │
     ├────────────────────────────────────────────>│                           │
     │                                             │                           │
     │                              Verify JWT     │
     │                              Get user_id    │
     │                              ──────────────────────────────────────────>│
     │                              SELECT loans WHERE borrower_id = user_id
     │                              JOIN users (lender info)
     │                              <──────────────────────────────────────────
     │                              └─ loans = [
     │                                   {
     │                                     id, principal: 5000,
     │                                     remaining_balance: 3500,
     │                                     repayment_method: 'fixed',
     │                                     repayment_amount: 500,
     │                                     status: 'active',
     │                                     lender_name, lender_phone
     │                                   }
     │                                ]
     │                              │
     │ 2. 200 OK                    │
     │    loans = [...]             │
     │<────────────────────────────────────────────┤
     │                                             │
     │ 3. Display loans                            │
     │    - Show progress: 30% paid (1500/5000)   │
     │    - Remaining: 3500                        │
     │    - Next payment: 500                      │
     │                                             │
     │ 4. Click loan → View Repayments             │
     │    GET /repayments/loan/:loanId             │
     ├────────────────────────────────────────────>│
     │                                             │
     │                              Verify JWT     │
     │                              Authorize user │
     │                              ──────────────────────────────────────────>│
     │                              SELECT * FROM repayments
     │                              WHERE loan_id = ?
     │                              ORDER BY created_at DESC
     │                              <──────────────────────────────────────────
     │                              └─ repayments = [
     │                                   {
     │                                     id, amount_deducted: 500,
     │                                     remaining_balance_after: 3500,
     │                                     transaction_id, status, created_at
     │                                   },
     │                                   {
     │                                     id, amount_deducted: 500,
     │                                     remaining_balance_after: 4000,
     │                                     transaction_id, status, created_at
     │                                   },
     │                                   {
     │                                     id, amount_deducted: 500,
     │                                     remaining_balance_after: 4500,
     │                                     transaction_id, status, created_at
     │                                   }
     │                                ]
     │                              │
     │ 5. 200 OK                    │
     │    repayments = [...]        │
     │<────────────────────────────────────────────┤
     │                                             │
     │ 6. Display repayment history                │
     │    - Date | Amount | Balance               │
     │    - 12:30 | 500   | 3500                  │
     │    - 11:20 | 500   | 4000                  │
     │    - 10:15 | 500   | 4500                  │
     │                                             │
     │    Statistics:                              │
     │    - Total repaid: 1500                     │
     │    - Remaining: 3500                        │
     │    - % complete: 30%                        │
```

---

## 5. NOTIFICATION FLOW

```
┌────────────────────┐                    ┌──────────┐                ┌──────────────┐
│ Multiple Users     │                    │ Backend  │                │ Database     │
│ (system events)    │                    └────┬─────┘                └────┬─────────┘
└────┬───────────────┘                         │                           │
     │                                         │                           │
     Event: New Loan Request                   │                           │
     ├────────────────────────────────────────>│                           │
     │                         Detect borrower requesting
     │                         ──────────────────────────────────────────>│
     │                         INSERT INTO notifications
     │                         (user_id: LENDER_ID,
     │                          type: 'loan_request',
     │                          message: 'New loan request...')
     │                         │
     │                         Event: Loan Approved/Declined
     │                         ├─────────────────────────────────────────>│
     │                         │ INSERT INTO notifications
     │                         │ (user_id: BORROWER_ID,
     │                         │  type: 'approval',
     │                         │  message: 'Loan approved...')
     │                         │
     │                         Event: Automatic Repayment Triggered
     │                         ├─────────────────────────────────────────>│
     │                         │ INSERT INTO notifications (x2)
     │                         │ - Borrower: "Ksh 500 deducted..."
     │                         │ - Lender: "Ksh 500 received..."
     │                         │
     │                         │
     │ User Views Notifications │
     │ GET /notifications       │
     ├────────────────────────────────────────>│
     │                         │
     │                         Verify JWT
     │                         ──────────────────────────────────────────>│
     │                         SELECT * FROM notifications
     │                         WHERE user_id = ?
     │                         ORDER BY created_at DESC
     │                         <──────────────────────────────────────────
     │                         └─ notifications = [
     │                              {
     │                                id, type, message, status: 'unread',
     │                                created_at
     │                              }, ...
     │                           ]
     │                         │
     │ 200 OK                  │
     │ notifications = [...]   │
     │<────────────────────────────────────────┤
     │                         │
     │ Display unread count    │
     │ Show notification list  │
     │ Mark as read on click   │
     │ PATCH /notifications/:id/read
     ├────────────────────────────────────────>│
     │                         │
     │                         UPDATE notifications
     │                         SET status = 'read'
     │                         ──────────────────────────────────────────>│
     │                         <──────────────────────────────────────────
     │                         │
     │ 200 OK                  │
     │<────────────────────────────────────────┤
```

---

## 6. DATA FLOW DIAGRAM

```
┌──────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                           │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │  Pages: Login, Dashboard, My Loans, Request Loan, Wallet,   │ │
│ │          Transactions, Repayments, Notifications            │ │
│ └──────────┬───────────────────────────────────────────────────┘ │
│            │                                                      │
│  ┌─────────▼────────────────────────────────────────────────┐   │
│  │  AuthContext: JWT Token, User Profile, Login/Logout     │   │
│  └──────┬──────────────────────────────────────────────────┘    │
│         │                                                        │
│  ┌──────▼──────────────────────────────────────────────────┐    │
│  │  API Service: Axios instance with                       │    │
│  │  - Base URL: http://localhost:5000/api                  │    │
│  │  - Auth header: Authorization: Bearer TOKEN              │    │
│  │  - Error handling: Try/catch, user-friendly messages    │    │
│  └──────┬──────────────────────────────────────────────────┘    │
└─────────┼───────────────────────────────────────────────────────┘
          │ HTTP/JSON
          │
┌─────────▼───────────────────────────────────────────────────────┐
│                    Backend (Express.js)                          │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │  Middleware Layer                                          │ │
│ │  - CORS handler                                            │ │
│ │  - Body parser (JSON)                                      │ │
│ │  - JWT verification (for protected routes)                │ │
│ └────────────────────────────────────────────────────────────┘ │
│                           ↓                                      │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │  Route Handlers (Request Processing)                      │ │
│ │  - /auth (register, login)                                 │ │
│ │  - /users (profile, wallet)                                │ │
│ │  - /loans (request, approval, get)                         │ │
│ │  - /transactions (incoming, history)                       │ │
│ │  - /repayments (history, tracking)                         │ │
│ │  - /notifications (get, read)                              │ │
│ └────────────────────────────────────────────────────────────┘ │
│                           ↓                                      │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │  Business Logic                                            │ │
│ │  - Input validation                                        │ │
│ │  - Phone normalization                                     │ │
│ │  - Authentication logic                                    │ │
│ │  - Loan status management                                  │ │
│ │  - ⭐ checkAndProcessRepayments() - AUTO REPAYMENT       │ │
│ │  - Notification generation                                │ │
│ └────────────────────────────────────────────────────────────┘ │
│                           ↓                                      │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │  Database Queries (Parameterized)                         │ │
│ │  - INSERT: new records                                     │ │
│ │  - SELECT: retrieve data                                   │ │
│ │  - UPDATE: modify records                                  │ │
│ │  - JOIN: combine tables                                    │ │
│ └────────────────────────────────────────────────────────────┘ │
└─────────┬────────────────────────────────────────────────────────┘
          │ SQL Queries
          │
┌─────────▼──────────────────────────────────────────────────────┐
│              PostgreSQL Database                                │
│                                                                 │
│  Tables:                                                        │
│  ├─ users (profiles, wallets)                                  │
│  ├─ loans (borrower-lender agreements)                         │
│  ├─ transactions (M-PESA incoming)                             │
│  ├─ repayments (auto-deduction records)                        │
│  └─ notifications (alert messages)                             │
│                                                                 │
│  Relationships:                                                │
│  ├─ loans.borrower_id → users.id                               │
│  ├─ loans.lender_id → users.id                                 │
│  ├─ transactions.user_id → users.id                            │
│  ├─ repayments.loan_id → loans.id                              │
│  └─ notifications.user_id → users.id                           │
└──────────────────────────────────────────────────────────────────┘
```

---

## 7. AUTOMATIC REPAYMENT DETAILED ALGORITHM

```
function checkAndProcessRepayments(userId, incomingAmount, transactionId) {
  
  // Step 1: Check threshold
  ┌─────────────────────────────────┐
  │ Is incomingAmount >= 100?       │
  │ NO → Return (skip processing)   │
  │ YES → Continue                  │
  └────────────────┬────────────────┘
                   │
  // Step 2: Get active loans
  ├─→ Query: SELECT * FROM loans
  │          WHERE borrower_id = userId
  │          AND status = 'active'
  │          AND remaining_balance > 0
  │          ORDER BY created_at ASC (FIFO)
  │
  └─→ Example result:
      [
        Loan1: { id: L1, remaining: 5000, method: 'fixed', amount: 500 },
        Loan2: { id: L2, remaining: 3000, method: 'percentage', amount: 10 }
      ]
  
  // Step 3: Process each loan
  remainingAmount = 1000
  
  ┌──────────────────────────────────────┐
  │ FOR EACH LOAN in loans              │
  └────────────────┬─────────────────────┘
                   │
                   ├─→ Loan1:
                   │   ├─ Calculate repayment:
                   │   │  If method = 'fixed': amount = 500
                   │   │  If method = 'percentage': amount = 1000 * 10% = 100
                   │   │  → repaymentAmount = 500
                   │   │
                   │   ├─ Calculate deduction:
                   │   │  deductedAmount = MIN(
                   │   │    repaymentAmount,        # 500
                   │   │    remainingAmount,        # 1000
                   │   │    loan.remaining_balance  # 5000
                   │   │  ) = MIN(500, 1000, 5000) = 500
                   │   │
                   │   ├─ Update loan:
                   │   │  newBalance = 5000 - 500 = 4500
                   │   │  INSERT repayment record
                   │   │  UPDATE loan balance & status
                   │   │
                   │   ├─ Send notifications:
                   │   │  Borrower: "Ksh 500 deducted. Balance: 4500"
                   │   │  Lender: "Ksh 500 received. Balance: 4500"
                   │   │
                   │   └─ Update remaining:
                   │      remainingAmount = 1000 - 500 = 500
                   │
                   ├─→ Loan2:
                   │   ├─ Calculate repayment:
                   │   │  method = 'percentage': amount = 1000 * 10% = 100
                   │   │
                   │   ├─ Calculate deduction:
                   │   │  deductedAmount = MIN(100, 500, 3000) = 100
                   │   │
                   │   ├─ Update loan:
                   │   │  newBalance = 3000 - 100 = 2900
                   │   │  Similar process...
                   │   │
                   │   └─ Update remaining:
                   │      remainingAmount = 500 - 100 = 400
                   │
                   └─→ If remainingAmount <= 0: BREAK (no more funds)

  // Step 4: Complete
  Return with repayments processed
}
```

---

## 8. WALLET & BALANCE FLOW

```
Initial State:
┌─────────────────┐
│ Wallet Balance  │
│   Ksh 5,000     │
└────────┬────────┘
         │
         ├─ Incoming Transaction: +1,000
         │  └─→ Balance: 6,000
         │
         ├─ Auto-repayment: -500
         │  (Deducted automatically on transaction)
         │  └─→ Balance: 5,500
         │
         ├─ Another transaction: +2,000
         │  └─→ Balance: 7,500
         │
         ├─ Auto-repayment: -500
         │  └─→ Balance: 7,000
         │
         └─ Final Balance: Ksh 7,000

Important: User receives FULL incoming amount first,
           THEN automatic repayment is deducted!
           No "net" display - transparency is key.
```

---

## 9. COMPLETE LOAN LIFECYCLE

```
LOAN CREATION
    ↓
┌───────────────────────────────┐
│ Status: PENDING               │
│ Lender has NOT seen it yet    │
│ No repayment processing       │
└───────────────┬───────────────┘
                │
                ├─→ Lender receives notification
                │
                ├─→ Lender APPROVES
                │   └───────────────────────────┐
                │                               │ Lender DECLINES
                │                               │ └─────────────┐
                │                               │               │
┌───────────────▼──────────────────────────────────────┐       │
│ Status: ACTIVE                          │            │       │
│ Repayment processing ENABLED            │            │       │
│ Auto-deductions happen on transactions  │            │       │
│                                          │            │       │
│ Loan Balance: 5000 → 4500 → 4000 → ...  │            │       │
│              (decreases over time)       │            │       │
└───────────────┬─────────────────────────────────────┘       │
                │                                               │
                ├─→ Remaining Balance = 0                       │
                │   └──────────────────────────────┐            │
                │                                  │            │
                │                    ┌─────────────▼────────┐  │
                │                    │ Status: DECLINED     │◄─┘
                │                    │ Repayment DISABLED   │
                │                    │ No further action    │
                │                    └──────────────────────┘
                │
┌───────────────▼──────────────────────────────────────┐
│ Status: COMPLETED                                   │
│ Loan fully repaid                                   │
│ Repayment processing DISABLED                       │
│ Both parties can view full history                  │
└───────────────────────────────────────────────────────┘
```

---

## 10. MULTI-LOAN SCENARIO

```
Borrower: John
Lender1: Jane
Lender2: Mike

┌────────────────────────────────────────┐
│ John's Active Loans (in order)        │
├────────────────────────────────────────┤
│ Loan A (from Jane) - Balance: 5000    │ ← Processed first
│ Loan B (from Mike) - Balance: 3000    │ ← Processed second
└────────────────────────────────────────┘

Event: John receives Ksh 1500 (transaction)
↓
checkAndProcessRepayments(john_id, 1500)
↓
Processing order (FIFO - oldest first):

1. Process Loan A (5000 remaining):
   ├─ Repayment: 500 (fixed)
   ├─ Deduct: min(500, 1500, 5000) = 500
   ├─ Balance: 5000 - 500 = 4500
   ├─ Notifications sent to John & Jane
   └─ Remaining amount: 1500 - 500 = 1000

2. Process Loan B (3000 remaining):
   ├─ Repayment: 300 (fixed)
   ├─ Deduct: min(300, 1000, 3000) = 300
   ├─ Balance: 3000 - 300 = 2700
   ├─ Notifications sent to John & Mike
   └─ Remaining amount: 1000 - 300 = 700

3. Back to Loan A (if available):
   ├─ Repayment: 500
   ├─ Deduct: min(500, 700, 4500) = 500
   ├─ Balance: 4500 - 500 = 4000
   ├─ Notifications sent
   └─ Remaining amount: 700 - 500 = 200

4. Back to Loan B:
   ├─ Repayment: 300
   ├─ Deduct: min(300, 200, 2700) = 200
   ├─ Balance: 2700 - 200 = 2500
   ├─ Notifications sent
   └─ Remaining amount: 200 - 200 = 0

DONE: No more funds to process

Result:
├─ John's wallet: +1500 (received)
├─ Loan A (Jane): 4000 remaining (paid 1000)
├─ Loan B (Mike): 2500 remaining (paid 500)
└─ 4 repayment records created
   └─ 8 notifications sent (2 per repayment)
```

This is production-grade automatic loan management!
