# 🚀 Nova Backend Setup Guide
**Complete step-by-step guide to get Nova integration running**

---

## ✅ Pre-Requirements

- Node.js 16+ installed
- PostgreSQL 12+ running
- AWS account with Bedrock access (Nova 2 Lite)
- AWS credentials (Access Key ID + Secret Access Key)

---

## 📝 Step 1: Install AWS SDK

```bash
# In project root
npm install aws-sdk

# Verify installation
npm list aws-sdk
```

Expected output: `aws-sdk@2.1545.0`

---

## 🔐 Step 2: Configure AWS Credentials

### Option A: Using `.env` file (Development)

1. Copy the updated `.env.example`:
```bash
cp .env.example .env
```

2. Edit `.env` and add your AWS credentials:
```env
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
NOVA_MODEL_ID=amazon.nova-lite-v1:0
```

### Option B: Using AWS Credentials File (Recommended for Production)

Create `~/.aws/credentials` (or `%USERPROFILE%\.aws\credentials` on Windows):
```
[default]
aws_access_key_id = YOUR_ACCESS_KEY
aws_secret_access_key = YOUR_SECRET_KEY
```

Then set in `.env`:
```env
AWS_REGION=us-west-2
```

---

## 🗄️ Step 3: Create Database Tables

### 3.1 Run the migration

```bash
# Connect to PostgreSQL
psql -U postgres -d mpesa_debt

# Run the migration script
\i src/migrations/001_add_nova_tables.sql

# Verify tables were created
\dt

# Should see:
# borrower_risk_scores
# disputes
# loan_agreements
# nova_api_logs
```

### 3.2 Verify views are created

```sql
-- In psql, check views
SELECT * FROM borrower_loan_stats LIMIT 1;
SELECT * FROM dispute_queue;
```

---

## 🧪 Step 4: Test Nova Connectivity

### 4.1 Create a test script

Create `test-nova.js` in project root:

```javascript
const novaService = require('./src/services/novaService');

async function testNova() {
  console.log('Testing Nova connectivity...\n');

  const result = await novaService.healthCheck();
  console.log('Health Check Result:', result);
  console.log('\n');

  // Test risk scoring
  const riskScore = await novaService.getRiskScore('test-user', {
    totalLoans: 5,
    defaultRate: 10,
    avgRepaymentDays: 45,
    loanFrequency: 2,
    disputeCount: 0
  });
  console.log('Risk Score Result:', riskScore);
  console.log('\n');

  // Test dispute analysis
  const dispute = await novaService.analyzeDispute({
    reason: 'Borrower claims repayment was made',
    evidence: { message: 'Screenshot of M-PESA receipt' },
    loanAmount: 5000,
    borrowerName: 'John',
    lenderName: 'Jane'
  });
  console.log('Dispute Analysis Result:', dispute);
}

testNova().catch(console.error);
```

### 4.2 Run the test

```bash
node test-nova.js
```

**Expected output:**
```
Testing Nova connectivity...

Health Check Result: { status: 'healthy', model: 'amazon.nova-lite-v1:0' }

Risk Score Result: { 
  success: true, 
  riskScore: 45, 
  riskBand: 'Medium', 
  ... 
}

Dispute Analysis Result: { 
  success: true, 
  summary: '...', 
  suggestion: '...', 
  ...
}
```

---

## 🚀 Step 5: Start the Backend

```bash
# Development mode (with auto-reload)
npm run dev

# Or production mode
npm start
```

**Expected console output:**
```
Server running on http://localhost:5000
Database connected
```

---

## 🧪 Step 6: Test API Endpoints

### 6.1 Get Risk Score

```bash
# First, you need a user ID from your database
# Get one with:
# psql -U postgres -d mpesa_debt
# SELECT id FROM users LIMIT 1;

curl -X GET \
  http://localhost:5000/api/loans/risk-score/[USER_ID] \
  -H "Authorization: Bearer [YOUR_JWT_TOKEN]"
```

**Response example:**
```json
{
  "riskScore": 35,
  "riskBand": "Low",
  "keyFactors": [
    "Low default rate (0%)",
    "Consistent repayment history",
    "No disputes on record"
  ],
  "recommendation": "Approve",
  "reasoning": "Based on payment history and low risk profile...",
  "source": "nova",
  "calculatedAt": "2026-03-04T12:00:00Z"
}
```

### 6.2 File a Dispute

```bash
curl -X POST \
  http://localhost:5000/api/disputes/create \
  -H "Authorization: Bearer [YOUR_JWT_TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{
    "loan_id": "[LOAN_ID]",
    "reason": "Borrower claims repayment was made but not recorded",
    "evidence": {
      "mpesa_receipt": "Screenshot.png",
      "message": "Payment confirmation message"
    }
  }'
```

**Response example:**
```json
{
  "message": "Dispute filed successfully",
  "dispute": {
    "id": "uuid-here",
    "loan_id": "uuid-here",
    "reason": "Borrower claims repayment was made but not recorded",
    "status": "open",
    "nova_analysis": {
      "summary": "Dispute about unrecorded payment...",
      "suggestion": "Request borrower to provide timestamped proof...",
      "confidence": 78,
      "flags": []
    },
    "created_at": "2026-03-04T12:00:00Z"
  }
}
```

### 6.3 Get Dispute Details

```bash
curl -X GET \
  http://localhost:5000/api/disputes/[DISPUTE_ID] \
  -H "Authorization: Bearer [YOUR_JWT_TOKEN]"
```

### 6.4 Admin Dashboard Stats

```bash
curl -X GET \
  http://localhost:5000/api/loans/admin/stats \
  -H "Authorization: Bearer [YOUR_JWT_TOKEN]"
```

---

## 🐛 Troubleshooting

### Issue: "AWS credentials not found"

**Solution:**
```bash
# Check .env file exists and has correct values
cat .env | grep AWS

# Verify AWS SDK can load credentials
node -e "const AWS = require('aws-sdk'); console.log(new AWS.CredentialProviderChain().resolveSync())"
```

### Issue: "NoSuchBucketError" or service errors

**Solution:**
- Verify your AWS region is `us-west-2` (Nova availability)
- Check your AWS account has Bedrock access enabled
- Ensure your IAM user has permissions: `bedrock:InvokeModel`

### Issue: "Database does not contain requested table"

**Solution:**
```bash
# Re-run migration
psql -U postgres -d mpesa_debt -f src/migrations/001_add_nova_tables.sql

# Verify
psql -U postgres -d mpesa_debt -c "\dt"
```

### Issue: "TIMEOUT: Nova API timeout (30s)"

**Solution:**
- Nova service is slow. Increase timeout in `novaService.js`:
```javascript
const TIMEOUT = 60000; // 60 seconds instead of 30
```
- Or check AWS Bedrock API status

### Issue: "Invalid JSON in Nova response"

**Solution:**
- This is usually due to model response format
- The service has fallback handling
- Check logs for full error message

---

## 📊 Database Verification Queries

### Check tables exist:
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

### Check borrower risk scores:
```sql
SELECT * FROM borrower_risk_scores ORDER BY calculated_at DESC LIMIT 5;
```

### Check disputes:
```sql
SELECT id, reason, status, nova_confidence FROM disputes ORDER BY created_at DESC LIMIT 5;
```

### Check Nova API logs:
```sql
SELECT operation, COUNT(*) as count, AVG(latency_ms) as avg_latency_ms 
FROM nova_api_logs 
GROUP BY operation;
```

---

## 📈 Performance Monitoring

### Query Nova usage:

```sql
-- How many times did we call Nova?
SELECT operation, COUNT(*) as calls FROM nova_api_logs GROUP BY operation;

-- Average response time
SELECT operation, AVG(latency_ms) as avg_ms FROM nova_api_logs GROUP BY operation;

-- Success rate
SELECT operation, COUNT(CASE WHEN success = TRUE THEN 1 END)::float / COUNT(*) * 100 as success_rate 
FROM nova_api_logs GROUP BY operation;
```

---

## ✅ Final Checklist

Before moving to Android/frontend development:

- [ ] AWS credentials configured in `.env`
- [ ] `npm install aws-sdk` completed
- [ ] Database migration ran successfully
- [ ] `test-nova.js` runs without errors
- [ ] Backend starts with `npm run dev`
- [ ] Risk score endpoint returns Nova response
- [ ] Dispute endpoint accepts and analyzes disputes
- [ ] Admin stats endpoint works
- [ ] All 4 new tables exist in PostgreSQL
- [ ] No hardcoded credentials in code

---

## 🚀 Next Steps

Once backend is verified:

1. **Frontend (React)** - Add components to display risk scores and disputes
2. **Android App** - Build Kotlin activities to call these endpoints
3. **Demo Video** - Record showcasing Nova integration
4. **Devpost Submission** - Complete hackathon submission

---

## 📞 Quick Reference Commands

```bash
# Start backend
npm run dev

# Run tests
npm test

# Check database
psql -U postgres -d mpesa_debt

# View logs
tail -f nova_api_logs.txt

# Clear old risk scores (older than 30 days)
DELETE FROM borrower_risk_scores WHERE calculated_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
```

---

**Status: Ready for Phase 2 (Frontend Integration)** ✅
