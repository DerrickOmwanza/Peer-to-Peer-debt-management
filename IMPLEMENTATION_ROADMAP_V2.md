# Peer-to-Peer Debt Management System v2.0
## 3-Month MVP Implementation Roadmap

**Document Version:** 2.0  
**Effective Date:** 03 February 2026  
**Target Launch:** 03 May 2026 (12 weeks)  
**Status:** Pre-Development (Awaiting Regulatory Clearance)

---

## EXECUTIVE OVERVIEW

This document provides a **detailed sprint-by-sprint breakdown** for building a production-ready MVP of the refined P2P Debt Management System. The roadmap assumes:

✅ Regulatory approval obtained (CBK confirms no license needed OR licensed partner secured)  
✅ Safaricom partnership LOI signed (API access confirmed)  
✅ Funding secured (KES 10-15M)  
✅ Core team in place (3+ backend engineers, 2+ frontend, 1 ML, 1 ops)  
✅ Pilot partner signed (SACCO with 500+ users ready to go live month 12)

**Total Timeline:** 12 weeks  
**Team Size:** 10-12 people  
**Cost:** KES 8-12M (staff, infrastructure, M-Pesa integration)

---

## PHASE 1: FOUNDATION (Weeks 1-3)

### Sprint 1.1: Development Environment & Architecture (Week 1)

**Goal:** All developers can run code locally, architecture validated

**Tasks:**

| Task | Owner | Duration | Deliverable |
|------|-------|----------|-------------|
| Setup monorepo (Git, GitHub, CI/CD) | DevOps | 2 days | Monorepo structure, CI pipeline |
| Setup PostgreSQL & Redis locally | Backend Lead | 1 day | docker-compose.yml with sample data |
| Setup Node.js backend scaffold | Backend Lead | 2 days | Express server with middleware, routes stub |
| Setup React frontend with Vite | Frontend Lead | 2 days | React app, routing, API client setup |
| Database schema finalization | Backend Lead + PM | 1 day | Validated schema.sql (from REFINED_SYSTEM_DESIGN_V2.md Section 7) |
| Architecture review meeting | All | 0.5 days | Approved architecture, questions answered |

**Acceptance Criteria:**
- [ ] All developers can `docker-compose up` and access postgres + redis + app
- [ ] Backend healthcheck endpoint returns 200 OK
- [ ] Frontend loads with placeholder dashboard
- [ ] Git repo structured and CI/CD pipeline running (linting, basic tests)

**Risks:**
- Database connection issues in local environment → Use Docker Compose, document troubleshooting
- Frontend build failures → Validate Vite setup with multiple Node versions

---

### Sprint 1.2: Authentication & User Management (Week 1-2)

**Goal:** Users can register, login, get JWT tokens, complete KYC

**Tasks:**

| Task | Owner | Duration | Deliverable |
|------|-------|----------|-------------|
| Implement user registration API | Backend 1 | 2 days | POST /api/v1/auth/register with validation |
| Implement user login API | Backend 1 | 1 day | POST /api/v1/auth/login with JWT generation |
| Implement password reset flow | Backend 1 | 1 day | POST /api/v1/auth/forgot-password |
| JWT middleware + role-based access control | Backend 1 | 2 days | Auth middleware protecting routes |
| KYC verification API (identity + phone) | Backend 2 | 2 days | POST /api/v1/kyc/verify with Safaricom integration |
| User profile management (GET/PUT) | Backend 2 | 1 day | GET/PUT /api/v1/users/{id}/profile |
| Frontend: Login page | Frontend 1 | 2 days | Material Design login form |
| Frontend: Registration page | Frontend 1 | 2 days | Multi-step registration (personal + KYC) |
| Frontend: Dashboard skeleton | Frontend 1 | 1 day | Protected route, user info display |
| Testing: Auth integration tests | QA | 2 days | 80%+ coverage on auth endpoints |

**Acceptance Criteria:**
- [ ] User can register with phone, email, password
- [ ] User can login and receive JWT token
- [ ] JWT token validates in protected endpoints
- [ ] KYC verification triggers and records national ID
- [ ] All endpoints validated with invalid inputs (return 400 errors)
- [ ] Passwords hashed (bcrypt, not plaintext)

**Risks:**
- Safaricom KYC API slow/unreliable → Build mock KYC for dev/test, real API in prod
- JWT expiry too short → Implement refresh token mechanism

---

### Sprint 1.3: Core Data Models & Ledger Foundation (Week 2-3)

**Goal:** Database is populated, transaction ledger is working, interest calculations tested

**Tasks:**

| Task | Owner | Duration | Deliverable |
|------|-------|----------|-------------|
| Run database migrations | Backend Lead | 1 day | All tables created (users, loans, transactions, etc.) |
| Seed sample data (users, loans) | Backend Lead | 1 day | 100 test users, 50 sample loans |
| Implement Transaction model & queries | Backend 2 | 2 days | Create, read, query transactions from DB |
| Implement Loan model & lifecycle queries | Backend 2 | 2 days | Create, read, update, list loans |
| Implement interest calculation engine | Backend 1 | 2 days | Function: calculateDailyInterest() with tests |
| Implement penalty calculation engine | Backend 1 | 2 days | Function: applyPenalty() with cap logic |
| Implement balance reconciliation | Backend 2 | 1 day | Verify sum of transactions = current balance |
| Unit tests: Finance calculations | QA | 2 days | 95%+ coverage on interest/penalty math |

**Acceptance Criteria:**
- [ ] All database migrations run without error
- [ ] Loans can be created and queried
- [ ] Interest calculation matches spec (e.g., KES 5,000 @ 1% daily = KES 50)
- [ ] Penalties capped correctly (50% of principal)
- [ ] Ledger balance always matches sum of transactions
- [ ] No floating-point errors (use DECIMAL type, not FLOAT)

**Risks:**
- Interest calculation floating-point errors → Use DECIMAL(12,2) everywhere
- Migration rollback needed → Test migrations in staging first, document rollback procedures

---

## PHASE 2: CORE FEATURES (Weeks 4-8)

### Sprint 2.1: Loan Creation & Agreement Engine (Week 4)

**Goal:** Borrowers can create loans, lenders can approve, agreements are generated

**Tasks:**

| Task | Owner | Duration | Deliverable |
|------|-------|----------|-------------|
| Loan creation API (request validation) | Backend 1 | 2 days | POST /api/v1/loans with all fields |
| Agreement generation service | Backend 2 | 2 days | generateAgreement() creates agreement record + PDF |
| E-signature service (web) | Backend 2 | 2 days | Capture signature image + metadata |
| E-signature service (USSD mock) | Backend 2 | 1 day | Accept "1" as confirmation for feature phones |
| Loan approval API (lender-only) | Backend 1 | 1 day | POST /api/v1/loans/{id}/approve |
| PDF generation & storage | Backend 2 | 2 days | Use PDFKit to generate signed agreement PDF |
| Frontend: Loan request form | Frontend 1 | 3 days | Multi-step form (amount, lender, due date, etc.) |
| Frontend: Terms & conditions display | Frontend 2 | 2 days | Clause-by-clause with checkboxes |
| Frontend: Signature capture | Frontend 1 | 2 days | Signature pad component (react-signature-canvas) |
| Frontend: Loan details view | Frontend 2 | 2 days | Display agreement, transaction history, buttons |
| Testing: Agreement generation | QA | 2 days | Verify PDFs are valid, readable, contain correct data |

**Acceptance Criteria:**
- [ ] Borrower can fill loan form and submit
- [ ] Agreement is generated with all clauses
- [ ] E-signature captured and stored with metadata
- [ ] PDF is generated and downloadable
- [ ] Lender receives notification (SMS + in-app) with loan details
- [ ] Lender can approve/decline
- [ ] Agreement PDF is immutable (hash verification)

**Risks:**
- PDF generation slow → Use headless browser (Puppeteer) instead of PDFKit if needed
- Signature pad unreliable on mobile → Test on real devices, provide fallback

---

### Sprint 2.2: M-Pesa Integration - Prompts & Callbacks (Week 5-6)

**Goal:** Mock M-Pesa prompts work, callbacks are received and processed

**Tasks:**

| Task | Owner | Duration | Deliverable |
|------|-------|----------|-------------|
| M-Pesa API wrapper service | Backend 1 | 2 days | mpesaService.sendPrompt(), handleCallback() |
| Implement prompt initiation | Backend 1 | 2 days | Lender approval triggers M-Pesa prompt |
| Implement webhook receiver | Backend 1 | 2 days | POST /api/v1/mpesa/callbacks handles transaction confirmation |
| M-Pesa webhook security (HMAC validation) | Backend 1 | 1 day | Verify callback signatures |
| Implement prompt retry logic (3 attempts) | Backend 2 | 1 day | Retry failed prompts with exponential backoff |
| Mock M-Pesa sandbox for testing | Backend 1 | 2 days | Create endpoint to simulate M-Pesa responses |
| Integration test: Disbursement flow | QA | 2 days | Test full loan approval → prompt → callback → balance updated |
| Integration test: Webhook security | QA | 1 day | Test invalid signatures are rejected |

**Acceptance Criteria:**
- [ ] Prompt sent to lender includes loan details + ML score
- [ ] Callback from M-Pesa updates transaction record
- [ ] Transaction marked "completed" in ledger
- [ ] Balance updated correctly
- [ ] Notification sent to both parties
- [ ] Webhook rejects invalid signatures (security)
- [ ] Retries happen if callback fails
- [ ] Mock M-Pesa works for local testing

**Risks:**
- Safaricom webhook unreliable → Implement polling as fallback
- Callback processing race conditions → Use database locks, idempotent processing
- HMAC validation complex → Test thoroughly with sample payloads from Safaricom

---

### Sprint 2.3: Automated Trigger & Repayment Engine (Week 6-7)

**Goal:** Incoming M-Pesa funds automatically trigger repayments; daily interest accruals work

**Tasks:**

| Task | Owner | Duration | Deliverable |
|------|-------|----------|-------------|
| Design trigger engine architecture | Backend Lead | 1 day | Flowchart of trigger decision logic |
| Implement daily interest accrual job | Backend 1 | 2 days | Bull job: runs daily @ 00:01 UTC, updates balances |
| Implement penalty application job | Backend 1 | 2 days | Bull job: checks overdue loans, applies penalties |
| Implement trigger monitoring (incoming funds) | Backend 2 | 2 days | Bull job: monitors M-Pesa callbacks, identifies repayment triggers |
| Implement repayment initiation | Backend 2 | 2 days | When triggered, send M-Pesa prompt to debtor |
| Implement balance reconciliation job | Backend 2 | 1 day | Nightly job: verify ledger balances match sum of transactions |
| Testing: Interest accrual job | QA | 2 days | Verify 10,000 loans accrue interest correctly |
| Testing: Trigger engine with 100+ loans | QA | 2 days | Simulate incoming funds, verify correct triggers |
| Monitoring & alerting setup | DevOps | 2 days | Alert if job fails, balance mismatch, webhook down |

**Acceptance Criteria:**
- [ ] Interest accrual runs daily, all active loans updated
- [ ] Penalty application only happens after grace period
- [ ] Incoming M-Pesa funds trigger repayment prompts correctly
- [ ] Threshold logic works (e.g., only trigger if incoming > KES 100)
- [ ] Repayment deductions correctly subtract from balance
- [ ] No duplicate charges (idempotent processing)
- [ ] Jobs retry on failure
- [ ] Alerts sent if job fails or hangs

**Risks:**
- Job queue fails, interest calculations missed → Implement redundancy, daily validation job
- Race conditions in concurrent job executions → Use database locks
- Performance degradation with 100k+ loans → Optimize queries, use batch processing

---

### Sprint 2.4: Dashboard & Real-Time Updates (Week 7)

**Goal:** Users can see live loan balances, transaction history, interest accrual

**Tasks:**

| Task | Owner | Duration | Deliverable |
|------|-------|----------|-------------|
| Dashboard API endpoint (GET /api/v1/dashboard) | Backend 2 | 2 days | Returns loans owed, loans issued, stats |
| Real-time updates with WebSockets | Backend 2 + Frontend 2 | 3 days | Socket.io integration, live balance updates |
| Transaction ledger API + pagination | Backend 1 | 1 day | GET /api/v1/loans/{id}/ledger with filters |
| Frontend: Main dashboard view | Frontend 1 | 2 days | Display loans owed + loans issued in cards |
| Frontend: Loan detail view with ledger | Frontend 2 | 2 days | Show transaction history, interest accrual, penalties |
| Frontend: Real-time balance updates | Frontend 2 | 1 day | WebSocket listener, update balances in real-time |
| Frontend: Responsive design (mobile) | Frontend 1 | 2 days | Ensure dashboard works on phones |
| Testing: Dashboard load time < 300ms | QA | 1 day | Performance testing with 100k+ loans |

**Acceptance Criteria:**
- [ ] Dashboard loads in < 3 seconds
- [ ] Real-time updates visible (interest accrual seen live)
- [ ] Responsive on mobile (3-4" phones)
- [ ] Ledger shows all transactions with correct data
- [ ] Balance calculations match backend
- [ ] No sensitive data exposed (passwords, PINs never shown)

**Risks:**
- WebSocket overhead with thousands of users → Implement room-based subscriptions
- Real-time calculations laggy → Cache calculations, update incrementally

---

## PHASE 3: ADVANCED FEATURES (Weeks 9-10)

### Sprint 3.1: ML Risk Scoring (Week 9)

**Goal:** ML model trained, scores displayed to lenders, explainability works

**Tasks:**

| Task | Owner | Duration | Deliverable |
|------|-------|----------|-------------|
| Data pipeline: Extract training features | ML | 2 days | Collect historical data, prepare CSV |
| Model training: XGBoost | ML | 2 days | Train model, evaluate metrics (AUC, precision) |
| Model explainability: SHAP integration | ML | 1 day | Generate SHAP values for top features |
| Scoring service API | Backend 2 | 1 day | POST /api/v1/scores/predict with user_id |
| Score caching in Redis (7-day validity) | Backend 2 | 1 day | Reduce computation, store scores |
| Frontend: Score display for lenders | Frontend 1 | 1 day | Show score band (LOW/MEDIUM/HIGH) + top factors |
| Testing: Model fairness (demographic bias) | ML | 2 days | Audit for gender, age, location bias |
| Documentation: Model card | ML | 1 day | Document model architecture, limitations, retraining schedule |

**Acceptance Criteria:**
- [ ] Model trained on historical data
- [ ] Scores generated in < 500ms
- [ ] Explainability shows top 3 factors
- [ ] Score doesn't change for same user within 7 days
- [ ] No severe demographic bias detected
- [ ] Lender sees score + confidence + recommendation

**Risks:**
- Insufficient historical data → Use synthetic data, transfer learning
- Model bias detected → Reweight training data, add fairness constraints
- Scoring latency high → Move to cached background job

---

### Sprint 3.2: Dispute Management (Week 9-10)

**Goal:** Users can file disputes, operations team can resolve them

**Tasks:**

| Task | Owner | Duration | Deliverable |
|------|-------|----------|-------------|
| Dispute API (create, read, list) | Backend 1 | 2 days | POST /api/v1/disputes, GET /api/v1/disputes/{id} |
| Dispute resolution API (admin only) | Backend 1 | 1 day | PUT /api/v1/admin/disputes/{id}/resolve |
| Dispute evidence upload & storage | Backend 2 | 1 day | Handle file uploads, store in S3/cloud |
| Admin dashboard for disputes | Frontend 2 | 2 days | List disputes, view details, resolve with notes |
| Reversal flow integration | Backend 2 | 2 days | If dispute upheld, refund transaction |
| SLA tracking & alerting | Backend 1 | 1 day | Alert if dispute not resolved in 7 days |
| Testing: Dispute lifecycle | QA | 2 days | Create, resolve, verify reversal |

**Acceptance Criteria:**
- [ ] User can submit dispute with evidence
- [ ] Admin sees all open disputes in dashboard
- [ ] Admin can resolve (upheld/denied/partial)
- [ ] Upheld disputes trigger reversal
- [ ] SLA tracked and alerts sent
- [ ] Notifications sent to both parties on resolution

**Risks:**
- Dispute resolution manual & expensive → Implement automated rules (duplicate detection)
- Evidence upload validation → Scan for malware, limit file size

---

## PHASE 4: PRODUCTION HARDENING (Weeks 11-12)

### Sprint 4.1: Testing, Security, Performance (Week 11)

**Tasks:**

| Task | Owner | Duration | Deliverable |
|------|-------|----------|-------------|
| Security audit (OWASP top 10) | Security | 2 days | Pen test, code review, vulnerability assessment |
| Load testing (1,000 concurrent users) | DevOps + QA | 2 days | Identify bottlenecks, scale infrastructure |
| End-to-end testing (full loan cycle) | QA | 2 days | Create script: register → create loan → approve → repay → close |
| Database optimization & indexing | Backend | 1 day | Profile slow queries, add indexes |
| Caching optimization (Redis) | Backend | 1 day | Cache dashboard, ML scores, frequently accessed data |
| Error handling & logging | Backend Lead | 1 day | Ensure all errors are logged, users see helpful messages |
| Backup & disaster recovery plan | DevOps | 1 day | Test backup/restore procedures |

**Acceptance Criteria:**
- [ ] No critical security vulnerabilities
- [ ] System handles 1,000 concurrent users
- [ ] All API endpoints respond in < 300ms at scale
- [ ] Database queries optimized
- [ ] Error messages are user-friendly (no stack traces)
- [ ] Backups tested and verified

---

### Sprint 4.2: Deployment & Pilot Launch (Week 12)

**Tasks:**

| Task | Owner | Duration | Deliverable |
|------|-------|----------|-------------|
| Containerization (Docker + Kubernetes) | DevOps | 2 days | K8s manifests for prod deployment |
| CI/CD pipeline finalization | DevOps | 1 day | Auto-deploy on merge to main branch |
| Monitoring & alerting (Datadog/Prometheus) | DevOps | 1 day | Real-time alerts for errors, latency, resource usage |
| Documentation: Deployment guide | DevOps | 1 day | Step-by-step to deploy to cloud |
| Documentation: API guide (Swagger/OpenAPI) | Backend | 1 day | Interactive API docs for developers |
| Documentation: User guide (how-to) | Product | 1 day | Guides for borrowers, lenders, admins |
| Training: SACCO pilot team | Product | 1 day | Onboard pilot partner on platform |
| Soft launch: Internal testing | QA | 2 days | Final round of testing before pilot |
| **HARD LAUNCH: Pilot goes live with SACCO** | All | - | **05 May 2026 (Week 12)** |

**Acceptance Criteria:**
- [ ] Production infrastructure is live (AWS/GCP/Azure)
- [ ] All systems monitored and alerted
- [ ] SACCO staff trained and ready
- [ ] 500+ pilot users can login and use platform
- [ ] Support team ready for issues
- [ ] Documentation complete and accessible

---

## SPRINT SCHEDULE

```
Week 1: Setup, Auth, Data Models
  Mon-Fri: Sprint 1.1 + 1.2 Starts
  
Week 2: Auth Complete, Ledger Foundation
  Mon-Fri: Sprint 1.2 + 1.3
  
Week 3: Ledger & Calculations Ready
  Mon-Fri: Sprint 1.3 Complete
  Fri: Phase 1 Review & Retro
  
Week 4: Loan Creation & Agreements
  Mon-Fri: Sprint 2.1
  Fri: Demo loan creation to SACCO partner
  
Week 5: M-Pesa Integration (Part 1)
  Mon-Fri: Sprint 2.2 (M-Pesa prompts)
  
Week 6: M-Pesa + Triggers
  Mon-Fri: Sprint 2.2 (callbacks) + 2.3 (triggers)
  
Week 7: Dashboard & Real-Time
  Mon-Fri: Sprint 2.4
  Fri: Phase 2 Review & Retro
  Fri: Demo dashboard to SACCO
  
Week 8: Buffer & Fixes
  Mon-Fri: Bug fixes from sprint testing
  Fri: Full system integration testing
  
Week 9: ML Scoring & Disputes
  Mon-Fri: Sprint 3.1 + 3.2
  
Week 10: ML & Disputes Complete
  Mon-Fri: Sprint 3.1 + 3.2 finish
  Fri: Phase 3 Review & Retro
  
Week 11: Security & Performance
  Mon-Fri: Sprint 4.1
  Fri: Security audit complete, performance tested
  
Week 12: Deployment & Launch
  Mon-Fri: Sprint 4.2
  Thu: Soft launch with internal testers
  Fri: **HARD LAUNCH - Pilot goes live**
```

---

## RESOURCE ALLOCATION

### Core Team (10 people)

| Role | Headcount | Months | Cost (KES) |
|------|-----------|--------|-----------|
| **Backend Engineers** | 3 | 3 | 3,600,000 |
| **Frontend Engineers** | 2 | 3 | 2,400,000 |
| **ML Engineer** | 1 | 3 | 1,200,000 |
| **DevOps/Infrastructure** | 1 | 3 | 900,000 |
| **QA/Testing** | 1 | 3 | 600,000 |
| **Product Manager** | 1 | 3 | 900,000 |
| **Operations/Support** | 1 | 3 | 600,000 |
| **Subtotal: Personnel** | **10** | **3** | **10,200,000** |

### Infrastructure & Tools

| Item | Cost |
|------|------|
| Cloud infrastructure (AWS/GCP) | KES 300,000 |
| M-Pesa API sandbox/prod fees | KES 200,000 |
| Twilio SMS (100k messages) | KES 150,000 |
| Development tools (GitHub, Slack, Jira) | KES 100,000 |
| Security testing (pen test) | KES 200,000 |
| Legal review (contracts, CBK) | KES 200,000 |
| **Subtotal: Infrastructure & Tools** | **KES 1,150,000** |

### **TOTAL MVP COST: KES 11,350,000 (~USD 87,000)**

**Breakdown by Phase:**
- Phase 1 (Weeks 1-3): KES 2,850,000 (25%)
- Phase 2 (Weeks 4-8): KES 4,750,000 (42%)
- Phase 3 (Weeks 9-10): KES 2,380,000 (21%)
- Phase 4 (Weeks 11-12): KES 1,370,000 (12%)

---

## SUCCESS METRICS

### By End of Week 12 (Soft Launch)

| Metric | Target | How Measured |
|--------|--------|--------------|
| **System Availability** | 99.5% | Uptime monitoring |
| **API Response Time (p95)** | < 300ms | Load testing |
| **Test Coverage** | > 80% | Code coverage tools |
| **Security Issues** | 0 critical | Pen test results |
| **Documentation Completeness** | 100% | Checklist review |
| **Team Readiness** | 10/10 trained | Training completion |

### By End of Pilot (Week 20)

| Metric | Target | How Measured |
|--------|--------|--------------|
| **Pilot Users** | 500+ active | Login analytics |
| **Loans Created** | 100+ | Database query |
| **On-Time Payment Rate** | > 80% | Ledger data |
| **Dispute Rate** | < 5% of transactions | Dispute table |
| **NPS Score** | > 50 | User survey |
| **Repayment Success Rate** | > 95% (prompt success) | M-Pesa callback logs |

---

## RISK MITIGATION IN EXECUTION

### Technical Risks

| Risk | Mitigation |
|------|-----------|
| **Database scaling** | Use PostgreSQL read replicas, monitor query performance |
| **M-Pesa webhook failures** | Implement polling as fallback, idempotent processing |
| **Job queue crashes** | Use managed job service (AWS SQS), duplicate processing checks |
| **Interest calculation errors** | Comprehensive unit + integration tests, nightly reconciliation job |
| **Security vulnerabilities** | Pen testing week 11, OWASP review, code scanning in CI/CD |

### Organizational Risks

| Risk | Mitigation |
|------|-----------|
| **Key person dependency** | Document all decisions, pair programming, cross-training |
| **Scope creep** | Strict sprint scope, product manager enforces MVP boundaries |
| **Team burnout** | Realistic timelines, avoid 80+ hour weeks, manager check-ins |
| **External dependencies (Safaricom)** | USSD fallback prepared, frequent partner check-ins |

---

## DECISION POINTS & GO/NO-GO GATES

### Gate 1: End of Week 3 (Foundations)
**Decision:** Can we continue to Phase 2?

**Go Criteria:**
- [ ] All devs can run full stack locally (docker-compose up)
- [ ] Auth system works (register, login, JWT)
- [ ] Database schema validated, no critical issues
- [ ] Velocity on track (no major blockers)

**No-Go Criteria:**
- [ ] Critical architectural flaw discovered
- [ ] Database schema needs major redesign
- [ ] Team bandwidth insufficient

---

### Gate 2: End of Week 6 (M-Pesa Integration)
**Decision:** Can M-Pesa integration proceed?

**Go Criteria:**
- [ ] Safaricom API sandbox accessible
- [ ] Mock M-Pesa prompts working
- [ ] Webhook callbacks processed correctly
- [ ] No show-stopper bugs

**No-Go Criteria:**
- [ ] Safaricom API broken/unavailable
- [ ] Webhook security issues unresolvable
- [ ] Callback delays > 10 seconds (unacceptable)

---

### Gate 3: End of Week 10 (Feature Complete)
**Decision:** Ready for security testing & deployment?

**Go Criteria:**
- [ ] All core features implemented
- [ ] 80%+ test coverage
- [ ] No critical bugs in issue tracker
- [ ] Pilot partner ready to onboard

**No-Go Criteria:**
- [ ] Major features incomplete
- [ ] Critical security vulnerabilities
- [ ] Pilot partner not ready (causes launch delay)

---

### Gate 4: End of Week 11 (Security Clear)
**Decision:** Ready to deploy to production?

**Go Criteria:**
- [ ] Pen test: 0 critical vulnerabilities
- [ ] Load test: System handles 1,000 concurrent users
- [ ] All documentation complete
- [ ] Support team trained

**No-Go Criteria:**
- [ ] Critical security vulnerabilities found
- [ ] System fails load test
- [ ] Support team not ready

---

## POST-LAUNCH (Pilot Phase: Weeks 13-20)

After hard launch (Week 12), run 8-week pilot with SACCO:

| Week | Focus | Deliverable |
|------|-------|-------------|
| 13-15 | User onboarding, first loans created | 50 active users, 10+ loans |
| 16-17 | Interest & penalty calculations | Verify correctness, no disputes from math errors |
| 18-19 | Repayment triggers & automations | First repayments processed, triggers working |
| 20 | Pilot retrospective | Metrics summary, lessons learned, scale plan |

**By end of Week 20:**
- 500+ active users
- 100+ loans (at various stages)
- 80%+ on-time payment rate (target)
- < 5% dispute rate
- > 50 NPS score

---

## APPENDIX: DETAILED SPRINT STRUCTURE

### Sample Sprint: Sprint 2.1 (Loan Creation)

**Sprint Goal:** Borrowers can create loans, lenders can approve, agreements generated

**Story Points:** 34 (estimated)

**Daily Standup (Mon-Fri, 9:30 AM, 15 min):**
- What did I ship yesterday?
- What am I shipping today?
- Any blockers?

**Sprint Meetings:**
- **Monday 10 AM:** Sprint planning (2 hrs) - Finalize stories, estimate
- **Wednesday 4 PM:** Mid-sprint sync (30 min) - Check health
- **Friday 4 PM:** Sprint review (1 hr) - Demo to stakeholders
- **Friday 5 PM:** Sprint retro (1 hr) - What went well? What didn't?

**Acceptance Criteria Checklist:**
```
Story: "As borrower, I want to create loan request with all details"
- [ ] API accepts POST /api/v1/loans with validation
- [ ] Loan saved to database with correct status (pending_approval)
- [ ] Frontend form collects all required fields
- [ ] Form validates before submission (client + server)
- [ ] Success message shown to user
- [ ] Lender receives notification (SMS + in-app)

Story: "As lender, I want to review and approve loan"
- [ ] Lender sees notification with borrower info + ML score
- [ ] Dashboard shows pending approval loans
- [ ] Lender can click "Approve" button
- [ ] System sends M-Pesa prompt (mocked initially)
- [ ] Balance updated on approval
- [ ] Borrower notified of approval

Story: "As user, I want signed agreement PDF"
- [ ] Agreement PDF generated after approval
- [ ] PDF contains all loan terms
- [ ] PDF is downloadable by both parties
- [ ] PDF is stored immutably (hash verification)
- [ ] PDF is email-sendable
```

---

## COMMUNICATION PLAN

### Daily:
- Slack channel: #dev (quick questions, blockers)
- 9:30 AM standup (Zoom or in-person)

### Weekly:
- Friday 4 PM: Sprint review (demo working features)
- Friday 5 PM: Sprint retro (improve process)

### Bi-weekly:
- Monday: Stakeholder update (PMs, founders, pilot partner)
- Email: Status report (metrics, risks, next week focus)

### Monthly:
- Board meeting: Full update on progress, risks, budget burn

---

## CONCLUSION

This 12-week roadmap is **aggressive but achievable** with:
- Clear scope (MVP only, no nice-to-haves)
- Experienced team (3+ senior backend engineers)
- Reliable infrastructure (Docker, cloud, CI/CD)
- Regular checkpoints (4 go/no-go gates)

**Success is not guaranteed.** Risks include regulatory delays, Safaricom partnership challenges, and execution issues. However, with discipline and the mitigations outlined above, this timeline is realistic.

**Next Step:** Schedule kickoff meeting (Week 0) to align team on vision, architecture, and 12-week sprint plan.

---

**Document Prepared By:** Product + Engineering  
**Last Updated:** 03 February 2026  
**Approval:** CTO, Product Manager, Tech Lead (sign-off required before go-ahead)
