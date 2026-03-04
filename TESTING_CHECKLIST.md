# ✅ Quick Testing Checklist

Print this or keep it open while testing!

---

## 🔑 STEP 1: BACKEND TESTING (30 min)

### Pre-Requisites
- [ ] PostgreSQL installed
- [ ] Terminal 1 open for backend

### Database Setup
```
Windows: psql -U postgres
psql> CREATE DATABASE mpesa_debt;
psql> \q
```
- [ ] Database created

### Backend Start
```powershell
cd C:\PeerToPeerDebtManagement
npm install
npm run db:init
npm run dev
```
- [ ] Backend running on port 5000
- [ ] No error messages

### API Tests (Terminal 2)
Open new PowerShell, run these:

#### Test 1: Health Check
```powershell
curl http://localhost:5000/api/health
```
- [ ] Returns `{"status":"ok"}`

#### Test 2: Register Borrower
```powershell
$body = @{full_name="John Borrower";email="john@example.com";phone_number="+254701234567";password="password123"} | ConvertTo-Json
curl -X POST -H "Content-Type: application/json" -d $body http://localhost:5000/api/auth/register
```
- [ ] Returns success with JWT token
- [ ] **SAVE TOKEN as $johnToken**

#### Test 3: Register Lender
```powershell
$body = @{full_name="Jane Lender";email="jane@example.com";phone_number="+254702345678";password="password123"} | ConvertTo-Json
curl -X POST -H "Content-Type: application/json" -d $body http://localhost:5000/api/auth/register
```
- [ ] Returns success with JWT token
- [ ] **SAVE TOKEN as $janeToken**

#### Test 4: Login
```powershell
$body = @{email="john@example.com";password="password123"} | ConvertTo-Json
curl -X POST -H "Content-Type: application/json" -d $body http://localhost:5000/api/auth/login
```
- [ ] Returns success with token

#### Test 5: Create Loan
```powershell
$johnToken = "YOUR_TOKEN_FROM_TEST_2"
$body = @{lender_phone="+254702345678";principal_amount=5000;repayment_method="fixed";repayment_amount=500;repayment_start_date="2026-03-15"} | ConvertTo-Json
curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $johnToken" -d $body http://localhost:5000/api/loans/request
```
- [ ] Returns success with loan ID
- [ ] **SAVE LOAN ID as $loanId**

#### Test 6: Get Loans
```powershell
$johnToken = "YOUR_TOKEN_FROM_TEST_2"
curl -X GET -H "Authorization: Bearer $johnToken" http://localhost:5000/api/loans/borrower
```
- [ ] Returns array with 1 loan
- [ ] Loan has "pending" status

#### Test 7: Approve Loan
```powershell
$janeToken = "YOUR_TOKEN_FROM_TEST_3"
$loanId = "LOAN_ID_FROM_TEST_5"
$body = @{approved=$true} | ConvertTo-Json
curl -X PATCH -H "Content-Type: application/json" -H "Authorization: Bearer $janeToken" -d $body http://localhost:5000/api/loans/$loanId/approval
```
- [ ] Returns success with "approved" status

#### Test 8: Auto-Repayment Trigger ⭐ KEY TEST
```powershell
$johnToken = "YOUR_TOKEN_FROM_TEST_2"
$body = @{amount=1000;source_phone="+254705555555";description="Payment from client"} | ConvertTo-Json
curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $johnToken" -d $body http://localhost:5000/api/transactions/incoming
```
- [ ] Returns success
- [ ] **SHOWS repayment_triggered: true** ⭐
- [ ] Repayment amount is 500 (or configured amount)
- [ ] Remaining balance is 4500

#### Test 9: Repayment History
```powershell
$johnToken = "YOUR_TOKEN_FROM_TEST_2"
$loanId = "LOAN_ID_FROM_TEST_5"
curl -X GET -H "Authorization: Bearer $johnToken" http://localhost:5000/api/repayments/loan/$loanId
```
- [ ] Returns array with repayments
- [ ] Shows repayment of 500

#### Test 10: File Dispute
```powershell
$johnToken = "YOUR_TOKEN_FROM_TEST_2"
$body = @{loan_id="LOAN_ID";reason="Terms not agreed";evidence="Messages"} | ConvertTo-Json
curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $johnToken" -d $body http://localhost:5000/api/disputes/create
```
- [ ] Returns success with dispute ID
- [ ] Shows `nova_analysis` with confidence score

### ✅ Backend Summary
- [ ] All 10 tests passed
- [ ] Auto-repayment triggered (Test 8)
- [ ] Nova analysis appears (Test 10)
- **Status**: READY FOR FRONTEND

---

## 🎨 STEP 2: FRONTEND TESTING (30 min)

### Start Frontend
```powershell
# Terminal 3 (keep backend running in Terminal 1)
cd C:\PeerToPeerDebtManagement\web
npm install
npm start
```
- [ ] Frontend running on port 3000
- [ ] Browser auto-opened

### Test Flow 1: Registration & Login
1. Click "Sign Up"
2. Fill form:
   - Name: John Borrower
   - Email: john@example.com
   - Phone: +254701234567
   - Password: password123
3. Click Submit
   - [ ] Redirects to Login page
   - [ ] See success message

4. Click "Log In"
5. Enter credentials:
   - Email: john@example.com
   - Password: password123
   - [ ] Redirects to Dashboard
   - [ ] See username in navbar
   - [ ] **Logo visible in navbar** ✓

### Test Flow 2: Create Loan
1. Click "Request Loan"
2. Fill form:
   - Lender Phone: +254702345678
   - Amount: 5000
   - Method: Fixed
   - Amount: 500
   - Date: 2026-03-15
3. Click Submit
   - [ ] Success message
   - [ ] Loan appears in dashboard
   - [ ] Status: "Pending"

### Test Flow 3: Risk Score
1. Click "Risk Score" tab
   - [ ] Score displays (0-100)
   - [ ] Risk Band shows (Low/Medium/High)
   - [ ] Reasoning visible

### Test Flow 4: Dispute
1. Click "Disputes" tab
2. Click "File Dispute"
3. Fill form:
   - Reason: Test dispute
   - Evidence: Test evidence
4. Click Submit
   - [ ] Success message
   - [ ] Nova analysis appears
   - [ ] Shows confidence score
   - [ ] Shows flags/recommendations

### Test Flow 5: Admin Dashboard
1. Logout
2. Register as admin (email: admin@example.com)
3. Login
4. Click "Admin Dashboard"
   - [ ] Dispute queue visible
   - [ ] Can click dispute to see details
   - [ ] Shows Nova analysis

### ✅ Frontend Summary
- [ ] Registration works
- [ ] Login works
- [ ] **Logo visible** ✓
- [ ] All 5 flows completed
- [ ] No console errors (F12)
- **Status**: READY FOR ANDROID

---

## 📱 STEP 3: ANDROID TESTING (30 min)

### Setup
1. Open Android Studio
2. File → Open → Select `android/` folder
3. Wait for Gradle sync
   - [ ] Sync complete (no errors)

4. Tools → Device Manager
5. Create emulator (if needed):
   - Device: Pixel 5
   - API: 30+
   - [ ] Emulator created

6. Start emulator (click play button)
   - [ ] Emulator loaded (home screen visible)

### Configure Backend URL
Edit: `android/app/src/main/java/com/example/peertopeer/data/network/ApiClient.kt`

Line 7:
```kotlin
// For emulator (leave as is):
private const val BASE_URL = "http://10.0.2.2:5000/"

// For physical device, use:
// private const val BASE_URL = "http://192.168.1.100:5000/"  // YOUR IP
```
- [ ] URL configured

### Run App
1. Run → Run 'app' (Shift+F10)
2. Select running emulator
3. Click OK
   - [ ] App builds (3-5 min first time)
   - [ ] App installs on emulator

### Test Flow 1: Splash Screen
- [ ] Splash appears
- [ ] **Your logo visible** ✓
- [ ] Text: "Peer-to-Peer Debt Management"
- [ ] Green background
- [ ] 2 second delay
- [ ] Auto-transitions to Dashboard

### Test Flow 2: Dashboard
- [ ] Dashboard loads
- [ ] See 4 buttons:
  - [ ] Create Loan
  - [ ] View Risk Score
  - [ ] File Dispute
  - [ ] Admin Dashboard

### Test Flow 3: Risk Score
1. Click "View Risk Score"
   - [ ] Screen loads
   - [ ] Shows "Loading..."
   - [ ] After 2-3 sec: Risk score appears
   - [ ] Progress bar shows value
   - [ ] Risk band displays

**If doesn't load:**
- Check Logcat (View → Tool Windows → Logcat)
- Look for red error messages
- Verify backend running
- Verify backend URL correct

### Test Flow 4: Dispute
1. Click "File Dispute"
   - [ ] Screen loads
   - [ ] Two text fields visible
   - [ ] Submit button visible

2. Enter:
   - Reason: Test dispute
   - Evidence: Test evidence
3. Click Submit
   - [ ] Loading indicator
   - [ ] After 2-3 sec: Nova analysis appears
   - [ ] Shows dispute ID
   - [ ] Shows confidence score

### Test Flow 5: Admin
1. Click "Admin Dashboard"
   - [ ] Screen loads
   - [ ] Dispute list visible
   - [ ] Can click dispute to see details

### ✅ Android Summary
- [ ] App builds successfully
- [ ] **Logo visible on splash** ✓
- [ ] All 5 flows completed
- [ ] No crashes (Logcat clean)
- **Status**: READY FOR INTEGRATION

---

## 🔗 STEP 4: INTEGRATION TEST (30 min)

### Start All Platforms
- Terminal 1: `npm run dev` (backend)
- Terminal 2: `npm start` (frontend web)
- Terminal 3: Android Studio (emulator)

All 3 running simultaneously:
- [ ] Backend on port 5000
- [ ] Frontend on port 3000
- [ ] Android on emulator

### End-to-End Test
1. **Web**: Register borrower
   - [ ] Account created

2. **Web**: Request loan from lender +254702345678
   - [ ] Loan created (status: Pending)

3. **Postman/Backend**: Approve loan
   - [ ] Loan status: Approved

4. **Postman/Backend**: Simulate incoming payment Ksh 1000
   - [ ] Auto-repayment triggered
   - [ ] Ksh 500 deducted ⭐
   - [ ] Balance now Ksh 4500

5. **Web**: Refresh dashboard
   - [ ] Loan shows Ksh 4500 remaining

6. **Web**: File dispute
   - [ ] Nova analysis appears

7. **Android**: Click Risk Score
   - [ ] Borrower risk score loads

8. **Android**: Click Dispute
   - [ ] File dispute and see Nova analysis

### ✅ Integration Summary
- [ ] Data flows correctly between platforms
- [ ] Auto-repayment visible everywhere
- [ ] Nova analysis consistent
- [ ] **System working end-to-end** ✓

---

## 🎯 FINAL STATUS

### All Tests Passed?
```
✅ Backend:       PASS / FAIL
✅ Frontend:      PASS / FAIL
✅ Android:       PASS / FAIL
✅ Integration:   PASS / FAIL
```

### Overall Status
```
🎉 SYSTEM READY FOR DEMO RECORDING

If PASS: Proceed to demo video
If FAIL: Debug using SYSTEM_TESTING_GUIDE.md
```

---

## 📞 Quick Reference: Copy-Paste Commands

### Backend Tests
```powershell
# Start backend
cd C:\PeerToPeerDebtManagement
npm run dev

# In new terminal:
$body = @{full_name="John";email="john@example.com";phone_number="+254701234567";password="pass"} | ConvertTo-Json
curl -X POST -H "Content-Type: application/json" -d $body http://localhost:5000/api/auth/register
```

### Frontend
```powershell
cd C:\PeerToPeerDebtManagement\web
npm start
```

### Android
- Open Android Studio
- File → Open → android/
- Run → Run 'app'

---

**Ready to test? Start with Step 1 (Backend Testing)**
