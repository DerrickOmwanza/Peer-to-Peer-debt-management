# M-PESA SIM Toolkit Integration - Technical Guide

## Overview

Integrating with M-PESA SIM Toolkit (STK) for offline operation requires a different approach than the web system. This guide explains how to do it.

---

## 🔄 Current Architecture vs STK Architecture

### Current Web System
```
User → Web Browser → React Frontend
                   → Node.js Backend
                   → PostgreSQL Database
```

### M-PESA SIM Toolkit System
```
User → USSD Code (*383#) 
     → SIM Toolkit Menu
     → Local Storage (SIM/Phone)
     → Sync to Backend (when online)
```

---

## 🛠️ Integration Approaches

### Option 1: USSD Gateway (Easiest)
**What It Is:** Text-based menu system  
**Access:** *383# or custom code  
**Offline:** Can cache basic data  
**Best For:** Feature phones and low bandwidth

### Option 2: SIM Toolkit (STK) Apps (Complex)
**What It Is:** Apps that run on SIM card  
**Access:** Native SIM menu  
**Offline:** Full local storage  
**Best For:** Smartphones, requires carrier support

### Option 3: Hybrid Approach (Recommended)
**What It Is:** USSD + Web + Android/iOS app  
**Access:** Multiple entry points  
**Offline:** Works partially offline  
**Best For:** Maximum reach

---

## 📋 Implementation Plan

### Phase 1: USSD Gateway (3-6 months)

#### Technology
```
USSD Provider: Safaricom Developer Portal
Language: Java / Python / Node.js
Format: Text menus
```

#### USSD Flow Example
```
*383#
↓
[Main Menu]
1. Request Loan
2. Approve Loan
3. View Loans
4. Transactions
5. Repayments
↓
[Press 1]
↓
[Loan Details Form]
Enter Lender Phone:
Enter Amount:
Confirm PIN:
↓
[Confirmation]
Loan request sent!
```

#### Code Structure
```
USSD Backend (Node.js)
├── ussd-router.js (Parse input, route request)
├── loan-service.js (Loan logic)
├── transaction-service.js (Payments)
├── storage-service.js (Cache data)
└── sync-service.js (Sync when online)
```

#### Sample USSD Code
```javascript
// ussd-router.js
const handleUSSD = async (sessionId, input, phoneNumber) => {
  const session = getSession(sessionId);
  
  if (!input || input === '0') {
    // Main menu
    return displayMainMenu();
  }
  
  switch(session.state) {
    case 'MAIN_MENU':
      if (input === '1') return requestLoanForm();
      if (input === '2') return viewLoansMenu();
      if (input === '3') return viewTransactions();
      break;
      
    case 'REQUEST_LOAN':
      if (!session.lenderPhone) {
        session.lenderPhone = input;
        return "Enter loan amount (Ksh):";
      }
      if (!session.amount) {
        session.amount = parseInt(input);
        return "Enter repayment (Ksh):";
      }
      if (!session.repayment) {
        session.repayment = parseInt(input);
        // Create loan
        createLoan(phoneNumber, session);
        return "Loan request sent!";
      }
      break;
  }
};
```

---

### Phase 2: Android App (6-12 months)

#### Offline Capabilities
```
✓ Store loans locally (SQLite)
✓ Cache user data
✓ Work without internet
✓ Sync when connected
```

#### Technology Stack
```
Language: Java / Kotlin
Database: SQLite (local)
API: REST to backend
Framework: Android Studio
```

#### Key Features
```
- Offline data storage
- Local calculations
- Background sync
- Push notifications
- M-PESA integration via intent
```

#### Sample Code Structure
```
MpesaDebtApp/
├── models/
│   ├── Loan.java
│   ├── Transaction.java
│   └── User.java
├── database/
│   ├── LoanDAO.java
│   ├── Database.java
│   └── SyncManager.java
├── services/
│   ├── OfflineService.java
│   ├── SyncService.java
│   └── RepaymentEngine.java
├── ui/
│   ├── MainActivity.java
│   ├── LoanFragment.java
│   └── TransactionFragment.java
└── utils/
    ├── MpesaIntegration.java
    └── LocalStorage.java
```

---

### Phase 3: iOS App (6-12 months)

#### Similar to Android but with iOS specifics
```
Language: Swift
Database: Core Data
Framework: Xcode
```

---

## 🔐 Offline Data Synchronization

### How It Works

#### When Online
```
1. App detects internet connection
2. Checks local database for unsync'd records
3. Sends to backend
4. Receives updates
5. Updates local cache
6. Clears sync flag
```

#### Data Structure
```json
{
  "loan": {
    "id": "uuid",
    "status": "pending",
    "synced": false,
    "lastSyncTime": 1234567890,
    "localTimestamp": 1234567890
  }
}
```

#### Sync Algorithm
```javascript
async function syncData(phoneNumber) {
  // Get unsync'd records
  const unsyncedLoans = db.loans
    .where({ phoneNumber, synced: false });
  
  // Send to backend
  for (let loan of unsyncedLoans) {
    try {
      const response = await api.createLoan(loan);
      // Mark as synced
      db.loans.update({ id: loan.id }, { synced: true });
    } catch (error) {
      console.log('Sync failed, will retry');
    }
  }
  
  // Get updates from backend
  const updates = await api.getUpdates(lastSyncTime);
  updateLocalDatabase(updates);
}
```

---

## 💾 Offline Storage Strategy

### What to Store Locally

#### Essential (Must Have)
```
✓ User profile
✓ Active loans
✓ Repayment terms
✓ Wallet balance (last synced)
✓ User credentials (encrypted)
```

#### Transactional (Important)
```
✓ Loan requests (pending)
✓ Approvals (pending)
✓ Simulated transactions
✓ Repayment records
```

#### Sync Metadata
```
✓ Last sync timestamp
✓ Unsync'd records flag
✓ Sync queue
✓ Conflict resolution info
```

### Storage Limits by Device

| Device Type | Available Storage | How Much We Use |
|------------|------------------|-----------------|
| Feature Phone | 50KB | 30KB (users, loans) |
| Android/iOS | 100MB+ | 5-10MB (full data) |
| SIM Card | 32KB-256KB | 20KB (essential) |

---

## 🔄 Integration with M-PESA API

### Step 1: Register with Safaricom

```
1. Go to https://developer.safaricom.co.ke
2. Create developer account
3. Register USSD code (e.g., *383#)
4. Get API credentials
5. Configure webhook URL
6. Test in sandbox
```

### Step 2: Implement USSD Handler

```javascript
// Express endpoint for M-PESA USSD
app.post('/ussd/handler', async (req, res) => {
  const {
    sessionId,
    phoneNumber,
    text,  // User input
    serviceCode
  } = req.body;
  
  try {
    const response = await handleUSSD(
      sessionId, 
      text, 
      phoneNumber
    );
    
    res.json({
      responseType: 'notification', // or 'input'
      message: response
    });
  } catch (error) {
    res.json({
      responseType: 'notification',
      message: 'Error processing request'
    });
  }
});
```

### Step 3: Handle M-PESA STK Prompts

```javascript
// When loan is approved, trigger M-PESA payment
async function sendUSSDPush(phoneNumber) {
  const payload = {
    phone: phoneNumber,
    message: 'Loan approved! Your balance is Ksh 5000. Reply YES to confirm'
  };
  
  await safaricomAPI.sendSTKPush(payload);
  
  // Listen for response
  safaricomAPI.onSTKResponse(phoneNumber, (response) => {
    if (response.status === 'COMPLETED') {
      processLoanApproval(phoneNumber);
    }
  });
}
```

---

## 📱 USSD Menu Structure

### Complete USSD Flow

```
*383# (Dial)
│
├─→ [Main Menu]
│   1. Request Loan
│   2. View My Loans
│   3. Approve Loan
│   4. View Balance
│   5. Transaction History
│   0. Exit
│
├─→ 1: Request Loan
│   │
│   ├─→ "Enter lender phone:"
│   │   (User enters: 0701234567)
│   │
│   ├─→ "Enter amount (Ksh):"
│   │   (User enters: 5000)
│   │
│   ├─→ "Enter repayment (Ksh):"
│   │   (User enters: 500)
│   │
│   ├─→ "Confirm? 1=Yes 0=No"
│   │   (User enters: 1)
│   │
│   └─→ "✓ Loan request sent!"
│
├─→ 2: View My Loans
│   │
│   ├─→ "1. Loan from Jane (Ksh 5000)"
│   │    "Balance: Ksh 4500"
│   │    "0. Back"
│   │
│   └─→ [Back to Main Menu]
│
├─→ 3: Approve Loan
│   │
│   ├─→ "Loan from John (Ksh 5000)"
│   │    "1=Approve 0=Decline"
│   │
│   └─→ "✓ Loan approved!"
│
└─→ 4: View Balance
    │
    └─→ "Wallet: Ksh 10,000"
        "Pending: Ksh 2,500"
```

---

## 🔧 Technical Implementation Steps

### Step 1: USSD Backend Setup (Week 1-2)
```javascript
// 1. Set up Safaricom integration
npm install safaricom-ussd

// 2. Create USSD router
app.post('/api/ussd', handleUSSD);

// 3. Implement session management
const sessionStore = new Map();

// 4. Test with Safaricom sandbox
```

### Step 2: Session Management (Week 2-3)
```javascript
class USSDSession {
  constructor(sessionId, phoneNumber) {
    this.sessionId = sessionId;
    this.phoneNumber = phoneNumber;
    this.state = 'MAIN_MENU';
    this.data = {};
    this.createdAt = Date.now();
  }
  
  setTimeout(duration = 3 * 60 * 1000) {
    setTimeout(() => {
      sessionStore.delete(this.sessionId);
    }, duration);
  }
}
```

### Step 3: Offline Android App (Month 2-3)
```kotlin
// Android Offline Implementation
class LoanRepository(private val loanDao: LoanDao) {
  
  fun createLoanOffline(loan: Loan): Long {
    // Save locally
    val id = loanDao.insert(loan.copy(synced = false))
    
    // Queue for sync
    syncQueue.add(SyncTask(OPERATION_CREATE_LOAN, id))
    
    return id
  }
  
  fun syncWithBackend() {
    CoroutineScope(Dispatchers.IO).launch {
      try {
        val unsyncedLoans = loanDao.getUnsynced()
        
        for (loan in unsyncedLoans) {
          val response = api.createLoan(loan)
          loanDao.update(loan.copy(synced = true))
        }
      } catch (e: Exception) {
        // Retry later
        scheduleRetry()
      }
    }
  }
}
```

---

## 📊 Architecture: Web + USSD + App

```
┌──────────────────────────────────────────────────┐
│         M-PESA Debt Allocation System            │
└──────────────────────────────────────────────────┘
              ↙         ↓         ↖
        ┌─────┴─────┬────────────┬─────┴─────┐
        │           │            │           │
    Web App     USSD Gateway   Android      iOS
   (3001)      (*383#)         App          App
   Online      Online/Offline  Offline      Offline
   
        ↓         ↓            ↓           ↓
        └─────────┴────────────┴───────────┘
                  ↓
        ┌─────────────────────┐
        │  Backend API (5000) │
        │  PostgreSQL         │
        │  Sync Engine        │
        └─────────────────────┘
```

---

## 🌐 Synchronization Flow

### Real-World Scenario

```
User (Rural Area, No Internet)
│
├─→ Dials *383#
├─→ Requests loan from Jane (offline)
├─→ Data stored locally on SIM/Phone
│
[User travels to town with Internet]
│
├─→ Opens Android app
├─→ App detects internet
├─→ Automatically syncs data:
│   • Sends loan request
│   • Receives notifications
│   • Pulls Jane's response
│   • Updates local database
│
[User goes back offline]
│
├─→ Can still view loans locally
├─→ Can simulate transactions locally
├─→ Changes will sync when online again
```

---

## 💳 M-PESA Integration Points

### 1. Payment Collection
```javascript
// When loan repayment is deducted
async function collectRepayment(phoneNumber, amount) {
  // Option 1: STK Push (automatic)
  await safaricom.pushSTK({
    phone: phoneNumber,
    amount: amount,
    accountRef: `DEBT-${loanId}`,
    description: 'Loan repayment'
  });
  
  // Option 2: USSD menu
  // Direct user through USSD to confirm payment
  
  // Option 3: SIM Toolkit
  // Automatic deduction with PIN confirmation
}
```

### 2. Balance Notification
```javascript
// After transaction, notify user via USSD
async function notifyTransaction(phoneNumber, transaction) {
  await ussd.sendNotification({
    phone: phoneNumber,
    message: `Ksh ${transaction.amount} received. 
              Ksh ${transaction.repayment} deducted for loan.
              New balance: Ksh ${transaction.newBalance}`
  });
}
```

### 3. Confirmation Codes
```javascript
// For security, send PIN confirmation
async function requestPINConfirmation(phoneNumber, action) {
  const pin = generateOTP();
  
  await ussd.send({
    phone: phoneNumber,
    message: `Confirm ${action}. Reply: ${pin}`
  });
  
  return await listenForResponse(phoneNumber);
}
```

---

## 🔒 Security Considerations

### USSD Security
```
✓ All data encrypted in transit
✓ PIN verification for approvals
✓ Session timeout (3 minutes)
✓ Rate limiting
✓ Phone number validation
```

### Local Storage Security
```
✓ Encrypt sensitive data (Android Keystore)
✓ Secure enclave (iOS Secure Enclave)
✓ Password protect app
✓ Auto-logout after idle
✓ Clear cache on uninstall
```

### Code Example: Secure Storage
```kotlin
// Android: Using EncryptedSharedPreferences
val encryptedPrefs = EncryptedSharedPreferences.create(
    context,
    "secret_prefs",
    MasterKey.Builder(context).build(),
    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
)

encryptedPrefs.edit()
    .putString("pin", encryptPIN("1234"))
    .apply()
```

---

## 📈 Rollout Timeline

### Month 1-2: USSD Gateway
- Safaricom API integration
- USSD menu development
- Testing with real users
- Basic offline caching

### Month 3-4: Android App
- Core offline features
- Local database setup
- Sync engine
- M-PESA integration

### Month 5-6: iOS App
- Similar features to Android
- iOS-specific optimizations

### Month 7+: Enhancements
- Advanced analytics
- Offline loan approval
- Smart scheduling
- AI-based recommendations

---

## 💡 Cost Estimation

| Component | Cost | Timeline |
|-----------|------|----------|
| USSD Gateway | $10-50/month | 2-4 weeks |
| Android Dev | $5,000-10,000 | 2-3 months |
| iOS Dev | $5,000-10,000 | 2-3 months |
| M-PESA Integration | $5,000-15,000 | 4-8 weeks |
| Infrastructure | $100-500/month | Ongoing |
| Maintenance | 20% dev cost/year | Ongoing |

---

## ✅ Checklist for Integration

### Before Development
- [ ] Register with Safaricom Developer Portal
- [ ] Get USSD code allocation
- [ ] Understand M-PESA API
- [ ] Design offline sync strategy
- [ ] Plan security architecture

### USSD Phase
- [ ] Implement USSD gateway
- [ ] Test all USSD flows
- [ ] Set up session management
- [ ] Implement basic caching
- [ ] Get carrier approval

### Mobile App Phase
- [ ] Design offline database schema
- [ ] Build local storage layer
- [ ] Implement sync engine
- [ ] Add M-PESA integration
- [ ] Security testing

### Deployment Phase
- [ ] User acceptance testing
- [ ] Load testing
- [ ] Security audit
- [ ] Train support team
- [ ] Production rollout

---

## 🎯 Key Advantages

### For Users
```
✓ Works offline (USSD)
✓ No data charges (USSD)
✓ Feature phone compatible
✓ Instant feedback
✓ Always accessible
```

### For System
```
✓ Reaches 99% of phone users
✓ Reduced data dependency
✓ Better reliability
✓ Offline sync capability
✓ Native M-PESA integration
```

---

## 📞 Next Steps

1. **Register with Safaricom**
   - Go to https://developer.safaricom.co.ke
   - Create account
   - Request USSD code

2. **Study USSD Documentation**
   - Understand session management
   - Learn response format
   - Study best practices

3. **Hire USSD Developer**
   - Java or Node.js expertise
   - M-PESA integration experience
   - Safaricom API knowledge

4. **Start with MVP**
   - View loans via USSD
   - Request loans via USSD
   - Receive notifications
   - Then add Android app

---

## 📚 Resources

### Official Documentation
- Safaricom Developer: https://developer.safaricom.co.ke
- M-PESA API: https://developer.safaricom.co.ke/mpesa-api
- USSD Best Practices: https://www.gsma.com/ussd

### Development Tools
- Postman (API testing)
- Android Studio (Android)
- Xcode (iOS)
- Node.js (Backend)

---

## Summary

To integrate with M-PESA for offline operation:

1. **USSD** → Text-based menu (*383#)
2. **Mobile Apps** → Full offline capabilities
3. **Sync Engine** → Auto-sync when online
4. **M-PESA Integration** → Payment collection
5. **Safaricom API** → Carrier connection

This approach enables true offline peer-to-peer lending with automatic repayment, exactly as originally envisioned.

**Result:** A system that works everywhere, even in areas with no internet! 📱✨
