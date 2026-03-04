# Offline Database Schema - Phase 2 Complete

## Overview

SQLite schema design for Android/iOS offline storage. Enables complete peer-to-peer lending functionality without internet.

**Status:** ✅ Phase 2 Complete  
**Database:** SQLite 3.x  
**Implementation Date:** November 2025

---

## Architecture

```
ANDROID/iOS APP
    ↓
┌─────────────────────────────────────┐
│    SQLite Local Database            │
│  (Fully contained in app)           │
│  ├─ Users                           │
│  ├─ Loans                           │
│  ├─ Transactions                    │
│  ├─ Repayments                      │
│  ├─ Notifications                   │
│  ├─ Sync Metadata                   │
│  └─ Offline Queue                   │
└──────────────┬──────────────────────┘
               │
      (When Online)
               ↓
   ┌──────────────────────────┐
   │  Sync with Backend API   │
   │  (PostgreSQL)            │
   └──────────────────────────┘
```

---

## Database Tables

### 1. **Users** - Local User Profiles

Stores user account information cached locally.

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  name TEXT,
  email TEXT,
  wallet_balance REAL DEFAULT 0,
  created_at INTEGER,
  updated_at INTEGER,
  synced BOOLEAN DEFAULT 0,
  sync_timestamp INTEGER
);
```

**Fields:**
- `id`: UUID (local)
- `phone`: Phone number (unique identifier)
- `name`: User's name
- `email`: Email address
- `wallet_balance`: Current wallet balance (Ksh)
- `created_at`: Creation timestamp (Unix milliseconds)
- `updated_at`: Last update timestamp
- `synced`: Whether synced with backend
- `sync_timestamp`: Last sync time

**Indexes:**
```sql
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_synced ON users(synced);
```

**Example Data:**
```json
{
  "id": "user-uuid-123",
  "phone": "254701234567",
  "name": "John Doe",
  "email": "john@example.com",
  "wallet_balance": 5000.00,
  "created_at": 1701356400000,
  "updated_at": 1701356400000,
  "synced": true,
  "sync_timestamp": 1701356400000
}
```

---

### 2. **Loans** - Loan Agreements

Core loan data - both as borrower and lender.

```sql
CREATE TABLE loans (
  id TEXT PRIMARY KEY,
  borrower_id TEXT NOT NULL,
  borrower_phone TEXT NOT NULL,
  lender_id TEXT NOT NULL,
  lender_phone TEXT NOT NULL,
  amount REAL NOT NULL,
  balance REAL NOT NULL,
  repayment_amount REAL NOT NULL,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at INTEGER,
  updated_at INTEGER,
  due_date INTEGER,
  completed_at INTEGER,
  synced BOOLEAN DEFAULT 0,
  sync_timestamp INTEGER,
  conflict_resolved BOOLEAN DEFAULT 0,
  FOREIGN KEY(borrower_id) REFERENCES users(id),
  FOREIGN KEY(lender_id) REFERENCES users(id)
);
```

**Fields:**
- `id`: Loan UUID
- `borrower_id`: Borrower user ID
- `borrower_phone`: Borrower phone (for offline queries)
- `lender_id`: Lender user ID
- `lender_phone`: Lender phone (for offline queries)
- `amount`: Original loan amount
- `balance`: Remaining balance
- `repayment_amount`: Repayment per transaction
- `status`: pending | approved | active | completed | cancelled
- `notes`: Additional notes
- `created_at`: Creation time
- `updated_at`: Last update time
- `due_date`: Optional due date
- `completed_at`: When loan was fully repaid
- `synced`: Sync status
- `sync_timestamp`: Last sync time
- `conflict_resolved`: Whether sync conflict was handled

**Indexes:**
```sql
CREATE INDEX idx_loans_borrower ON loans(borrower_id);
CREATE INDEX idx_loans_lender ON loans(lender_id);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_loans_synced ON loans(synced);
CREATE INDEX idx_loans_borrower_phone ON loans(borrower_phone);
CREATE INDEX idx_loans_lender_phone ON loans(lender_phone);
```

**Example Data:**
```json
{
  "id": "loan-uuid-456",
  "borrower_id": "user-uuid-123",
  "borrower_phone": "254701234567",
  "lender_id": "user-uuid-789",
  "lender_phone": "254702345678",
  "amount": 5000.00,
  "balance": 4000.00,
  "repayment_amount": 500.00,
  "status": "approved",
  "notes": "Personal loan",
  "created_at": 1701356400000,
  "updated_at": 1701356500000,
  "due_date": 1702166400000,
  "completed_at": null,
  "synced": false,
  "sync_timestamp": 0,
  "conflict_resolved": false
}
```

---

### 3. **Transactions** - Money Movements

Simulated or tracked transactions.

```sql
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_phone TEXT NOT NULL,
  amount REAL NOT NULL,
  transaction_type TEXT DEFAULT 'incoming',
  description TEXT,
  status TEXT DEFAULT 'completed',
  created_at INTEGER,
  synced BOOLEAN DEFAULT 0,
  sync_timestamp INTEGER,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
```

**Fields:**
- `id`: Transaction UUID
- `user_id`: User ID
- `user_phone`: User phone (for offline queries)
- `amount`: Transaction amount
- `transaction_type`: incoming | outgoing | transfer
- `description`: Transaction description
- `status`: pending | completed | failed
- `created_at`: Transaction time
- `synced`: Sync status
- `sync_timestamp`: Last sync time

**Indexes:**
```sql
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_user_phone ON transactions(user_phone);
CREATE INDEX idx_transactions_created ON transactions(created_at);
CREATE INDEX idx_transactions_synced ON transactions(synced);
```

**Example Data:**
```json
{
  "id": "tx-uuid-001",
  "user_id": "user-uuid-123",
  "user_phone": "254701234567",
  "amount": 1000.00,
  "transaction_type": "incoming",
  "description": "M-PESA received from Jane",
  "status": "completed",
  "created_at": 1701356600000,
  "synced": false,
  "sync_timestamp": 0
}
```

---

### 4. **Repayments** - Automatic Deductions

Records of automatic loan repayments.

```sql
CREATE TABLE repayments (
  id TEXT PRIMARY KEY,
  loan_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  amount REAL NOT NULL,
  balance_after REAL NOT NULL,
  borrower_phone TEXT NOT NULL,
  lender_phone TEXT NOT NULL,
  created_at INTEGER,
  synced BOOLEAN DEFAULT 0,
  sync_timestamp INTEGER,
  FOREIGN KEY(loan_id) REFERENCES loans(id),
  FOREIGN KEY(transaction_id) REFERENCES transactions(id)
);
```

**Fields:**
- `id`: Repayment UUID
- `loan_id`: Associated loan ID
- `transaction_id`: Associated transaction ID
- `amount`: Repayment amount
- `balance_after`: Loan balance after repayment
- `borrower_phone`: Borrower phone
- `lender_phone`: Lender phone
- `created_at`: Repayment time
- `synced`: Sync status
- `sync_timestamp`: Last sync time

**Indexes:**
```sql
CREATE INDEX idx_repayments_loan ON repayments(loan_id);
CREATE INDEX idx_repayments_transaction ON repayments(transaction_id);
CREATE INDEX idx_repayments_created ON repayments(created_at);
CREATE INDEX idx_repayments_synced ON repayments(synced);
```

**Example Data:**
```json
{
  "id": "repay-uuid-001",
  "loan_id": "loan-uuid-456",
  "transaction_id": "tx-uuid-001",
  "amount": 500.00,
  "balance_after": 4000.00,
  "borrower_phone": "254701234567",
  "lender_phone": "254702345678",
  "created_at": 1701356600000,
  "synced": false,
  "sync_timestamp": 0
}
```

---

### 5. **Notifications** - User Alerts

Local notifications cache.

```sql
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_phone TEXT NOT NULL,
  type TEXT,
  title TEXT NOT NULL,
  message TEXT,
  read BOOLEAN DEFAULT 0,
  created_at INTEGER,
  synced BOOLEAN DEFAULT 0,
  FOREIGN KEY(user_phone) REFERENCES users(phone)
);
```

**Fields:**
- `id`: Notification UUID
- `user_phone`: Recipient phone
- `type`: LOAN_REQUEST | LOAN_APPROVED | REPAYMENT | TRANSACTION | etc.
- `title`: Short title
- `message`: Full message
- `read`: Whether user has read
- `created_at`: Creation time
- `synced`: Sync status

**Indexes:**
```sql
CREATE INDEX idx_notifications_user ON notifications(user_phone);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created ON notifications(created_at);
```

---

### 6. **Sync Metadata** - Track Synchronization

Metadata about sync state and conflicts.

```sql
CREATE TABLE sync_metadata (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT DEFAULT 'insert',
  local_version INTEGER DEFAULT 1,
  server_version INTEGER DEFAULT 0,
  last_synced_at INTEGER,
  last_conflict_at INTEGER,
  conflict_resolution TEXT,
  synced BOOLEAN DEFAULT 0,
  UNIQUE(entity_type, entity_id)
);
```

**Fields:**
- `id`: Metadata UUID
- `entity_type`: users | loans | transactions | repayments
- `entity_id`: ID of the entity
- `operation`: insert | update | delete
- `local_version`: Local version number
- `server_version`: Server version number
- `last_synced_at`: Timestamp of last sync
- `last_conflict_at`: Timestamp of last conflict
- `conflict_resolution`: How conflict was resolved
- `synced`: Overall sync status

**Indexes:**
```sql
CREATE INDEX idx_sync_entity ON sync_metadata(entity_type, entity_id);
CREATE INDEX idx_sync_synced ON sync_metadata(synced);
```

---

### 7. **Offline Queue** - Pending Operations

Queue of operations to sync when online.

```sql
CREATE TABLE offline_queue (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  operation TEXT NOT NULL,
  data TEXT NOT NULL,
  retry_count INTEGER DEFAULT 0,
  created_at INTEGER,
  last_retry_at INTEGER,
  error_message TEXT,
  synced BOOLEAN DEFAULT 0,
  UNIQUE(id)
);
```

**Fields:**
- `id`: Queue item UUID
- `entity_type`: loans | transactions | repayments | approvals
- `operation`: CREATE | UPDATE | DELETE
- `data`: JSON string of the operation data
- `retry_count`: Number of retry attempts
- `created_at`: When queued
- `last_retry_at`: Last retry attempt time
- `error_message`: Error from last attempt
- `synced`: Whether successfully synced

**Indexes:**
```sql
CREATE INDEX idx_queue_synced ON offline_queue(synced);
CREATE INDEX idx_queue_created ON offline_queue(created_at);
CREATE INDEX idx_queue_retry ON offline_queue(retry_count);
```

**Example Data:**
```json
{
  "id": "queue-uuid-001",
  "entity_type": "loans",
  "operation": "CREATE",
  "data": "{\"borrowerPhone\":\"254701234567\",\"lenderPhone\":\"254702345678\",\"amount\":5000,\"repaymentAmount\":500}",
  "retry_count": 0,
  "created_at": 1701356400000,
  "last_retry_at": null,
  "error_message": null,
  "synced": false
}
```

---

## Complete SQL Schema

```sql
-- Users Table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  name TEXT,
  email TEXT,
  wallet_balance REAL DEFAULT 0,
  created_at INTEGER,
  updated_at INTEGER,
  synced BOOLEAN DEFAULT 0,
  sync_timestamp INTEGER
);

-- Loans Table
CREATE TABLE loans (
  id TEXT PRIMARY KEY,
  borrower_id TEXT NOT NULL,
  borrower_phone TEXT NOT NULL,
  lender_id TEXT NOT NULL,
  lender_phone TEXT NOT NULL,
  amount REAL NOT NULL,
  balance REAL NOT NULL,
  repayment_amount REAL NOT NULL,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at INTEGER,
  updated_at INTEGER,
  due_date INTEGER,
  completed_at INTEGER,
  synced BOOLEAN DEFAULT 0,
  sync_timestamp INTEGER,
  conflict_resolved BOOLEAN DEFAULT 0,
  FOREIGN KEY(borrower_id) REFERENCES users(id),
  FOREIGN KEY(lender_id) REFERENCES users(id)
);

-- Transactions Table
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_phone TEXT NOT NULL,
  amount REAL NOT NULL,
  transaction_type TEXT DEFAULT 'incoming',
  description TEXT,
  status TEXT DEFAULT 'completed',
  created_at INTEGER,
  synced BOOLEAN DEFAULT 0,
  sync_timestamp INTEGER,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

-- Repayments Table
CREATE TABLE repayments (
  id TEXT PRIMARY KEY,
  loan_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  amount REAL NOT NULL,
  balance_after REAL NOT NULL,
  borrower_phone TEXT NOT NULL,
  lender_phone TEXT NOT NULL,
  created_at INTEGER,
  synced BOOLEAN DEFAULT 0,
  sync_timestamp INTEGER,
  FOREIGN KEY(loan_id) REFERENCES loans(id),
  FOREIGN KEY(transaction_id) REFERENCES transactions(id)
);

-- Notifications Table
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_phone TEXT NOT NULL,
  type TEXT,
  title TEXT NOT NULL,
  message TEXT,
  read BOOLEAN DEFAULT 0,
  created_at INTEGER,
  synced BOOLEAN DEFAULT 0,
  FOREIGN KEY(user_phone) REFERENCES users(phone)
);

-- Sync Metadata Table
CREATE TABLE sync_metadata (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT DEFAULT 'insert',
  local_version INTEGER DEFAULT 1,
  server_version INTEGER DEFAULT 0,
  last_synced_at INTEGER,
  last_conflict_at INTEGER,
  conflict_resolution TEXT,
  synced BOOLEAN DEFAULT 0,
  UNIQUE(entity_type, entity_id)
);

-- Offline Queue Table
CREATE TABLE offline_queue (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  operation TEXT NOT NULL,
  data TEXT NOT NULL,
  retry_count INTEGER DEFAULT 0,
  created_at INTEGER,
  last_retry_at INTEGER,
  error_message TEXT,
  synced BOOLEAN DEFAULT 0,
  UNIQUE(id)
);

-- Create Indexes
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_synced ON users(synced);

CREATE INDEX idx_loans_borrower ON loans(borrower_id);
CREATE INDEX idx_loans_lender ON loans(lender_id);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_loans_synced ON loans(synced);
CREATE INDEX idx_loans_borrower_phone ON loans(borrower_phone);
CREATE INDEX idx_loans_lender_phone ON loans(lender_phone);

CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_user_phone ON transactions(user_phone);
CREATE INDEX idx_transactions_created ON transactions(created_at);
CREATE INDEX idx_transactions_synced ON transactions(synced);

CREATE INDEX idx_repayments_loan ON repayments(loan_id);
CREATE INDEX idx_repayments_transaction ON repayments(transaction_id);
CREATE INDEX idx_repayments_created ON repayments(created_at);
CREATE INDEX idx_repayments_synced ON repayments(synced);

CREATE INDEX idx_notifications_user ON notifications(user_phone);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created ON notifications(created_at);

CREATE INDEX idx_sync_entity ON sync_metadata(entity_type, entity_id);
CREATE INDEX idx_sync_synced ON sync_metadata(synced);

CREATE INDEX idx_queue_synced ON offline_queue(synced);
CREATE INDEX idx_queue_created ON offline_queue(created_at);
CREATE INDEX idx_queue_retry ON offline_queue(retry_count);
```

---

## Data Flow: Online vs Offline

### Online Mode
```
User Action
    ↓
App Logic
    ↓
SQLite Local DB
    ↓
POST to Backend API
    ↓
PostgreSQL Backend
    ↓
Response
    ↓
Update SQLite + mark synced
    ↓
User sees result
```

### Offline Mode
```
User Action
    ↓
App Logic
    ↓
SQLite Local DB
    ↓
Add to Offline Queue
    ↓
Show "Saved offline" message
    ↓
[User goes online]
    ↓
Sync Service detects internet
    ↓
Process Offline Queue
    ↓
POST to Backend API
    ↓
Handle conflicts if any
    ↓
Mark as synced
```

---

## Sync Strategy

### Conflict Detection
```
Local Record has version 5
Server Record has version 3

→ Local is newer, use local version

Local Record has version 3
Server Record has version 5

→ Server is newer, use server version with notification

Local Record version 5
Server Record version 5

→ No conflict, mark synced
```

### Sync Queue Entry Format
```json
{
  "id": "queue-item-uuid",
  "entityType": "loans",
  "operation": "CREATE",
  "data": {
    "borrowerPhone": "254701234567",
    "lenderPhone": "254702345678",
    "amount": 5000,
    "repaymentAmount": 500
  },
  "retryCount": 0,
  "createdAt": 1701356400000,
  "lastRetryAt": null,
  "errorMessage": null,
  "synced": false
}
```

---

## Storage Size Estimation

| Item | Size | Notes |
|------|------|-------|
| Single user | ~200 bytes | Phone, name, email |
| Single loan | ~400 bytes | Includes dates, amounts |
| Single transaction | ~250 bytes | Type, amount, description |
| Single repayment | ~300 bytes | Related IDs, amounts |
| Single notification | ~200 bytes | Text content |
| **Per active loan** | **~1.5 KB** | Loan + related transactions |
| **10 active loans** | **~15 KB** | Full history |
| **100 active loans** | **~150 KB** | Large portfolio |
| **SQLite database** | **~5-10 MB** | Comfortable on any phone |

**Recommendation:** ~10 MB reserved, uses 1-5 MB typically

---

## Migration from PostgreSQL to SQLite

When syncing from backend:

```
PostgreSQL Record (Backend)
    ↓
Convert to SQLite format
    ↓
Check for conflicts
    ↓
Update or insert into SQLite
    ↓
Mark as synced
    ↓
Update sync_metadata
```

---

## Key Design Decisions

1. **Phone as Primary Identifier**
   - Phone numbers work offline
   - No internet needed for queries
   - Unique per user

2. **Denormalized Fields**
   - Stores `borrower_phone` and `lender_phone` in loans
   - Allows queries without foreign key joins offline
   - Slight data duplication, huge offline benefit

3. **Sync Metadata Table**
   - Tracks local vs server versions
   - Detects conflicts before syncing
   - Enables smart merge strategies

4. **Offline Queue**
   - All offline operations queued
   - Retry logic built-in
   - Error tracking per operation

5. **Timestamp-based Sync**
   - Uses millisecond timestamps
   - Enables incremental syncs
   - Detect what changed since last sync

---

## Usage Examples

### Store User Locally
```kotlin
val user = User(
  id = "user-uuid-123",
  phone = "254701234567",
  name = "John Doe",
  email = "john@example.com",
  walletBalance = 5000.00
)
userDao.insert(user)
```

### Create Loan Offline
```kotlin
val loan = Loan(
  id = UUID.randomUUID().toString(),
  borrowerId = currentUserId,
  borrowerPhone = currentPhone,
  lenderId = "unknown", // Will fill on sync
  lenderPhone = "254702345678",
  amount = 5000.00,
  balance = 5000.00,
  repaymentAmount = 500.00,
  status = "pending",
  synced = false
)
loanDao.insert(loan)

// Queue for sync
offlineQueueDao.insert(OfflineQueueItem(
  entityType = "loans",
  operation = "CREATE",
  data = loanToJson(loan)
))
```

### Query Loans for User
```kotlin
// By borrower phone (works offline)
val borrowedLoans = loanDao.getLoansByBorrowerPhone(userPhone)

// By lender phone (works offline)
val lentLoans = loanDao.getLoansByLenderPhone(userPhone)

// Pending approval
val pending = loanDao.getLoansByStatus("pending")
```

### Mark Transaction for Auto-Repayment
```kotlin
val transaction = Transaction(
  id = UUID.randomUUID().toString(),
  userId = userId,
  userPhone = userPhone,
  amount = 1000.00,
  transactionType = "incoming",
  status = "completed"
)
transactionDao.insert(transaction)

// Check for auto-repayments
checkAndProcessRepayments(userPhone, 1000.00)
```

---

## Android Implementation Overview

Will implement in Phase 4 with:
- Room Database ORM
- DAO (Data Access Objects)
- LiveData for observables
- Migration helper
- Backup/restore utilities

---

## Testing Checklist

- [x] Schema validates (no syntax errors)
- [x] All foreign keys properly defined
- [x] Indexes for common queries
- [x] No circular dependencies
- [x] Can handle NULL values appropriately
- [x] Denormalization justified
- [x] Storage size acceptable
- [x] Sync metadata tracks versions
- [x] Offline queue supports retries
- [x] Phone as offline identifier
- [x] Timestamp precision (milliseconds)

---

## Files Provided

1. **OFFLINE_DATABASE_SCHEMA.md** (this file)
2. **SQL schema** (ready for SQLite)
3. **Example data** (for testing)
4. **Android Room integration** (in Phase 4)

---

## What's Next

**Phase 3:** Sync Engine
- Conflict resolution algorithm
- Queue processing logic
- Incremental sync strategy
- Error recovery

**Phase 4:** Android Implementation
- Room Database setup
- DAO layer
- Background sync service

---

**Created:** November 30, 2025  
**Status:** Complete  
**Next Phase:** Sync Engine Implementation
