# 🏗️ Nova System Architecture Diagram
**Visual Overview of Amazon Nova Integration**

---

## System Flow Diagram

```
┌───────────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACES                                   │
├───────────────────────────┬───────────────────────────┬───────────────────┤
│   React Frontend          │   Android Mobile App      │   Admin Dashboard │
│   (Lender View)           │   (Borrower/Lender)       │   (Support Team)  │
│                           │                           │                   │
│ • Loan approval           │ • Create loan             │ • Dispute queue   │
│ • View risk score         │ • View risk score         │ • Risk analytics  │
│ • File dispute            │ • File dispute            │ • System stats    │
│ • Dispute resolution      │ • Track repayments        │ • Nova logs       │
└───────────┬───────────────┴───────────────┬───────────┴───────────┬───────┘
            │                               │                       │
            │        REST API (JWT Auth)    │                       │
            │        JSON over HTTP/S       │                       │
            └───────────────────┬───────────┴───────────────────────┘
                                │
┌───────────────────────────────▼───────────────────────────────────────────┐
│                      EXPRESS.JS BACKEND (Port 5000)                        │
├─────────────────────────────────────────────────────────────────────────  ┤
│                                                                             │
│  Route Layer:                                                              │
│  ┌─────────────────┬──────────────────┬──────────────┬─────────────────┐  │
│  │ /api/loans      │ /api/disputes    │ /api/users   │ /api/transactions
│  │                 │                  │              │                  │
│  │ • request       │ • create         │ • profile    │ • incoming       │
│  │ • approval      │ • get details    │ • wallet     │ • repayment      │
│  │ • risk-score ◄──┼──> dispute endpoint              │ • repayment      │
│  │ • admin/stats   │ • resolve        │              │ • balance update │
│  └─────────────────┴──────────────────┴──────────────┴─────────────────┘
│                                │
│                                │
│  Service Layer:                │
│  ┌──────────────────────────────┴─────────────────────────────────┐       │
│  │ novaService.js                                                  │       │
│  ├─────────────────────────────────────────────────────────────── │       │
│  │ getRiskScore()          → Calls Amazon Nova 2 Lite              │       │
│  │   Input: userId, loan history                                   │       │
│  │   Output: riskScore (0-100), riskBand, factors, recommendation │       │
│  │                                                                 │       │
│  │ analyzeDispute()        → Calls Amazon Nova Act                 │       │
│  │   Input: dispute reason, evidence                              │       │
│  │   Output: summary, suggestion, confidence, flags               │       │
│  │                                                                 │       │
│  │ analyzeAgreement()      → (Future) Nova Multimodal             │       │
│  │   Input: agreement PDF                                          │       │
│  │   Output: missing clauses, risk flags                          │       │
│  │                                                                 │       │
│  │ Error Handling:                                                 │       │
│  │ • 30-second timeout with fallback                              │       │
│  │ • Default medium-risk score if Nova fails                      │       │
│  │ • Logs all Nova API calls + latency                            │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
└────────────────────────────────┬──────────────────────────────────────────┘
                                 │
                    ┌────────────┬──────────────┐
                    │            │              │
         ┌──────────▼───────┐  ┌─▼──────────┐ ┌─▼──────────────┐
         │                  │  │            │ │                │
         │  PostgreSQL DB   │  │AWS Bedrock │ │  M-PESA API   │
         │  (Port 5432)     │  │  (Nova)    │ │  (STK Push)   │
         │                  │  │            │ │                │
         ├──────────────────┤  │ • Nova 2   │ ├────────────────┤
         │                  │  │   Lite     │ │ Disbursement   │
         │ Core Tables:     │  │ • Nova Act │ │ Repayment      │
         │ • users          │  │ • Multimod │ │ Confirmations  │
         │ • loans          │  │   embeddings
         │ • transactions   │  └────────────┘ └────────────────┘
         │ • repayments     │
         │ • agreements     │
         │                  │
         │ Nova Tables:     │
         │ • risk_scores    │
         │ • disputes       │
         │ • agreements     │
         │ • nova_api_logs  │
         │                  │
         │ Views:           │
         │ • borrower_stats │
         │ • dispute_queue  │
         │                  │
         └──────────────────┘
```

---

## Data Flow: Risk Scoring (Nova 2 Lite)

```
┌─────────────────────────────────────────────────────────────────────┐
│ LENDER VIEWS LOAN REQUEST                                           │
│ Click: "View Borrower's Risk Score"                                 │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
            ┌──────────────────────────────┐
            │ GET /api/loans/risk-score/:id│
            └──────────────┬───────────────┘
                           │
                           ▼
            ┌──────────────────────────────────────────┐
            │ Check cache (last 30 days):              │
            │ SELECT * FROM borrower_risk_scores...    │
            │ WHERE borrower_id = ?                    │
            │ AND calculated_at > NOW() - 30 days      │
            └──┬────────────────────────────────────┬──┘
               │                                    │
        CACHE HIT              │              CACHE MISS
        Return cached            │            Query metrics
        score (100ms)            │            
                                 │
                                 ▼
                    ┌──────────────────────────────────┐
                    │ Query borrower metrics:          │
                    │ • Total loans                    │
                    │ • Default rate (%)               │
                    │ • Avg repayment days             │
                    │ • Loan frequency (quarterly)     │
                    │ • Dispute count                  │
                    └──────────┬───────────────────────┘
                               │
                               ▼
                    ┌──────────────────────────────────┐
                    │ Call Nova 2 Lite via AWS Bedrock │
                    │                                  │
                    │ Prompt:                          │
                    │ "Evaluate borrower for credit   │
                    │  risk based on: total loans,    │
                    │  default rate, repayment time,  │
                    │  dispute history..."            │
                    │                                  │
                    │ Returns:                         │
                    │ {                                │
                    │   riskScore: 35,                 │
                    │   riskBand: 'Low',              │
                    │   keyFactors: [...],             │
                    │   recommendation: 'Approve'     │
                    │ }                                │
                    └──────────┬───────────────────────┘
                               │
                               ▼
                    ┌──────────────────────────────┐
                    │ Store in borrower_risk_scores│
                    │ Cache for 30 days            │
                    │ INSERT/UPDATE + nova_response│
                    └──────────┬───────────────────┘
                               │
                               ▼
            ┌─────────────────────────────────────┐
            │ Return to Frontend:                  │
            │ {                                    │
            │   riskScore: 35,                     │
            │   riskBand: 'Low',                  │
            │   keyFactors: [                      │
            │     'Zero defaults',                 │
            │     'Consistent repayment',          │
            │     'Established history'            │
            │   ],                                 │
            │   recommendation: 'Approve',         │
            │   source: 'nova',                    │
            │   calculatedAt: 'timestamp'          │
            │ }                                    │
            └─────────────────────────────────────┘
                               │
                               ▼
            ┌──────────────────────────────────┐
            │ Frontend displays:                │
            │ ┌────────────────────────────────┤
            │ │ 📊 Risk Assessment             │
            │ ├────────────────────────────────┤
            │ │ Score: 35/100                  │
            │ │ Band:  🟢 LOW RISK             │
            │ │                                │
            │ │ Key Factors:                   │
            │ │ ✓ Zero defaults                │
            │ │ ✓ Consistent repayment         │
            │ │ ✓ Established history          │
            │ │                                │
            │ │ Recommendation: ✅ APPROVE     │
            │ └────────────────────────────────┘
            └──────────────────────────────────┘
```

---

## Data Flow: Dispute Analysis (Nova Act)

```
┌────────────────────────────────────────────────────────────┐
│ BORROWER/LENDER FILES DISPUTE                              │
│ Reason: "Repayment was made but not recorded"              │
│ Evidence: [screenshots, messages, documents]               │
└───────────────────────┬──────────────────────────────────┘
                        │
                        ▼
            ┌─────────────────────────────┐
            │ POST /api/disputes/create   │
            │ Body: {                     │
            │   loan_id: '...',           │
            │   reason: '...',            │
            │   evidence: {...}           │
            │ }                           │
            └──────────┬──────────────────┘
                       │
                       ▼
            ┌──────────────────────────┐
            │ Get loan details:        │
            │ • Principal amount       │
            │ • Borrower name          │
            │ • Lender name            │
            │ • Current balance        │
            └──────────┬───────────────┘
                       │
                       ▼
            ┌──────────────────────────────────┐
            │ Call Nova 2 Lite (Act):          │
            │                                  │
            │ Prompt:                          │
            │ "Analyze this dispute:           │
            │  Reason: [reason]                │
            │  Evidence: [evidence]            │
            │  Suggest resolution and rate    │
            │  confidence level"               │
            │                                  │
            │ Returns:                         │
            │ {                                │
            │   summary: '...',                │
            │   suggestion: '...',             │
            │   confidence: 78,                │
            │   flags: [...]                   │
            │ }                                │
            └──────────┬───────────────────────┘
                       │
                       ▼
            ┌────────────────────────────────┐
            │ Store in disputes table:       │
            │ • dispute_id (UUID)            │
            │ • reason, evidence             │
            │ • nova_summary                 │
            │ • nova_suggestion              │
            │ • nova_confidence              │
            │ • nova_flags                   │
            │ • status: 'open'               │
            └──────────┬─────────────────────┘
                       │
                       ▼
            ┌────────────────────────────────┐
            │ Send notifications:            │
            │ • To lender: "Dispute filed.   │
            │  Nova suggests: [suggestion]"  │
            │ • To borrower: "Dispute filed" │
            └──────────┬─────────────────────┘
                       │
                       ▼
            ┌───────────────────────────────────┐
            │ Return to requester:              │
            │ {                                 │
            │   message: "Dispute filed",       │
            │   dispute: {                      │
            │     id: 'uuid',                   │
            │     status: 'open',               │
            │     nova_analysis: {              │
            │       summary: '...',             │
            │       suggestion: '...',          │
            │       confidence: 78,             │
            │       flags: [...]                │
            │     },                            │
            │     created_at: 'timestamp'       │
            │   }                               │
            │ }                                 │
            └───────────┬───────────────────────┘
                        │
                        ▼
            ┌────────────────────────────────┐
            │ Admin Dashboard updates:       │
            │ GET /api/disputes/admin/queue  │
            │                                │
            │ Shows:                         │
            │ • Open disputes                │
            │ • Nova summaries               │
            │ • Nova suggestions             │
            │ • Confidence scores            │
            │ • Days open                    │
            │                                │
            │ Lender can:                    │
            │ • Review Nova suggestion       │
            │ • Add manual notes             │
            │ • Resolve dispute              │
            │ • Escalate if needed           │
            └────────────────────────────────┘
```

---

## Database Schema Relationships

```
┌──────────────────────────────────────────────────────────┐
│                     users (existing)                      │
│  ┌──────────┬──────────┬────────────┬──────────────┐    │
│  │ id (PK)  │ name     │ phone      │ wallet_bal   │    │
│  └──────────┴──────────┴────────────┴──────────────┘    │
└─────────┬───────────────────────┬──────────────────────┘
          │                       │
          │ borrower_id           │ lender_id
          │                       │
          ▼                       ▼
┌──────────────────────────────────────────────────────────┐
│                     loans (existing)                      │
│  ┌──────────┬──────────┬─────────────┬────────────┐     │
│  │ id (PK)  │ borrower │ lender      │ principal  │     │
│  └──────────┴──────────┴─────────────┴────────────┘     │
└──────────┬─────────────────────────────────────────────┘
           │
           ├───────────┬────────────────┬────────────────┐
           │           │                │                │
   NEW: 1━━━ (many)    │                │                │
           │           │                │                │
           ▼           ▼                ▼                ▼
    ┌────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────┐
    │  risk_     │ │  disputes    │ │  agreements  │ │nova_api_ │
    │ scores     │ │              │ │              │ │logs      │
    ├────────────┤ ├──────────────┤ ├──────────────┤ ├──────────┤
    │ borrower_id│ │ loan_id      │ │ loan_id      │ │ operation│
    │ risk_score │ │ reason       │ │ agreement_   │ │ latency_ │
    │ risk_band  │ │ nova_summary │ │  text        │ │ ms       │
    │ key_factors│ │ nova_suggest │ │ nova_analysis│ │ success  │
    │ recommend. │ │ nova_confid. │ │              │ │          │
    └────────────┘ └──────────────┘ └──────────────┘ └──────────┘

KEY RELATIONSHIPS:
━━━━━━━━━━━━━━━━
users (1) ━━━┳━━━ (many) loans
             ┃
             ┣━━ (many) borrower_risk_scores
             ┃
             ┣━━ (many) disputes (as borrower_id)
             ┃
             └━━ (many) disputes (as lender_id)

loans (1) ━━━┳━━ (many) disputes
             ┃
             └━━ (many) loan_agreements
```

---

## API Endpoint Organization

```
┌─────────────────────────────────────────────────────────┐
│              REST API Endpoints (Port 5000)              │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  EXISTING ENDPOINTS (unchanged):                        │
│  POST   /api/auth/register                              │
│  POST   /api/auth/login                                 │
│  GET    /api/users/profile                              │
│  POST   /api/loans/request                              │
│  PATCH  /api/loans/:id/approval                         │
│  GET    /api/loans/borrower                             │
│  GET    /api/loans/lender                               │
│  POST   /api/transactions/incoming                      │
│  GET    /api/repayments/loan/:id                        │
│  ... more existing endpoints                            │
│                                                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  NEW NOVA ENDPOINTS:                                    │
│                                                           │
│  ┌─ RISK SCORING ────────────────────────────────────┐  │
│  │                                                   │  │
│  │ GET /api/loans/risk-score/:borrowerId            │  │
│  │     → Nova 2 Lite risk assessment                │  │
│  │     ← { riskScore, riskBand, factors, ... }      │  │
│  │                                                   │  │
│  │ GET /api/loans/admin/stats                       │  │
│  │     → Dashboard stats with dispute analytics     │  │
│  │     ← { loans: {...}, disputes: {...} }          │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
│                                                           │
│  ┌─ DISPUTE MANAGEMENT ──────────────────────────────┐  │
│  │                                                   │  │
│  │ POST /api/disputes/create                        │  │
│  │      → File dispute with Nova analysis           │  │
│  │      ← { dispute: {..., nova_analysis: {...} } } │  │
│  │                                                   │  │
│  │ GET /api/disputes/:disputeId                     │  │
│  │     → Get dispute details with Nova output       │  │
│  │     ← { id, reason, nova_analysis: {...} }       │  │
│  │                                                   │  │
│  │ GET /api/disputes/loan/:loanId                   │  │
│  │     → All disputes for a loan                    │  │
│  │     ← [ { id, status, nova_summary }, ... ]      │  │
│  │                                                   │  │
│  │ PATCH /api/disputes/:disputeId/resolve           │  │
│  │       → Resolve with admin decision              │  │
│  │       ← { message, dispute: {...} }              │  │
│  │                                                   │  │
│  │ GET /api/disputes/admin/queue                    │  │
│  │     → Admin dashboard queue                      │  │
│  │     ← [ disputes with nova_confidence, ... ]     │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## Technology Stack

```
┌────────────────────────────────────────────────────────────┐
│ PRESENTATION LAYER                                         │
├────────────────────────────────────────────────────────────┤
│ • React.js 19.2.0 (Web frontend)                           │
│ • Kotlin (Android mobile)                                  │
│ • Context API + Axios (state + HTTP)                       │
└────────────────────────────────────────────────────────────┘
                           │
┌────────────────────────────────────────────────────────────┐
│ API LAYER                                                  │
├────────────────────────────────────────────────────────────┤
│ • Express.js 4.18.2 (REST API)                             │
│ • Node.js 16+ (runtime)                                    │
│ • JWT authentication (24h tokens)                          │
│ • CORS enabled                                             │
│ • Error handling middleware                                │
└────────────────────────────────────────────────────────────┘
                           │
┌────────────────────────────────────────────────────────────┐
│ BUSINESS LOGIC LAYER                                       │
├────────────────────────────────────────────────────────────┤
│ • novaService.js (Nova integration)                        │
│ • Controllers (loan, dispute, user logic)                  │
│ • Models (database schema)                                 │
│ • Middleware (auth, validation)                            │
└────────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
┌───────▼───────┐  ┌──────▼────────┐  ┌─────▼────────┐
│  PostgreSQL   │  │  AWS Bedrock  │  │   M-PESA     │
│  Database     │  │   (Nova API)  │  │   Daraja API │
│               │  │               │  │              │
│ • Loans       │  │ • Risk        │  │ • STK Push   │
│ • Users       │  │   Scoring     │  │ • C2B        │
│ • Disputes    │  │ • Dispute     │  │ • Callbacks  │
│ • Scores      │  │   Analysis    │  │              │
└───────────────┘  └───────────────┘  └──────────────┘
```

---

## Error Handling Flow

```
┌─────────────────────────────────────┐
│ API Request                         │
└──────────────┬──────────────────────┘
               │
               ▼
    ┌──────────────────────┐
    │ Nova API Call        │
    └──────────┬───────────┘
               │
        ┌──────┴──────┐
        │             │
       YES           NO
   SUCCESS       ERROR
        │             │
        │             ▼
        │      ┌─────────────────────────┐
        │      │ Fallback Logic:         │
        │      │ • 30-second timeout?    │
        │      │ • Network error?        │
        │      │ • Invalid response?     │
        │      │                         │
        │      │ → Use default score     │
        │      │ → Log error             │
        │      │ → Notify admin          │
        │      └─────────────┬───────────┘
        │                    │
        └────────────┬───────┘
                     │
                     ▼
        ┌─────────────────────────────┐
        │ Store in Database           │
        │ • nova_api_logs table       │
        │ • Timestamp latency         │
        │ • Success/failure status    │
        │ • Error message (if any)    │
        └─────────────┬───────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │ Return Response to Client   │
        │ {                           │
        │   data: {...},              │
        │   source: 'nova'|'fallback' │
        │   error: (if fallback)      │
        │ }                           │
        └─────────────────────────────┘
```

---

## Summary

Your Nova integration is:

✅ **Multi-layered**: UI → API → Services → Database → Nova/M-PESA  
✅ **Resilient**: Error handling with fallbacks  
✅ **Auditable**: All Nova calls logged  
✅ **Scalable**: Caching, indexing, async processing  
✅ **Secure**: JWT auth, parameterized queries, .env credentials  

**Ready for Phase 2: Frontend** 🚀
