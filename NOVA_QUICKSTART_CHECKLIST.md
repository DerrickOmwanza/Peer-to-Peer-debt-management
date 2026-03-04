# 🚀 Nova Integration Quick-Start Checklist
**Start Date:** March 4, 2026  
**Deadline:** March 16, 2026 (5pm PT)  
**Status:** Ready to execute

---

## ✅ Pre-Flight Checklist (Do This NOW)

### 1. AWS Account & Credentials
- [ ] You have an AWS account with Bedrock access
- [ ] You have `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
- [ ] Region is set to `us-west-2` (Nova availability)
- [ ] Add to `.env` file:
  ```
  AWS_REGION=us-west-2
  AWS_ACCESS_KEY_ID=xxx
  AWS_SECRET_ACCESS_KEY=xxx
  ```

### 2. Dependencies
- [ ] Run: `npm install aws-sdk` (in project root)
- [ ] Verify: `npm list aws-sdk`

### 3. Backend Ready
- [ ] Backend runs on localhost:5000
- [ ] PostgreSQL connected
- [ ] All migrations completed
- [ ] Postman or similar testing tool ready

### 4. Android Development
- [ ] Android Studio installed
- [ ] Kotlin/Java configured
- [ ] Emulator ready to test

---

## 📅 13-Day Sprint Plan

### **WEEK 1: Backend Nova Integration**

#### Days 1-2: Database Schema (2 hours)
```bash
# 1. Create migration file: src/migrations/001_add_nova_tables.sql

# 2. Run in PostgreSQL:
CREATE TABLE borrower_risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  borrower_id UUID NOT NULL UNIQUE REFERENCES users(id),
  risk_score INT,
  risk_band VARCHAR(20),
  key_factors JSONB,
  recommendation VARCHAR(20),
  nova_response JSONB,
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES loans(id),
  borrower_id UUID NOT NULL REFERENCES users(id),
  lender_id UUID NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL,
  evidence JSONB,
  nova_summary TEXT,
  nova_suggestion VARCHAR(255),
  nova_confidence INT,
  nova_flags JSONB,
  status VARCHAR(20) DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

# 3. Verify:
\dt — should show both new tables
```

**Deliverable:** ✅ Two new database tables ready

---

#### Days 2-3: Nova Service Layer (4 hours)
```bash
# Create file: src/services/novaService.js
# Copy from NOVA_INTEGRATION_ROADMAP.md section "Step 1.2" and "Step 2.3"

# Test: Create simple test file
node -e "
const novaService = require('./src/services/novaService');
console.log('Nova service loaded:', typeof novaService.getRiskScore);
"
```

**Deliverable:** ✅ Working Nova service with 2 functions

---

#### Days 3-4: API Endpoints (4 hours)
```bash
# Modify: src/routes/loans.js
# Add two endpoints:
#   GET /api/loans/risk-score/:borrowerId
#   POST /api/loans/:loanId/dispute

# Test with Postman:
# POST http://localhost:5000/api/loans/[loanId]/dispute
# Body: { "reason": "Test", "evidence": {...} }
```

**Deliverable:** ✅ Two endpoints working with Nova responses

---

#### Day 4: Admin Console API (2 hours)
```bash
# Optional: Create view endpoint
# GET /api/admin/disputes → returns all disputes with Nova insights
# GET /api/admin/risk-scores → returns all borrower risk scores

# This helps with demo video
```

**Deliverable:** ✅ Backend fully integrated with Nova

---

### **WEEK 2: Frontend Display**

#### Day 5: React Components (3 hours)
```bash
# Create: web/src/components/BorrowerRiskScore.jsx
# - Display risk score, risk band, key factors
# - Call GET /api/loans/risk-score/[borrowerId]

# Create: web/src/components/DisputeForm.jsx
# - Form to submit dispute reason + evidence
# - Call POST /api/loans/[loanId]/dispute
# - Display Nova suggestion

# Test in browser (http://localhost:3001)
```

**Deliverable:** ✅ Risk score visible in lender's loan approval screen

---

#### Day 6: UI Polish (2 hours)
```bash
# Add to lender dashboard:
# - Risk score badge next to borrower name
# - Risk-based color coding (Red=High, Yellow=Medium, Green=Low)

# Add to loan detail page:
# - "File Dispute" button
# - Dispute history with Nova summaries

# Make it visually impressive for demo
```

**Deliverable:** ✅ Professional UI ready for demo video

---

### **WEEK 3: Android + Demo**

#### Days 7-8: Kotlin/Android (6 hours)
```bash
# Create: DisputeActivity.kt
# - Layout: EditText (dispute reason), Button (submit)
# - Retrofit client to call backend
# - Display Nova's dispute summary + suggestion

# Create: RiskScoreActivity.kt
# - Display borrower risk score + factors
# - Call backend API

# Test on emulator
```

**Deliverable:** ✅ Android app showing Nova outputs

---

#### Days 9-10: Demo Video (4 hours)
```bash
# Record 3-minute demo:
# 1. Login as borrower (20s)
# 2. Request loan (20s)
# 3. Show borrower's Nova risk score in lender view (20s)
# 4. Show dispute submission + Nova analysis (20s)
# 5. Show on Android app (40s)
# 6. Explain impact (40s)

# Include: #AmazonNova hashtag
# Upload to YouTube (unlisted)
```

**Deliverable:** ✅ 3-min demo video on YouTube

---

### **WEEK 4: Final Submission**

#### Days 11-12: Devpost + Repo (3 hours)
```bash
# 1. Clean GitHub repo
# git add .
# git commit -m "Add Amazon Nova integration: risk scoring + dispute automation"

# 2. Add README update
# - Nova integration section
# - How to test Nova features
# - API endpoint examples

# 3. Write Devpost submission (use template from ROADMAP.md)

# 4. Add architecture diagram
# - Show Nova in the architecture
# - Simple visual (ASCII or image)
```

**Deliverable:** ✅ GitHub repo + Devpost draft ready

---

#### Day 13: Final Polish & Submit (2 hours)
```bash
# 1. Final code review
# - Check error handling
# - Verify Nova calls have fallbacks
# - Ensure no hardcoded credentials

# 2. Test full flow end-to-end
# - Create test loan
# - Verify Nova risk score appears
# - File dispute
# - Verify Nova analysis appears

# 3. Submit to Devpost
# - Title: "Peer-to-Peer Debt Management System (Powered by Amazon Nova)"
# - Description: Use template
# - Demo video link
# - GitHub repo
# - Team info

# 4. Celebrate! 🎉
```

**Deliverable:** ✅ Official submission by March 16, 5pm PT

---

## 🎯 Critical Path (Minimum Viable)

If you're short on time, do ONLY this:

**Days 1-2:** Database tables + Nova service (backend)  
**Days 3-4:** Risk scoring endpoint  
**Days 5-6:** React component to display risk score  
**Days 7-8:** Dispute endpoint + Android UI  
**Days 9-10:** Record demo video  
**Days 11-13:** Submit to Devpost  

This is **bare minimum** but still competitive.

---

## 🔧 Code Files to Create

### File 1: `src/services/novaService.js`
**Status:** Ready to copy from ROADMAP.md  
**Size:** ~100 lines  
**Time:** 30 min  

### File 2: Update `src/routes/loans.js`
**Status:** Add 2 endpoints  
**Size:** ~80 lines  
**Time:** 30 min  

### File 3: `src/migrations/001_add_nova_tables.sql`
**Status:** Ready to copy from above  
**Size:** ~50 lines  
**Time:** 10 min  

### File 4: `web/src/components/BorrowerRiskScore.jsx`
**Status:** Template provided  
**Size:** ~80 lines  
**Time:** 45 min  

### File 5: `web/src/components/DisputeForm.jsx`
**Status:** Template provided  
**Size:** ~100 lines  
**Time:** 45 min  

### File 6: `android/DisputeActivity.kt`
**Status:** Template provided  
**Size:** ~120 lines  
**Time:** 1 hour  

**Total code writing:** ~4-5 hours (very doable)

---

## 🚦 Daily Stand-up Template

Use this each morning:

```
Today (Day X):
[ ] What I did yesterday
[ ] What I'm doing today
[ ] Blockers

Day 1 Example:
[ ] Set up AWS credentials
[ ] Created borrower_risk_scores table
[ ] Blocker: None
```

---

## ⚠️ Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Forgot AWS credentials | Add to .env, restart `npm run dev` |
| Nova API timeout | Implement 30s timeout + fallback score |
| Android emulator won't run | Use Android Studio's built-in emulator, not Genymotion |
| Forgot to include #AmazonNova in video | Check before uploading |
| Repo has hardcoded keys | Use .env, don't commit .env file |

---

## 📞 When You're Stuck

1. **Nova API not working?**
   - Check AWS credentials in `.env`
   - Check region is `us-west-2`
   - Test with AWS CLI: `aws bedrock-runtime invoke-model ...`

2. **Android app won't connect to backend?**
   - Make sure backend is running on localhost:5000
   - Check firewall isn't blocking port 5000
   - Test with Postman first

3. **Database migration failed?**
   - Check PostgreSQL is running
   - Connect manually: `psql -U postgres -d mpesa_debt`
   - Verify the SQL syntax

4. **Time running out?**
   - Cut Android app (judges care more about backend Nova)
   - Just do React frontend + video
   - Still very competitive

---

## ✨ What Judges Look For

✅ **Technical (60%)**
- Does Nova actually power decisions? YES → you'll win
- Is it integrated cleanly? YES → clean code scores high
- Does it handle errors gracefully? YES → professional

✅ **Impact (20%)**
- Solves real problem? YES → Kenya's informal lending
- Enterprise-grade? YES → auditable, secure, scalable
- Usable now? YES → mobile app ready

✅ **Creativity (20%)**
- Novel use of Nova? YES → AI agents for lending risk + disputes
- Multi-agent reasoning? YES → shows deep understanding
- Real-world applicability? YES → ready to pilot with SACCOs

---

## 🎯 Your Competitive Advantage

Most hackathon projects:
- ❌ Just call Nova once (chatbot wrapper)
- ❌ No error handling
- ❌ No real business logic

Your project:
- ✅ Nova integrated in 2 critical places (risk scoring + disputes)
- ✅ Real business logic (formal lending + M-PESA)
- ✅ Production-ready (error handling, fallbacks, security)
- ✅ Enterprise impact (SACCOs, Chamas across Africa)

**You're competing at a higher level. Good luck!**

---

## 🚀 Ready to Start?

### Option A: "I want detailed code first"
→ Let me know, I'll provide complete boilerplate for each file

### Option B: "I want to start now"
→ Create the database tables today and reply with a screenshot

### Option C: "I'm unsure about something"
→ Ask me before you code (better now than later)

**What's your move?**
