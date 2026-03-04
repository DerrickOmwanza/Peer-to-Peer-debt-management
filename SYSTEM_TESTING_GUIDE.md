# 🧪 Complete System Testing Guide

Test your entire P2P Debt Management system step-by-step: Backend → Frontend → Android

---

## ⏱️ Total Time Required: 2-3 hours

- Backend Testing: 30 minutes
- Frontend Testing: 30 minutes
- Android Testing: 30 minutes
- Integration Testing: 30 minutes
- Debugging (if needed): 30 minutes

---

## 📋 Pre-Testing Checklist

Before you start, confirm:

- [ ] PostgreSQL installed and running
- [ ] Node.js 14+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] Android Studio installed with emulator
- [ ] Postman installed (optional, for API testing)
- [ ] Git all changes committed
- [ ] `.env` file configured with PostgreSQL credentials

---

## 🔑 STEP 1: BACKEND TESTING (30 minutes)

### 1.1 Start PostgreSQL

**On Windows:**

```powershell
# Open PostgreSQL command line
psql -U postgres

# You'll see: postgres=#
```

Verify PostgreSQL is running. Should show version info.

**Expected Output:**
```
psql (15.2 (Debian 15.2-1.pgdg120+1))
Type "help" for help.

postgres=#
```

### 1.2 Create Database

In PostgreSQL command line:

```sql
CREATE DATABASE mpesa_debt;
\l
```

**Expected Output:**
```
                                   List of databases
   Name    |  Owner   | Encoding | Collate | Ctype |   Access privileges
-----------+----------+----------+---------+-------+-----------------------
 mpesa_debt | postgres | UTF8     | C       | C     |
```

Exit PostgreSQL:
```sql
\q
```

### 1.3 Install Backend Dependencies

```powershell
cd "C:\PeerToPeerDebtManagement"
npm install
```

**Expected Output:**
```
added 150 packages in 45s
```

Wait for completion. No error messages should appear.

### 1.4 Initialize Database Schema

```powershell
npm run db:init
```

**Expected Output:**
```
✓ Database schema initialized successfully
✓ Tables created: users, loans, transactions, repayments, disputes, notifications
```

If you see errors:
- [ ] Check PostgreSQL is running
- [ ] Check DB credentials in `.env` file
- [ ] Run `psql -U postgres -c "SELECT version();"` to verify PostgreSQL

### 1.5 Seed Sample Data (Optional)

```powershell
npm run db:seed
```

**Expected Output:**
```
✓ Sample data seeded successfully
✓ Test users created: john@example.com, jane@example.com
✓ Sample loans created
```

### 1.6 Start Backend Server

```powershell
npm run dev
```

**Expected Output:**
```
✓ Server running on http://localhost:5000
✓ Database connected
✓ API ready for requests
```

**Keep this terminal open!** You'll need the server running for next steps.

---

### 1.7 Test Backend API Endpoints

Open a **new PowerShell terminal** (keep backend running in first terminal).

#### Test 1: Health Check

```powershell
curl -X GET http://localhost:5000/api/health
```

**Expected Output:**
```json
{"status":"ok","timestamp":"2026-03-04T..."}
```

#### Test 2: Register User (Borrower)

```powershell
$body = @{
    full_name = "John Borrower"
    email = "john@example.com"
    phone_number = "+254701234567"
    password = "password123"
} | ConvertTo-Json

curl -X POST `
  -H "Content-Type: application/json" `
  -d $body `
  http://localhost:5000/api/auth/register
```

**Expected Output:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "1",
    "full_name": "John Borrower",
    "email": "john@example.com"
  }
}
```

**⚠️ IMPORTANT: Copy the `token` value — you'll need it for next requests**

#### Test 3: Register User (Lender)

```powershell
$body = @{
    full_name = "Jane Lender"
    email = "jane@example.com"
    phone_number = "+254702345678"
    password = "password123"
} | ConvertTo-Json

curl -X POST `
  -H "Content-Type: application/json" `
  -d $body `
  http://localhost:5000/api/auth/register
```

**Expected Output:** Same as Test 2, but with Jane's info

**⚠️ Save Jane's token too!**

#### Test 4: Login User

```powershell
$body = @{
    email = "john@example.com"
    password = "password123"
} | ConvertTo-Json

curl -X POST `
  -H "Content-Type: application/json" `
  -d $body `
  http://localhost:5000/api/auth/login
```

**Expected Output:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "1",
    "full_name": "John Borrower"
  }
}
```

#### Test 5: Create Loan Request (Borrower)

```powershell
# Replace TOKEN_HERE with actual token from Test 2
$token = "YOUR_JOHN_TOKEN_HERE"

$body = @{
    lender_phone = "+254702345678"
    principal_amount = 5000
    repayment_method = "fixed"
    repayment_amount = 500
    repayment_start_date = "2026-03-15"
} | ConvertTo-Json

curl -X POST `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $token" `
  -d $body `
  http://localhost:5000/api/loans/request
```

**Expected Output:**
```json
{
  "success": true,
  "message": "Loan request created successfully",
  "loan": {
    "id": "loan_123",
    "borrower_id": "1",
    "principal_amount": 5000,
    "status": "pending",
    "created_at": "2026-03-04T..."
  }
}
```

**⚠️ Save the `loan.id` — you'll need it for next tests**

#### Test 6: Get User's Loans

```powershell
$token = "YOUR_JOHN_TOKEN_HERE"

curl -X GET `
  -H "Authorization: Bearer $token" `
  http://localhost:5000/api/loans/borrower
```

**Expected Output:**
```json
{
  "success": true,
  "loans": [
    {
      "id": "loan_123",
      "principal_amount": 5000,
      "status": "pending"
    }
  ]
}
```

#### Test 7: Approve Loan (Lender)

```powershell
$janeToken = "YOUR_JANE_TOKEN_HERE"
$loanId = "loan_123"

$body = @{
    approved = $true
} | ConvertTo-Json

curl -X PATCH `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $janeToken" `
  -d $body `
  http://localhost:5000/api/loans/$loanId/approval
```

**Expected Output:**
```json
{
  "success": true,
  "message": "Loan approved successfully",
  "loan": {
    "id": "loan_123",
    "status": "approved"
  }
}
```

#### Test 8: Simulate Incoming Transaction (Auto-Repayment)

```powershell
$token = "YOUR_JOHN_TOKEN_HERE"

$body = @{
    amount = 1000
    source_phone = "+254705555555"
    description = "Payment from client"
} | ConvertTo-Json

curl -X POST `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $token" `
  -d $body `
  http://localhost:5000/api/transactions/incoming
```

**Expected Output:**
```json
{
  "success": true,
  "message": "Transaction processed successfully",
  "repayment_triggered": true,
  "repayment": {
    "loan_id": "loan_123",
    "amount": 500,
    "remaining_balance": 4500
  }
}
```

**This is the KEY feature!** Repayment auto-deducted from incoming transaction.

#### Test 9: Get Repayment History

```powershell
$token = "YOUR_JOHN_TOKEN_HERE"
$loanId = "loan_123"

curl -X GET `
  -H "Authorization: Bearer $token" `
  http://localhost:5000/api/repayments/loan/$loanId
```

**Expected Output:**
```json
{
  "success": true,
  "repayments": [
    {
      "id": "rep_123",
      "loan_id": "loan_123",
      "amount": 500,
      "created_at": "2026-03-04T..."
    }
  ]
}
```

#### Test 10: File a Dispute

```powershell
$token = "YOUR_JOHN_TOKEN_HERE"

$body = @{
    loan_id = "loan_123"
    reason = "Loan terms not as agreed"
    evidence = "Messages from lender show different amount"
} | ConvertTo-Json

curl -X POST `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $token" `
  -d $body `
  http://localhost:5000/api/disputes/create
```

**Expected Output:**
```json
{
  "success": true,
  "message": "Dispute filed successfully",
  "dispute": {
    "id": "dispute_123",
    "loan_id": "loan_123",
    "status": "open",
    "nova_analysis": {
      "summary": "Borrower dispute appears valid",
      "confidence": 0.85,
      "recommendation": "Review loan terms with lender"
    }
  }
}
```

---

### ✅ Backend Testing Checklist

- [ ] PostgreSQL running
- [ ] Database `mpesa_debt` created
- [ ] `npm install` completed
- [ ] `npm run db:init` succeeded
- [ ] `npm run dev` server running
- [ ] Health check passed (Test 1)
- [ ] Register user succeeded (Test 2 & 3)
- [ ] Login works (Test 4)
- [ ] Loan request created (Test 5)
- [ ] Loan retrieval works (Test 6)
- [ ] Loan approval works (Test 7)
- [ ] Auto-repayment triggered (Test 8) ⭐ KEY FEATURE
- [ ] Repayment history visible (Test 9)
- [ ] Dispute filing works (Test 10)

**If all tests pass ✅, Backend is working!**

---

## 🎨 STEP 2: FRONTEND TESTING (30 minutes)

### 2.1 Install Frontend Dependencies

Open **new terminal** (keep backend running):

```powershell
cd "C:\PeerToPeerDebtManagement\web"
npm install
```

**Expected Output:**
```
added 180 packages in 60s
```

### 2.2 Start React Development Server

```powershell
npm start
```

**Expected Output:**
```
✓ webpack compiled successfully
✓ Compiled successfully!
✓ On Your Network: http://192.168.x.x:3000
✓ Local: http://localhost:3000
```

Browser should auto-open to `http://localhost:3000`

**⚠️ If browser doesn't open, manually go to http://localhost:3000**

### 2.3 Frontend Test Flows

#### Flow 1: Registration & Login

**Step 1:** Click "Sign Up" button

**Step 2:** Fill registration form
- Full Name: `John Borrower`
- Email: `john@example.com`
- Phone: `+254701234567`
- Password: `password123`

**Expected Output:**
- Page redirects to Login
- See "Registration successful" message

**Step 3:** Login with same credentials
- Email: `john@example.com`
- Password: `password123`

**Expected Output:**
- Redirects to Dashboard
- See username "John Borrower" in navbar
- Logo visible in navbar ✓

**If you see errors:**
- Check browser console (F12 → Console tab)
- Check backend logs in first terminal
- Verify `.env` API URL is correct

#### Flow 2: Create Loan Request

**Step 1:** Click "Request Loan" button

**Step 2:** Fill loan form
- Lender Phone: `+254702345678`
- Amount: `5000`
- Repayment Method: `Fixed`
- Repayment Amount: `500`
- Start Date: `2026-03-15`

**Step 3:** Click "Submit"

**Expected Output:**
- Success message appears
- Loan appears in "My Loans" dashboard
- Status shows "Pending"

**If form won't submit:**
- Check browser console for validation errors
- Verify all fields are filled
- Check backend logs for API errors

#### Flow 3: View Risk Score

**Step 1:** Click "Risk Score" tab

**Expected Output:**
- Risk score displays (should be low for first user)
- Shows risk band (Low/Medium/High)
- Shows reasoning

**If risk score doesn't load:**
- Check backend logs for Nova API errors
- Verify user ID is correct
- Check API response in browser Network tab (F12 → Network)

#### Flow 4: File Dispute

**Step 1:** Click "Disputes" tab

**Step 2:** Click "File New Dispute" button

**Step 3:** Fill dispute form
- Loan: Select from dropdown
- Reason: `Loan amount different than agreed`
- Evidence: `Screenshots of messages`

**Step 4:** Click "Submit Dispute"

**Expected Output:**
- Dispute filed successfully
- See Nova Act analysis below
- Shows flags and recommendations

**If Nova analysis doesn't appear:**
- Check backend logs for Nova API calls
- Verify dispute was created in database
- Check network request in browser

#### Flow 5: Admin Dashboard

**Step 1:** Logout current user

**Step 2:** Create admin account:
```
Email: admin@example.com
Password: admin123
```

**Step 3:** Login as admin

**Step 4:** Click "Admin Dashboard" (if available)

**Expected Output:**
- See all disputes in queue
- Click dispute to see details
- See Nova analysis summary

---

### ✅ Frontend Testing Checklist

- [ ] Backend server running
- [ ] Frontend started (`npm start`)
- [ ] Logo visible in navbar ✓
- [ ] Registration works
- [ ] Login works
- [ ] Dashboard loads
- [ ] Loan request form works
- [ ] Loan appears in "My Loans"
- [ ] Risk Score displays
- [ ] Dispute filing works
- [ ] Nova analysis shows
- [ ] Admin dashboard accessible

**If all tests pass ✅, Frontend is working!**

---

## 📱 STEP 3: ANDROID TESTING (30 minutes)

### 3.1 Configure Backend URL

Open `android/app/src/main/java/com/example/peertopeer/data/network/ApiClient.kt`

Find this line:
```kotlin
private const val BASE_URL = "http://10.0.2.2:5000/"
```

**For Emulator**: Use `http://10.0.2.2:5000/` (special alias for localhost)

**For Physical Device**: Use your computer's IP:
```kotlin
private const val BASE_URL = "http://192.168.x.x:5000/"  // Replace x.x with your IP
```

To find your IP:
```powershell
ipconfig
```

Look for "IPv4 Address" under your network adapter (e.g., 192.168.1.100)

### 3.2 Open Android Studio

1. Open Android Studio
2. File → Open
3. Select: `C:\PeerToPeerDebtManagement\android\`
4. Wait for Gradle sync (2-3 minutes)

### 3.3 Create/Start Emulator

1. Tools → Device Manager
2. Click "Create Device" (if none exists)
3. Select "Pixel 5" device
4. Select "API 30" or higher
5. Click "Create"
6. Click play button to start

Wait for emulator to fully load (you'll see home screen)

### 3.4 Run Android App

1. Run → Run 'app' (or press Shift+F10)
2. Select running emulator
3. Click "OK"

**Expected Output:**
- App builds
- Splash screen appears (2 seconds) with **logo visible** ✓
- Dashboard with 4 buttons loads

**If build fails:**
- Click Build → Clean Project
- Try again
- Check Gradle errors in "Build" panel

### 3.5 Android Test Flows

#### Flow 1: Splash Screen

**Expected:**
- Your logo appears centered
- Green background
- "Peer-to-Peer Debt Management" text
- 2-second delay
- Auto-transitions to Dashboard

**If logo doesn't appear:**
- Logo file missing in `drawable/` folder
- Check `activity_splash.xml` for correct drawable name

#### Flow 2: Dashboard Navigation

**Expected:**
- See 4 buttons:
  - Create Loan
  - View Risk Score
  - File Dispute
  - Admin Dashboard

**Step 1:** Click "View Risk Score"

**Expected Output:**
- RiskScoreActivity loads
- Progress bar shows
- Text shows "Loading..."
- After 2-3 seconds: Risk score appears

**If risk score doesn't load:**
- Check Logcat (View → Tool Windows → Logcat)
- Look for error messages starting with "Exception" or "Error"
- Verify backend URL is correct
- Check that backend server is running

#### Flow 3: File Dispute

**Step 1:** Click "File Dispute"

**Expected Output:**
- DisputeActivity loads
- Two text input fields appear
- "Submit Dispute" button visible

**Step 2:** Fill form
- Reason: `Test dispute`
- Evidence: `Test evidence`

**Step 3:** Click "Submit Dispute"

**Expected Output:**
- Loading indicator appears
- After 2-3 seconds: Nova analysis appears
- Shows dispute ID, summary, confidence, recommendation

**If submission fails:**
- Check Logcat for API errors
- Verify loan ID in intent is correct
- Check network connectivity in emulator

#### Flow 4: Admin Dashboard

**Step 1:** Click "Admin Dashboard"

**Expected Output:**
- AdminActivity loads
- Lists all disputes
- Click dispute to see details

---

### ✅ Android Testing Checklist

- [ ] Android Studio open
- [ ] Project synced (Gradle complete)
- [ ] Emulator created and running
- [ ] App builds successfully
- [ ] Splash screen appears with **logo** ✓
- [ ] Dashboard loads with 4 buttons
- [ ] Risk Score screen loads and fetches data
- [ ] Dispute form submits and shows Nova analysis
- [ ] Admin dashboard displays disputes
- [ ] No crashes in Logcat

**If all tests pass ✅, Android app is working!**

---

## 🔗 STEP 4: INTEGRATION TESTING (30 minutes)

### 4.1 End-to-End Flow

Run all three platforms simultaneously:

**Terminal 1 (Backend):**
```powershell
cd C:\PeerToPeerDebtManagement
npm run dev
```

**Terminal 2 (Frontend):**
```powershell
cd C:\PeerToPeerDebtManagement\web
npm start
```

**Terminal 3 (Android):**
```
Android Studio → Run 'app' on emulator
```

### 4.2 Complete User Journey

#### Scenario: Borrower requests loan, gets approved, receives payment, loan auto-repays

**Step 1: Web Frontend - Register & Request Loan**
1. Go to http://localhost:3000
2. Register as borrower
3. Request Ksh 5,000 loan from specific lender
4. Check dashboard → loan shows "Pending"

**Step 2: Backend - Approve Loan (via Postman)**
1. Open Postman
2. Login as lender
3. Approve loan from Step 1
4. Check frontend → loan status changes to "Approved"

**Step 3: Backend - Simulate Incoming Payment**
1. Postman: Send incoming transaction Ksh 1,000
2. Check response → auto-repayment triggered for Ksh 500
3. Backend logs show repayment deducted

**Step 4: Web Frontend - View Repayment**
1. Refresh dashboard
2. Click "Repayments" tab
3. Verify Ksh 500 repayment appears
4. Loan balance now Ksh 4,500

**Step 5: Android - View Risk Score**
1. Click "View Risk Score" on Android
2. Confirm borrower's risk score loads
3. Shows Low/Medium risk band

**Step 6: Web Frontend - File Dispute**
1. File dispute on web frontend
2. Check Nova Act analysis appears
3. Shows confidence score and recommendation

**Step 7: Android - Admin View**
1. Click "Admin Dashboard" on Android
2. See dispute in queue
3. Tap dispute to see Nova analysis

---

### ✅ Integration Testing Checklist

- [ ] All 3 platforms running simultaneously
- [ ] Web registration works
- [ ] Loan request created
- [ ] Backend approval works
- [ ] Frontend loan status updates
- [ ] Auto-repayment triggered
- [ ] Repayment visible in frontend
- [ ] Risk score loads on Android
- [ ] Dispute files and shows Nova analysis
- [ ] Admin can view disputes
- [ ] No data inconsistencies

**If all tests pass ✅, System is fully integrated!**

---

## 🐛 DEBUGGING GUIDE

### Common Issues & Solutions

#### Issue 1: "Cannot connect to localhost:5000"

**Symptoms:** Frontend/Android can't reach backend

**Solutions:**
1. Check backend is running: `npm run dev` in backend terminal
2. Verify port 5000: `netstat -ano | findstr :5000`
3. For Android emulator, use `http://10.0.2.2:5000/` not `http://localhost:5000/`
4. For physical device, use your computer's IP: `ipconfig` → IPv4 Address

#### Issue 2: "Database connection failed"

**Symptoms:** Backend crashes on startup

**Solutions:**
1. Check PostgreSQL running: `psql -U postgres`
2. Verify `.env` has correct DB credentials
3. Create database: `createdb mpesa_debt`
4. Run schema: `npm run db:init`

#### Issue 3: "JWT token invalid" on API calls

**Symptoms:** 401 Unauthorized errors

**Solutions:**
1. Use token from registration/login response
2. Include in header: `Authorization: Bearer <token>`
3. Token expires after 24 hours (see `.env`)
4. Get new token by logging in again

#### Issue 4: "CORS error" on frontend

**Symptoms:** Browser console shows CORS error

**Solutions:**
1. Check backend has CORS enabled (should be in `server.js`)
2. Verify API URL in frontend `.env`
3. Restart both frontend and backend

#### Issue 5: "Splash screen shows no logo"

**Symptoms:** Android splash loads but logo missing

**Solutions:**
1. Verify `android/app/src/main/res/drawable/ic_launcher.png` exists
2. Check `activity_splash.xml` references correct drawable name
3. Rebuild: Build → Clean Project → Rebuild

#### Issue 6: "Risk score doesn't load"

**Symptoms:** Android shows "Loading..." then disappears

**Solutions:**
1. Check Logcat (View → Tool Windows → Logcat) for errors
2. Verify backend URL in ApiClient.kt
3. Check `/api/users/{id}/score` endpoint in backend
4. Ensure borrower ID is correct

#### Issue 7: "Postman requests fail"

**Symptoms:** curl/Postman returns errors

**Solutions:**
1. Verify backend is running
2. Check Content-Type header: `application/json`
3. Verify JSON syntax in body
4. Copy token from login response exactly
5. Wait 2-3 seconds between requests

---

## 📊 Testing Results Summary

After completing all tests, fill in:

```
BACKEND TESTING
✅ Health Check: PASS / FAIL
✅ User Registration: PASS / FAIL
✅ User Login: PASS / FAIL
✅ Loan Request: PASS / FAIL
✅ Loan Approval: PASS / FAIL
✅ Auto-Repayment: PASS / FAIL
✅ Dispute Filing: PASS / FAIL

FRONTEND TESTING
✅ Registration: PASS / FAIL
✅ Login: PASS / FAIL
✅ Loan Request: PASS / FAIL
✅ Risk Score Display: PASS / FAIL
✅ Dispute Filing: PASS / FAIL
✅ Admin Dashboard: PASS / FAIL
✅ Logo Display: PASS / FAIL

ANDROID TESTING
✅ App Build: PASS / FAIL
✅ Splash Screen: PASS / FAIL
✅ Dashboard: PASS / FAIL
✅ Risk Score: PASS / FAIL
✅ Dispute: PASS / FAIL
✅ Admin: PASS / FAIL

INTEGRATION TESTING
✅ End-to-End Flow: PASS / FAIL
✅ Data Consistency: PASS / FAIL
✅ Multi-Platform: PASS / FAIL

OVERALL: ✅ READY FOR DEMO
```

---

## 🚀 Next Steps (After Testing)

Once all tests pass:

1. **Record Demo Video** (20-30 min)
   - Show complete flow across all platforms
   - Highlight auto-repayment feature
   - Show Nova integration

2. **Update Devpost** (15 min)
   - Add demo video link
   - Add GitHub link
   - Update project description

3. **Final Polish** (1 hour)
   - Fix any remaining bugs
   - Optimize performance
   - Test on multiple devices

---

**Good luck with testing! Let me know which step you want to start with.**
