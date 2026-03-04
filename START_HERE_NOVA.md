# 🚀 START HERE - Nova Backend Setup (Paste & Execute)
**Copy-Paste Commands for Immediate Execution**

---

## ⚡ Quick Start (5 Minutes)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment
```bash
# Copy example to .env
cp .env.example .env

# Edit with your AWS credentials (use nano, vim, or your editor)
nano .env
```

**Add these lines to `.env`:**
```env
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_HERE
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_KEY_HERE
NOVA_MODEL_ID=amazon.nova-lite-v1:0
```

### Step 3: Create Database Tables
```bash
# Connect to PostgreSQL and run migration
psql -U postgres -d mpesa_debt -f src/migrations/001_add_nova_tables.sql
```

**Expected output:**
```
CREATE TABLE
CREATE INDEX
CREATE VIEW
```

### Step 4: Verify Installation
```bash
# Check tables were created
psql -U postgres -d mpesa_debt -c "\dt borrower_risk_scores"

# Expected: Shows table with columns
```

### Step 5: Start Backend
```bash
# In project root
npm run dev
```

**Expected output:**
```
Server running on http://localhost:5000
Database connected
```

---

## 🧪 Test Nova Integration (In Another Terminal)

### Test 1: Health Check
```bash
curl http://localhost:5000/api/health
```

**Expected response:**
```json
{
  "status": "Server is running",
  "timestamp": "2026-03-04T12:00:00.000Z"
}
```

### Test 2: Get Risk Score
```bash
# First get a user ID from database
psql -U postgres -d mpesa_debt -c "SELECT id FROM users LIMIT 1;"
# Copy the UUID

# Then test the endpoint (replace with actual user ID and token)
curl -X GET \
  "http://localhost:5000/api/loans/risk-score/[USER_ID]" \
  -H "Authorization: Bearer [YOUR_JWT_TOKEN]"
```

**Expected response (if authenticated):**
```json
{
  "riskScore": 35,
  "riskBand": "Low",
  "keyFactors": [
    "Zero defaults",
    "Consistent repayment",
    "Established history"
  ],
  "recommendation": "Approve",
  "source": "nova",
  "calculatedAt": "2026-03-04T12:00:00Z"
}
```

### Test 3: File a Dispute
```bash
# Get a loan ID
psql -U postgres -d mpesa_debt -c "SELECT id FROM loans LIMIT 1;"

# Test endpoint
curl -X POST \
  "http://localhost:5000/api/disputes/create" \
  -H "Authorization: Bearer [YOUR_JWT_TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{
    "loan_id": "[LOAN_ID]",
    "reason": "Repayment was made but not recorded",
    "evidence": {
      "message": "M-PESA screenshot"
    }
  }'
```

**Expected response:**
```json
{
  "message": "Dispute filed successfully",
  "dispute": {
    "id": "uuid-here",
    "status": "open",
    "nova_analysis": {
      "summary": "Borrower claims unrecorded payment...",
      "suggestion": "Request timestamped proof...",
      "confidence": 78,
      "flags": []
    }
  }
}
```

---

## 📊 Verify Database

### Check All Nova Tables Exist
```bash
psql -U postgres -d mpesa_debt -c "
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE '%score%' OR table_name LIKE 'dispute%';
"
```

**Expected output:**
```
    table_name
──────────────────────
 borrower_risk_scores
 disputes
 loan_agreements
 nova_api_logs
```

### Check Views Created
```bash
psql -U postgres -d mpesa_debt -c "
SELECT viewname FROM pg_views WHERE schemaname = 'public';
"
```

**Expected to include:**
```
 borrower_loan_stats
 dispute_queue
```

---

## 🚨 Troubleshooting

### Issue: "npm: command not found"
**Solution:** Install Node.js from https://nodejs.org/

### Issue: "psql: command not found"
**Solution:** Install PostgreSQL from https://www.postgresql.org/download/

### Issue: "database 'mpesa_debt' does not exist"
**Solution:**
```bash
# Create database
psql -U postgres -c "CREATE DATABASE mpesa_debt;"

# Run schema from existing project
psql -U postgres -d mpesa_debt -f src/config/database-schema.sql
```

### Issue: "AWS credentials not found"
**Solution:**
```bash
# Verify .env exists
cat .env | grep AWS

# Should show:
# AWS_REGION=us-west-2
# AWS_ACCESS_KEY_ID=...
# AWS_SECRET_ACCESS_KEY=...
```

### Issue: "Cannot find module 'aws-sdk'"
**Solution:**
```bash
npm install aws-sdk
```

### Issue: Nova API returns error
**Solution:**
- Check AWS region is `us-west-2`
- Verify AWS account has Bedrock enabled
- Ensure IAM user has `bedrock:InvokeModel` permission
- Check Nova service status on AWS console

---

## 📝 Files That Were Created/Modified

### Created:
```
src/services/novaService.js          (Nova 2 Lite + Act integration)
src/routes/disputes.js               (Dispute endpoints)
src/migrations/001_add_nova_tables.sql (Database schema)
```

### Modified:
```
src/routes/loans.js                  (Added risk-score endpoint)
server.js                            (Added disputes route)
package.json                         (Added aws-sdk)
.env.example                         (Added Nova config)
```

### Documentation:
```
NOVA_INTEGRATION_ROADMAP.md          (13-day plan)
NOVA_QUICKSTART_CHECKLIST.md         (Daily breakdown)
NOVA_BACKEND_SETUP.md                (Installation guide)
NOVA_BACKEND_COMPLETE.md             (Status report)
AGENT_IMPLEMENTATION_CHECKLIST.md    (AI agent instructions)
NOVA_SYSTEM_ARCHITECTURE.md          (Visual diagrams)
EXECUTION_SUMMARY.md                 (Summary)
START_HERE_NOVA.md                   (This file)
```

---

## ✅ Success Criteria

You'll know everything works when:

✅ `npm install` completes without errors  
✅ `.env` has AWS credentials  
✅ `psql` migration creates 4 tables  
✅ `npm run dev` starts backend on port 5000  
✅ `curl http://localhost:5000/api/health` returns 200  
✅ Risk score endpoint returns Nova response  
✅ Dispute endpoint creates disputes in DB  
✅ Admin queue shows disputes  

---

## 🎯 What's Next?

Once backend is verified, move to:

**Phase 2: Frontend (React)**
- File: `web/src/components/BorrowerRiskScore.jsx`
- File: `web/src/components/DisputeForm.jsx`
- Estimated time: 2 days

**Phase 3: Mobile (Kotlin)**
- File: `android/RiskScoreActivity.kt`
- File: `android/DisputeActivity.kt`
- Estimated time: 2 days

**Phase 4: Demo + Submit**
- Record 3-minute demo video
- Submit to Devpost
- Estimated time: 2 days

---

## 📞 Quick Reference

```bash
# Start backend
npm run dev

# Run tests
npm test

# Connect to database
psql -U postgres -d mpesa_debt

# View logs
tail -f logs/server.log

# Kill backend
pkill -f "npm run dev"
```

---

## 🔐 Security Checklist

Before committing code:

- [ ] AWS credentials are in `.env` (not in code)
- [ ] `.env` is in `.gitignore`
- [ ] No hardcoded secrets in any file
- [ ] All endpoints require JWT auth
- [ ] SQL queries use parameterized statements
- [ ] Error messages don't expose system details

---

## 🎬 Ready?

1. Copy commands above
2. Run them in sequence
3. Verify each step works
4. Move to Phase 2 (Frontend)

**You have 11 days. Go fast!** ⚡

---

**Status: Backend Ready for Testing**

Next command: `npm install`
