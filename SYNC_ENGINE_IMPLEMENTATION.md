# Sync Engine Implementation - Phase 3 Complete

## Overview

Complete synchronization engine with conflict resolution for offline-to-online data sync. Enables seamless offline operation with automatic data consolidation.

**Status:** ✅ Phase 3 Complete  
**Implementation Date:** November 2025

---

## Architecture

```
┌─────────────────────────────────────┐
│   Offline Client (Android/iOS)      │
│   SQLite Database                   │
│   ├─ Loans (local)                  │
│   ├─ Transactions (local)           │
│   └─ Offline Queue                  │
└──────────────┬──────────────────────┘
               │
      [Internet Detected]
               │
               ↓
┌─────────────────────────────────────┐
│   Sync Engine                       │
│  ├─ Queue Processing                │
│  ├─ Conflict Detection               │
│  ├─ Version Management              │
│  └─ Incremental Sync                │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│   Backend API (/api/sync)           │
│   ├─ Queue Operations               │
│   ├─ Change Detection               │
│   └─ Conflict Resolution            │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│   PostgreSQL Database               │
│   (Source of Truth)                 │
│   ├─ Users                          │
│   ├─ Loans                          │
│   ├─ Transactions                   │
│   └─ Repayments                     │
└─────────────────────────────────────┘
```

---

## Core Components

### 1. **Conflict Resolver**

Detects and resolves conflicts when offline data diverges from server.

#### Conflict Detection
```javascript
const conflict = ConflictResolver.detectConflict(localRecord, serverRecord);

// Returns:
{
  hasConflict: true,
  localVersion: 5,
  serverVersion: 3,
  localTimestamp: 1701356500000,
  serverTimestamp: 1701356400000
}
```

#### Conflict Resolution Strategies

**1. LOCAL_WINS** (Default)
```javascript
// Use local version if newer
if (localVersion > serverVersion || 
    localTimestamp > serverTimestamp) {
  use local
} else {
  use server
}
```

**2. SERVER_WINS**
```javascript
// Always use server version
use server
```

**3. MERGE**
```javascript
// Combine both versions at field level
merged = {
  ...server,
  ...local,  // Local overrides if present
  updatedAt: max(local.updatedAt, server.updatedAt)
}
```

**4. MANUAL**
```javascript
// Return both versions for manual review
return {
  local: localVersion,
  server: serverVersion,
  requiresUserInput: true
}
```

### 2. **Sync Queue Manager**

Manages offline operations queue.

```javascript
// Add operation to queue
const queueItem = await SyncQueueManager.queueOperation(
  'loans',                    // entityType
  'CREATE',                   // operation
  loanData,                   // data
  '254701234567'             // phoneNumber
);

// Get pending items
const pending = await SyncQueueManager.getPendingSyncItems('254701234567');

// Mark as synced
await SyncQueueManager.markAsSynced(queueItemId);

// Track retries
await SyncQueueManager.incrementRetryCount(queueItemId, errorMessage);

// Get dead-letter queue
const failed = await SyncQueueManager.getDeadLetterQueue(maxRetries = 5);
```

### 3. **Incremental Sync Manager**

Efficiently syncs only changed data.

```javascript
// Get last sync time
const lastSync = await IncrementalSyncManager.getLastSyncTimestamp(phoneNumber);

// Get changes since
const changes = await IncrementalSyncManager.getChangesSinceLastSync(
  phoneNumber,
  lastSyncTime
);

// Update sync timestamp
await IncrementalSyncManager.updateSyncTimestamp(phoneNumber, Date.now());
```

### 4. **Main Sync Engine**

Orchestrates full synchronization process.

```javascript
// Full sync
const result = await SyncEngine.fullSync('254701234567');

// Process sync queue
const queueResult = await SyncEngine.processSyncQueue('254701234567');

// Process individual item
const itemResult = await SyncEngine.processSyncItem(item);
```

---

## API Endpoints

### 1. **POST /api/sync/full**
Full synchronization operation.

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
  "startTime": 1701356400000,
  "duration": 2345,
  "phases": {
    "queueProcessing": {
      "synced": [
        {
          "id": "queue-item-001",
          "type": "loans",
          "operation": "CREATE"
        }
      ],
      "failed": [],
      "conflicts": [],
      "totalItems": 1
    },
    "incrementalSync": {
      "changeCount": 5,
      "changes": [
        {
          "type": "loans",
          "id": "loan-001",
          "updatedAt": "2025-11-30T10:33:00Z"
        }
      ]
    }
  },
  "message": "Sync completed in 2345ms"
}
```

---

### 2. **POST /api/sync/queue**
Process sync queue.

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
  "failed": 0,
  "conflicts": 1,
  "total": 4,
  "duration": 1200,
  "details": {
    "synced": [...],
    "failed": [...],
    "conflicts": [...]
  }
}
```

---

### 3. **GET /api/sync/pending/:phoneNumber**
Get pending sync items.

**Response:**
```json
{
  "phoneNumber": "254701234567",
  "pendingCount": 2,
  "items": [
    {
      "id": "queue-001",
      "type": "loans",
      "operation": "CREATE",
      "retryCount": 0,
      "createdAt": "2025-11-30T10:30:00Z",
      "lastRetryAt": null
    }
  ]
}
```

---

### 4. **GET /api/sync/changes/:phoneNumber?since=timestamp**
Get changes since last sync.

**Response:**
```json
{
  "phoneNumber": "254701234567",
  "lastSync": "2025-11-30T10:20:00Z",
  "changeCount": 5,
  "changes": [
    {
      "type": "loans",
      "id": "loan-001",
      "updatedAt": "2025-11-30T10:25:00Z"
    }
  ]
}
```

---

### 5. **POST /api/sync/queue-operation**
Add operation to sync queue (from offline client).

**Request:**
```json
{
  "phoneNumber": "254701234567",
  "entityType": "loans",
  "operation": "CREATE",
  "data": {
    "borrowerPhone": "254701234567",
    "lenderPhone": "254702345678",
    "amount": 5000,
    "repaymentAmount": 500
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Operation queued for sync",
  "queueItem": {
    "id": "queue-001",
    "type": "loans",
    "operation": "CREATE",
    "createdAt": "2025-11-30T10:33:00Z"
  }
}
```

---

### 6. **POST /api/sync/dead-letter**
Get dead-letter queue items (exceeded max retries).

**Request:**
```json
{
  "phoneNumber": "254701234567",
  "maxRetries": 5
}
```

**Response:**
```json
{
  "phoneNumber": "254701234567",
  "deadLetterCount": 1,
  "items": [
    {
      "id": "queue-failed-001",
      "type": "loans",
      "operation": "CREATE",
      "retryCount": 5,
      "error": "Lender not found",
      "lastRetryAt": "2025-11-30T10:32:00Z"
    }
  ]
}
```

---

### 7. **GET /api/sync/status/:phoneNumber**
Get overall sync status.

**Response:**
```json
{
  "phoneNumber": "254701234567",
  "syncStatus": {
    "lastSyncAt": "2025-11-30T10:25:00Z",
    "pendingOperations": 2,
    "oldestPendingAt": "2025-11-30T10:30:00Z"
  }
}
```

---

## Sync Flow Diagram

```
[Offline Client Detects Internet]
           ↓
[Call /api/sync/full]
           ↓
┌─────────────────────────────────────┐
│  Phase 1: Process Offline Queue     │
├─────────────────────────────────────┤
│ For each pending operation:         │
│  1. Validate data                   │
│  2. Check for conflicts             │
│  3. Apply resolution strategy       │
│  4. Insert/update in backend        │
│  5. Mark as synced                  │
│  6. Log result                      │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  Phase 2: Incremental Sync          │
├─────────────────────────────────────┤
│ 1. Get last sync timestamp          │
│ 2. Query for changes since that time│
│ 3. Fetch from server                │
│ 4. Update local database            │
│ 5. Mark as synced                   │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  Phase 3: Update Metadata           │
├─────────────────────────────────────┤
│ 1. Update sync timestamp            │
│ 2. Clear synced queue items        │
│ 3. Update version info              │
└─────────────────────────────────────┘
           ↓
[Return Results with Success/Failures]
```

---

## Sync Algorithm Details

### Queue Processing Algorithm

```
FOR each pending_item IN sync_queue:
  
  TRY:
    data = JSON.parse(pending_item.data)
    
    IF pending_item.entity_type == 'loans':
      - Get lender by phone
      - Validate lender exists
      - Create loan in backend
      
    ELSE IF pending_item.entity_type == 'transaction':
      - Get user by phone
      - Validate user exists
      - Create transaction
      
    ELSE IF pending_item.entity_type == 'repayment':
      - Validate loan exists
      - Create repayment record
      
    Mark item as synced
    Add to results.synced
    
  CATCH error:
    Increment retry_count
    
    IF retry_count >= MAX_RETRIES:
      Add to dead_letter_queue
      Add to results.failed
    ELSE:
      Add to results.failed (will retry)
```

### Conflict Resolution Algorithm

```
IF local_record AND server_record:
  
  IF local_version == server_version:
    // No conflict
    Mark as synced
  ELSE:
    // Conflict exists
    IF local_timestamp > server_timestamp:
      // Local is newer
      Use local_record
      Update server with local
    ELSE:
      // Server is newer
      Use server_record
      Update local with server
  
ELSE IF local_record:
  // Only exists locally
  Create on server
  
ELSE IF server_record:
  // Only exists on server
  Create locally
```

---

## Retry Logic

```
Retry Attempts: 5 (configurable)
Wait Between Retries: Exponential backoff

Attempt 1: Immediate
Attempt 2: Wait 1 second
Attempt 3: Wait 2 seconds
Attempt 4: Wait 4 seconds
Attempt 5: Wait 8 seconds

After 5 failures: Move to dead-letter queue
Dead-letter items tracked separately for manual review
```

---

## Data Sync Example

### Scenario: User Creates Loan Offline

**Step 1: Offline**
```
App detects no internet
User creates loan:
  - Lender phone: 254702345678
  - Amount: 5000
  - Repayment: 500

Loan stored locally in SQLite
Added to offline_queue table
User sees: "Saved offline. Will sync when online"
```

**Step 2: Internet Detected**
```
App detects internet
Calls: POST /api/sync/full
  {
    "phoneNumber": "254701234567"
  }
```

**Step 3: Backend Processes Queue**
```
GET offline queue for 254701234567
Found: Loan creation operation

For each operation:
  1. Parse data
  2. Get lender by phone (254702345678)
  3. Validate lender exists
  4. Create loan in PostgreSQL
  5. Create notification for lender
  6. Mark queue item as synced
```

**Step 4: Incremental Sync**
```
Get changes since last sync (8 minutes ago)

Found changes:
  - Jane approved a loan
  - John made a repayment
  - Transaction occurred

Fetch full details from server
Update local SQLite with changes
```

**Step 5: Response**
```
{
  "success": true,
  "synced": 1,        // Our loan created
  "changes": 3,       // 3 updates from server
  "message": "Sync completed in 1234ms"
}

User sees: "All up to date!"
```

---

## Conflict Resolution Example

### Scenario: Concurrent Edits

**Initial State**
```
Server Version 5:
  loan.balance = 4000
  loan.status = "approved"
  updated_at = 1701356400000

Local Version 3:
  loan.balance = 3500
  loan.status = "active"
  updated_at = 1701356350000
```

**Conflict Detection**
```
Local version (3) < Server version (5)
Local timestamp (1701356350000) < Server timestamp (1701356400000)

→ Server is newer
→ Resolution: SERVER_WINS
```

**Resolution Applied**
```
Update local record to:
  loan.balance = 4000
  loan.status = "approved"
  updated_at = 1701356400000
  synced = true
  
Notify user: "Loan updated from server changes"
```

---

## Testing Sync Operations

### Test 1: Basic Queue Sync

```bash
# 1. Queue operation
curl -X POST http://localhost:5000/api/sync/queue-operation \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "254701234567",
    "entityType": "loans",
    "operation": "CREATE",
    "data": {
      "borrowerPhone": "254701234567",
      "lenderPhone": "254702345678",
      "amount": 5000,
      "repaymentAmount": 500
    }
  }'

# 2. Check pending items
curl http://localhost:5000/api/sync/pending/254701234567

# 3. Process sync queue
curl -X POST http://localhost:5000/api/sync/queue \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "254701234567"}'
```

### Test 2: Full Sync

```bash
curl -X POST http://localhost:5000/api/sync/full \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "254701234567"
  }'
```

### Test 3: Incremental Sync

```bash
# Get changes since last sync
curl http://localhost:5000/api/sync/changes/254701234567
```

### Test 4: Conflict Handling

```bash
# Queue conflicting operations
curl -X POST http://localhost:5000/api/sync/queue-operation \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "254701234567",
    "entityType": "loans",
    "operation": "UPDATE",
    "data": {
      "loanId": "loan-001",
      "balance": 3500
    }
  }'

# Sync (should detect conflict with server)
curl -X POST http://localhost:5000/api/sync/full \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "254701234567"}'
```

---

## Performance Optimization

### Indexing Strategy
```sql
-- Fast lookups by phone
CREATE INDEX idx_loans_borrower_phone ON loans(borrower_phone);
CREATE INDEX idx_loans_lender_phone ON loans(lender_phone);

-- Fast sync filtering
CREATE INDEX idx_loans_updated_at ON loans(updated_at);
CREATE INDEX idx_transactions_updated_at ON transactions(updated_at);

-- Queue filtering
CREATE INDEX idx_sync_queue_synced ON sync_queue(synced);
CREATE INDEX idx_sync_queue_created_at ON sync_queue(created_at);
```

### Batch Operations
```
Instead of:
  INSERT INTO loans VALUES (...)
  INSERT INTO loans VALUES (...)
  INSERT INTO loans VALUES (...)

Use:
  INSERT INTO loans VALUES (...), (...), (...)
```

### Incremental Sync Window
```
Only fetch changes from last 24 hours
Older data assumed to be stable and synced
If user offline > 24h, do full sync instead
```

---

## Monitoring & Debugging

### Check Sync Status
```bash
curl http://localhost:5000/api/sync/status/254701234567

# Returns:
{
  "lastSyncAt": "2025-11-30T10:25:00Z",
  "pendingOperations": 2,
  "oldestPendingAt": "2025-11-30T10:30:00Z"
}
```

### View Dead-Letter Queue
```bash
curl -X POST http://localhost:5000/api/sync/dead-letter \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "254701234567",
    "maxRetries": 5
  }'
```

### View Pending Items
```bash
curl http://localhost:5000/api/sync/pending/254701234567
```

---

## Files Provided

1. **SYNC_ENGINE_IMPLEMENTATION.md** (this file)
2. **src/services/sync-engine.js** - Sync logic
3. **src/routes/sync.js** - API endpoints
4. **integration in server.js** - Routes registered

---

## Configuration

No additional configuration needed. Uses existing PostgreSQL connection.

**Recommended for Production** (add to .env):
```
MAX_SYNC_RETRIES=5
SYNC_RETRY_DELAY=1000
SYNC_TIMEOUT=30000
INCREMENTAL_SYNC_WINDOW=86400000  # 24 hours in ms
```

---

## What's Next

**Phase 4:** Android Implementation
- Room Database DAOs
- Background sync service
- Conflict UI handling
- Offline queue visualization

**Phase 5:** Safaricom Integration
- STK push handling
- USSD M-PESA integration
- Payment verification

**Phase 6:** Testing Framework
- Offline/online scenario tests
- Conflict resolution tests
- Performance benchmarks

---

## Status Summary

**Phase 3 Complete:** ✅

- ✅ Conflict resolver
- ✅ Sync queue manager
- ✅ Incremental sync
- ✅ Main sync engine
- ✅ API routes
- ✅ Retry logic
- ✅ Dead-letter queue
- ✅ Documentation

System ready for Android/iOS integration.

---

**Created:** November 30, 2025  
**Status:** Complete  
**Next Phase:** Android Implementation (Phase 4)
