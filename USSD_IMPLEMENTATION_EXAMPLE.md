# USSD Implementation - Quick Start

## What is USSD?

**USSD** = Unstructured Supplementary Service Data

It's the technology behind codes like:
- `*100#` - Check balance
- `*121#` - Get airtime
- `*383#` - M-PESA

**Key Features:**
- Works on ANY phone (no internet needed)
- No data charges
- Instant response
- Works offline (cached data)

---

## How USSD Works

```
User dials: *383#
    ↓
Sent to Safaricom gateway
    ↓
Your backend receives request
    ↓
Your code responds with menu
    ↓
User sees menu on phone
    ↓
User presses key (1, 2, 3, etc.)
    ↓
Sent back to your backend
    ↓
Your code responds with next screen
    ↓
Repeat until done
```

---

## Simple USSD Backend Implementation

### 1. Express Server Setup

```javascript
// ussd-server.js
const express = require('express');
const app = express();

app.use(express.urlencoded());

// Store sessions in memory (use Redis in production)
const sessions = new Map();

// Main USSD handler
app.post('/ussd', async (req, res) => {
  try {
    // Extract data from M-PESA gateway
    const { sessionId, phoneNumber, text, serviceCode } = req.body;
    
    // Get or create session
    let session = sessions.get(sessionId);
    if (!session) {
      session = {
        id: sessionId,
        phone: phoneNumber,
        state: 'MAIN_MENU',
        data: {},
        createdAt: Date.now()
      };
      sessions.set(sessionId, session);
    }
    
    // Clean up old sessions (after 5 minutes)
    if (Date.now() - session.createdAt > 5 * 60 * 1000) {
      sessions.delete(sessionId);
      session.state = 'MAIN_MENU';
    }
    
    // Route based on state
    let response;
    switch(session.state) {
      case 'MAIN_MENU':
        response = handleMainMenu(text, session);
        break;
      case 'REQUEST_LOAN_PHONE':
        response = handleRequestLoanPhone(text, session);
        break;
      case 'REQUEST_LOAN_AMOUNT':
        response = handleRequestLoanAmount(text, session);
        break;
      case 'REQUEST_LOAN_REPAYMENT':
        response = handleRequestLoanRepayment(text, session);
        break;
      case 'REQUEST_LOAN_CONFIRM':
        response = handleRequestLoanConfirm(text, session);
        break;
      default:
        response = "Menu\n1. Request Loan\n2. View Loans\n0. Exit";
    }
    
    // Update session
    sessions.set(sessionId, session);
    
    // Send response
    res.send(response);
    
  } catch (error) {
    console.error('USSD Error:', error);
    res.send('Error processing request. Please try again.');
  }
});

app.listen(8000, () => {
  console.log('USSD Server running on port 8000');
});
```

### 2. Main Menu Handler

```javascript
function handleMainMenu(input, session) {
  // First time - show menu
  if (!input || input === '') {
    return `Welcome to M-PESA Debt!\n\n1. Request Loan\n2. View Loans\n3. View Balance\n4. History\n0. Exit`;
  }
  
  // User selected option
  switch(input) {
    case '1':
      session.state = 'REQUEST_LOAN_PHONE';
      return 'Enter lender phone number:\n(e.g., 254701234567)';
      
    case '2':
      const loans = getLoansFromDB(session.phone);
      if (loans.length === 0) {
        return 'You have no loans';
      }
      let menu = 'Your Loans:\n';
      loans.forEach((loan, i) => {
        menu += `${i+1}. ${loan.lender} - Ksh ${loan.balance}\n`;
      });
      menu += '0. Back';
      return menu;
      
    case '3':
      const balance = getBalance(session.phone);
      return `Your balance: Ksh ${balance}\n\nPress any key to continue`;
      
    case '4':
      const history = getTransactionHistory(session.phone);
      let historyText = 'Recent Transactions:\n';
      history.slice(0, 3).forEach(tx => {
        historyText += `Ksh ${tx.amount} - ${tx.date}\n`;
      });
      historyText += '\nPress any key to continue';
      return historyText;
      
    case '0':
      sessions.delete(session.id);
      return 'Thank you!';
      
    default:
      return 'Invalid option. Try again:\n\n1. Request Loan\n2. View Loans\n3. View Balance\n0. Exit';
  }
}
```

### 3. Loan Request Handlers

```javascript
function handleRequestLoanPhone(input, session) {
  // Validate phone
  if (!input.match(/^254\d{9}$/)) {
    return 'Invalid phone. Enter without +:\n(e.g., 254701234567)';
  }
  
  session.data.lenderPhone = input;
  session.state = 'REQUEST_LOAN_AMOUNT';
  return 'Enter loan amount (Ksh):\n(e.g., 5000)';
}

function handleRequestLoanAmount(input, session) {
  const amount = parseInt(input);
  
  if (isNaN(amount) || amount < 100 || amount > 100000) {
    return 'Invalid amount. Enter between 100-100000:\n(e.g., 5000)';
  }
  
  session.data.principal = amount;
  session.state = 'REQUEST_LOAN_REPAYMENT';
  return 'Enter repayment amount (Ksh):\n(e.g., 500)';
}

function handleRequestLoanRepayment(input, session) {
  const repayment = parseInt(input);
  
  if (isNaN(repayment) || repayment < 10) {
    return 'Invalid repayment. Try again:\n(e.g., 500)';
  }
  
  session.data.repayment = repayment;
  session.state = 'REQUEST_LOAN_CONFIRM';
  
  return `Confirm loan request:
From: ${session.phone}
To: ${session.data.lenderPhone}
Amount: Ksh ${session.data.principal}
Repayment: Ksh ${session.data.repayment}

1. Confirm
0. Cancel`;
}

function handleRequestLoanConfirm(input, session) {
  if (input === '1') {
    // Save to database
    const loanId = saveLoan({
      borrower: session.phone,
      lender: session.data.lenderPhone,
      principal: session.data.principal,
      repayment: session.data.repayment,
      status: 'pending'
    });
    
    // Send notification to lender
    sendNotification(
      session.data.lenderPhone,
      `New loan request from ${session.phone}. Ksh ${session.data.principal}. Reply YES to approve.`
    );
    
    sessions.delete(session.id);
    return 'Loan request sent! Waiting for approval.';
    
  } else if (input === '0') {
    sessions.delete(session.id);
    return 'Loan request cancelled';
  } else {
    return 'Invalid option. Try again:\n1. Confirm\n0. Cancel';
  }
}
```

### 4. Helper Functions

```javascript
// Database functions
function saveLoan(loanData) {
  const loanId = generateID();
  // Save to database
  // db.loans.insert({ id: loanId, ...loanData });
  return loanId;
}

function getLoansFromDB(phoneNumber) {
  // Get from database
  // return db.loans.find({ borrower: phoneNumber });
  return [
    { id: '1', lender: 'Jane', balance: 4500 },
    { id: '2', lender: 'John', balance: 2000 }
  ];
}

function getBalance(phoneNumber) {
  // Get from database
  // return db.users.findOne({ phone: phoneNumber }).balance;
  return 10000;
}

function getTransactionHistory(phoneNumber) {
  // Get from database
  // return db.transactions.find({ user: phoneNumber });
  return [
    { amount: 1000, date: 'Nov 30' },
    { amount: 500, date: 'Nov 28' }
  ];
}

function sendNotification(phone, message) {
  // Send SMS via Safaricom
  console.log(`SMS to ${phone}: ${message}`);
}

function generateID() {
  return Math.random().toString(36).substr(2, 9);
}
```

---

## Integration with Your Backend

### Connect USSD to Existing API

```javascript
// ussd-integration.js

const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';
const token = 'USSD_SERVICE_TOKEN'; // Get from login

async function saveLoanViaAPI(loanData) {
  try {
    const response = await axios.post(
      `${API_BASE}/loans/request`,
      {
        lender_phone: loanData.lender,
        principal_amount: loanData.principal,
        repayment_method: 'fixed',
        repayment_amount: loanData.repayment,
        repayment_start_date: new Date().toISOString()
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data.loan.id;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

async function getLoanViaAPI(phoneNumber) {
  try {
    const response = await axios.get(
      `${API_BASE}/loans/borrower`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    return [];
  }
}
```

---

## Local Caching (For Offline)

### SQLite for Offline Data

```javascript
// offline-cache.js
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database(':memory:'); // or './cache.db'

// Create tables
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS loans (
      id TEXT PRIMARY KEY,
      borrower TEXT,
      lender TEXT,
      principal INTEGER,
      repayment INTEGER,
      status TEXT,
      synced INTEGER DEFAULT 0
    )
  `);
});

// Cache functions
function cacheLoans(loans) {
  loans.forEach(loan => {
    db.run(`
      INSERT OR REPLACE INTO loans 
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `, [loan.id, loan.borrower, loan.lender, loan.principal, loan.repayment, loan.status]);
  });
}

function getCachedLoans() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM loans', (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

// Sync unsync'd records when online
async function syncUnsyncedLoans() {
  const unsynced = await getCachedLoans();
  
  for (let loan of unsynced) {
    if (!loan.synced) {
      try {
        await saveLoanViaAPI(loan);
        db.run('UPDATE loans SET synced = 1 WHERE id = ?', [loan.id]);
      } catch (error) {
        console.log('Sync failed, will retry later');
      }
    }
  }
}
```

---

## Deployment Checklist

### Before Going Live

- [ ] Register USSD code with Safaricom
- [ ] Get USSD gateway credentials
- [ ] Test all flows
- [ ] Set up logging
- [ ] Implement rate limiting
- [ ] Add error handling
- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Security testing
- [ ] Load testing

### Running the USSD Server

```bash
# Install dependencies
npm install express axios sqlite3

# Start server
node ussd-server.js

# Test locally
curl -X POST http://localhost:8000/ussd \
  -d "sessionId=123&phoneNumber=254701234567&text=1&serviceCode=\*383#"
```

---

## Complete USSD Flow Example

```
User: Dials *383#
↓
System: Shows main menu
GET /ussd (sessionId=abc, text="")
→ "1. Request Loan\n2. View Loans\n0. Exit"
↓
User: Presses 1
↓
System: Asks for lender phone
GET /ussd (sessionId=abc, text="1")
→ "Enter lender phone:"
↓
User: Types 254702345678
↓
System: Asks for amount
GET /ussd (sessionId=abc, text="254702345678")
→ "Enter amount (Ksh):"
↓
User: Types 5000
↓
System: Asks for repayment
GET /ussd (sessionId=abc, text="5000")
→ "Enter repayment (Ksh):"
↓
User: Types 500
↓
System: Shows confirmation
GET /ussd (sessionId=abc, text="500")
→ "Confirm? 1=Yes 0=No"
↓
User: Presses 1
↓
System: Saves loan, notifies lender
GET /ussd (sessionId=abc, text="1")
POST /api/loans/request (backend)
POST /api/notifications (to lender)
→ "Loan request sent!"
↓
System: Ends session
```

---

## Cost

- Safaricom USSD: $5-20/month
- Hosting: $10-50/month
- Total: ~$50-100/month

---

## Next Steps

1. Register USSD code with Safaricom
2. Copy code above
3. Update with your backend URLs
4. Test locally first
5. Deploy to production
6. Monitor and improve

This USSD solution will enable millions to access the system without internet! 📱
