# PEER-TO-PEER DEBT MANAGEMENT SYSTEM
## Refined System Design Document v2.0

**Project:** Standalone P2P Debt Management Platform with M-Pesa Integration  
**Author:** System Architecture Team  
**Date:** 03 February 2026  
**Version:** 2.0 - Refined Concept  
**Status:** Design Phase

---

## EXECUTIVE SUMMARY

This document outlines a refined standalone **Peer-to-Peer Debt Management System** that operates independently from M-Pesa but leverages M-Pesa's user-initiated prompt and Fuliza features for seamless loan disbursement and automated repayment collection. 

**Core Innovation:** The system creates legally auditable loan agreements, automates repayments through M-Pesa Fuliza integration, and applies machine learning to assess borrower reliability in real-time. Users operate within a single unified dashboard that tracks all loans they've issued and debts they owe, with automatic daily interest calculations and comprehensive compliance features.

**Key Differentiator:** Unlike the previous concept, this system is completely **standalone and agnostic to M-Pesa's internal operations**—it only interfaces with M-Pesa at two critical touchpoints:
1. **Disbursement Prompt:** Loaner sends funds via M-Pesa user-initiated prompt
2. **Repayment Deduction:** System monitors debtor's incoming M-Pesa funds and automatically deducts repayments via configured Fuliza thresholds

---

## 1. PROBLEM STATEMENT & SOLUTION OVERVIEW

### 1.1 Problem

Kenya's informal lending ecosystem is characterized by:
- **High default rates** due to lack of structured enforcement mechanisms
- **Dispute chaos** from verbal-only agreements with no digital evidence
- **Trust deficit** in community lending due to unenforceable commitments
- **No formalized interest tracking** making repayment obligations unclear
- **Legal evidence gaps** preventing court admissibility of agreements
- **Lack of borrower reliability data** forcing lenders to make blind decisions

### 1.2 Solution Architecture

A **standalone, cloud-based platform** that:
1. **Formalizes loan agreements** with clause-by-clause consent and e-signatures
2. **Automates repayments** using M-Pesa Fuliza integration (no platform custody of funds)
3. **Generates court-admissible evidence** through timestamped agreement PDFs
4. **Applies ML scoring** to quantify borrower reliability in real-time
5. **Enforces penalties** for default through configurable interest rates and daily accrual
6. **Provides unified dashboard** showing all loans issued and debts owed by each user
7. **Enables real-time calculations** of interest, penalties, and outstanding balances

---

## 2. SYSTEM ARCHITECTURE

### 2.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE LAYER                        │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Web Portal (Desktop)    │  Mobile App (iOS/Android)         │  │
│  │  - User Dashboard        │  - USSD Integration              │  │
│  │  - Loan Management       │  - Feature Phone Support         │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    APPLICATION LOGIC LAYER                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  Loan Engine │  │ Agreement &  │  │  Trigger &   │              │
│  │  (Creation,  │  │  Consent     │  │  Repayment   │              │
│  │  Approval,   │  │  Management  │  │  Engine      │              │
│  │  Tracking)   │  │              │  │              │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Interest &   │  │    ML Risk   │  │ Notification │              │
│  │ Penalty      │  │   Scoring    │  │   Service    │              │
│  │ Calculator   │  │   Module     │  │              │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Dispute &    │  │ Compliance   │  │ Audit Log    │              │
│  │ Reversal     │  │ & KYC        │  │ Service      │              │
│  │ Management   │  │              │  │              │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    DATA PERSISTENCE LAYER                           │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Primary Database (PostgreSQL)                               │  │
│  │  - Users & Profiles    - Loans & Agreements                 │  │
│  │  - Transactions & Ledger  - Disputes & Evidence             │  │
│  │  - ML Scores & Features   - Audit Trail                     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Cache Layer (Redis)                                          │  │
│  │  - Real-time balance calculations  - User session data       │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Document Storage (S3/Cloud)                                 │  │
│  │  - Signed agreement PDFs  - Evidence attachments             │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│               EXTERNAL INTEGRATION LAYER                            │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  M-Pesa Gateway (Safaricom)                                  │  │
│  │  - User-Initiated Prompts API                                │  │
│  │  - Fuliza Deduction Integration                              │  │
│  │  - Transaction Callback Webhooks                             │  │
│  │  - SMS/USSD Gateway                                          │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  SMS Service Provider (Twilio/Safaricom)                     │  │
│  │  - Notification delivery  - USSD support                     │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Descriptions

| Component | Purpose | Responsibility |
|-----------|---------|-----------------|
| **Loan Engine** | Core loan lifecycle management | Create, approve, track, close loans |
| **Agreement & Consent** | Clause management & e-signatures | Store consent records, generate PDFs |
| **Trigger & Repayment Engine** | Monitor incoming funds, initiate deductions | Watch M-Pesa inflows, queue repayments |
| **Interest & Penalty Calculator** | Daily interest accrual and penalty computation | Real-time balance calculations |
| **ML Risk Scoring Module** | Borrower reliability assessment | Generate risk scores with explainability |
| **Notification Service** | User communications | SMS, email, in-app alerts |
| **Dispute Management** | User-initiated dispute handling | Log disputes, evidence capture, resolution |
| **Compliance & KYC** | Identity verification and AML | User verification, transaction monitoring |
| **Audit Log Service** | Immutable transaction records | Track all state changes with timestamps |

### 2.3 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLOUD INFRASTRUCTURE                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Load Balancer (SSL/TLS Termination)                 │  │
│  └────────────────────────┬─────────────────────────────┘  │
│                           │                                │
│     ┌─────────────────────┼─────────────────────────┐     │
│     │                     │                         │     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  API Pod 1   │  │  API Pod 2   │  │  API Pod N   │    │
│  │  (Node.js)   │  │  (Node.js)   │  │  (Node.js)   │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                           │                               │
│     ┌─────────────────────┼─────────────────────────┐     │
│     │                     │                         │     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ PostgreSQL   │  │   Redis      │  │  Document   │    │
│  │  Primary     │  │   Cache      │  │  Storage    │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                           │
│  ┌──────────────────────────────────────────────────┐    │
│  │  Background Job Queue (Bull/Celery)              │    │
│  │  - Trigger Engine  - Interest Calculator         │    │
│  │  - Notification Dispatcher  - PDF Generation     │    │
│  └──────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. CORE WORKFLOWS

### 3.1 Loan Initiation Workflow

```
DEBTOR INITIATES LOAN
       ↓
   [Dashboard: Tap "Borrow Loan"]
       ↓
   [Enter Loan Details]
   - Loan Amount (e.g., Ksh 5,000)
   - Loaner Phone Number
   - Desired Due Date
   - Interest Rate Choice (None / 1% daily / Custom %)
   - Grace Period (Optional)
       ↓
   [Review Terms & Conditions]
   - Clause 1: Automatic deduction on incoming M-Pesa funds
   - Clause 2: Interest accrual starting on disbursement date
   - Clause 3: Daily penalty rate (10% of principal if default)
   - Clause 4: Susceptible to lawsuit and fine if agreement broken
   - Clause 5: Dispute resolution process
   - Clause 6: Data privacy and consent
       ↓
   [Consent Mechanism]
   IF Smartphone:
      - Display each clause with checkbox
      - Debtor ticks each clause
      - Electronic signature capture (fingerprint / signature pad)
   ELSE (Feature Phone / USSD):
      - Display each clause via USSD menu
      - Press 1 to accept each clause
      - Final confirmation: Press 1 to submit
       ↓
   [Enter M-Pesa PIN]
   - Debtor authorizes prompt usage
   - Confirm and tap "Submit"
       ↓
   [System Actions]
   - Create Agreement record in DB
   - Generate Agreement PDF (with timestamps, device metadata)
   - Calculate ML Risk Score for debtor
   - Queue notification: SMS to loaner with loan details + ML score
   - Create pending loan record (status: "awaiting_lender_approval")
       ↓
   [RESPONSE: Confirmation Message]
   SMS to Debtor: "Loan request LN-12345 sent to 07XXXXXXXX. We will notify you when they respond."
```

### 3.2 Lender Approval Workflow

```
LENDER RECEIVES PROMPT
       ↓
   [SMS/In-App Notification]
   "Loan Request LN-12345: Debtor 07XXXXXXXX requests Ksh 5,000.
    ML Risk Score: MEDIUM (0.65). View in app to approve."
       ↓
   [Lender Views Loan Details in Dashboard]
   - Borrower name and phone
   - Loan amount: Ksh 5,000
   - Due date: 2026-03-15
   - Interest rate: 1% per day
   - ML Risk Score: MEDIUM with top 3 factors
   - Agreement summary
       ↓
   [Lender Decision]
   - If Accept: Tap "Approve & Send Funds"
   - If Decline: Tap "Decline" (optional reason)
       ↓
   [IF DECLINED]
   → SMS to Debtor: "Your loan request LN-12345 was declined."
   → Loan status: "declined"
   → Debtor can retry with different loaner
       ↓
   [IF APPROVED]
   [Lender Enters M-Pesa PIN & Confirms]
       ↓
   [System Initiates M-Pesa Prompt to Lender]
   - Type: "Disbursement"
   - Amount: Ksh 5,000
   - Recipient: Debtor's phone (07XXXXXXXX)
   - Reference: LN-12345
       ↓
   [Lender Confirms on M-Pesa Device]
   - Receives M-Pesa prompt notification
   - Enters M-Pesa PIN on device
   - Transaction initiates (M-Pesa ref: e.g., M-PESA-TRX-001)
       ↓
   [System Receives M-Pesa Callback]
   - Transaction successful
   - Status: "completed"
   - Amount confirmed: Ksh 5,000
       ↓
   [System Actions on Disbursement]
   - Update loan status: "active"
   - Initialize loan balance: Ksh 5,000
   - Start interest accrual: Day 1 @ 1% per day
   - Set repayment trigger date: 2026-03-15
   - Store transaction reference: M-PESA-TRX-001
   - Log event in immutable audit trail
       ↓
   [Notifications Sent]
   - SMS to Debtor: "Ksh 5,000 loan approved and transferred from 07YYYYYYYY. 
                      Loan ID: LN-12345. Balance: Ksh 5,000. 
                      Due: 2026-03-15. Interest: 1% daily."
   - SMS to Lender: "You have disbursed Ksh 5,000 to 07XXXXXXXX. 
                      Loan ID: LN-12345."
       ↓
   [Dashboard Updates for Both Parties]
   - Debtor sees: "You owe Ksh 5,000 + Ksh 50 (interest accrued today)"
   - Lender sees: "You have loaned Ksh 5,000. Expected return: Ksh 5,050 (+ daily interest)"
```

### 3.3 Repayment & Interest Accrual Workflow

```
DAILY INTEREST ACCRUAL (Automated Job, runs at 00:01 UTC)
       ↓
   [For Each Active Loan]
   - Calculate daily interest: Principal × Interest Rate % ÷ 365
     (Example: Ksh 5,000 × 1% = Ksh 50 per day)
   - Add to Outstanding Balance
   - Update loan record: balance = principal + accrued_interest
   - Log transaction in ledger
       ↓
   [Dashboard Real-Time Updates]
   - Debtor dashboard: "Outstanding: Ksh 5,050 (Ksh 50 interest accrued today)"
   - Lender dashboard: "Loan value: Ksh 5,050 (Ksh 50 earned today)"
       ↓
   [Notification Check]
   - If interest > threshold, send reminder SMS
   - Display on in-app notifications
       ↓

AUTOMATED REPAYMENT TRIGGER (When Incoming M-Pesa Detected)
       ↓
   [Debtor Receives M-Pesa Funds from Any Source]
   - Example: Ksh 2,000 salary deposit
       ↓
   [System Continuously Monitors M-Pesa Account (via Fuliza Integration)]
   - Detects incoming: Ksh 2,000
   - Checks for active loan triggers
       ↓
   [Trigger Engine Evaluation]
   - Incoming amount: Ksh 2,000
   - Configured threshold: Ksh 100 (min transaction to trigger)
   - Check if due date has passed: YES
   - Check balance owed: Ksh 5,050
   - Check repayment method: "Fixed Amount" Ksh 400 OR "Percentage" 20% = Ksh 400
       ↓
   [Decision: Trigger Repayment]
   - Repayment amount: Ksh 400 (OR 20% = Ksh 400)
   - Remaining balance after: Ksh 4,650
   - Auto-deduction method: Fuliza-enabled prompt
       ↓
   [System Initiates M-Pesa Repayment Prompt to Debtor]
   - Notification: "Ksh 400 repayment due for Loan LN-12345 to 07YYYYYYYY. 
                    Confirm with M-Pesa PIN to complete transfer."
   - Debtor receives prompt on device
   - Debtor enters M-Pesa PIN to confirm
       ↓
   [M-Pesa Callback Received]
   - Transaction successful
   - M-Pesa Ref: M-PESA-TRX-002
   - Amount: Ksh 400
       ↓
   [System Updates Ledger]
   - Create transaction record:
     * Loan ID: LN-12345
     * Type: "repayment"
     * Amount: Ksh 400
     * M-Pesa Reference: M-PESA-TRX-002
     * Timestamp: 2026-03-10 14:35:22 UTC
   - Reduce balance: Ksh 5,050 - Ksh 400 = Ksh 4,650
   - Remaining balance: Ksh 4,650 + tomorrow's interest
       ↓
   [Notifications Sent]
   - SMS to Debtor: "Ksh 400 repayment processed for Loan LN-12345. 
                     Balance: Ksh 4,650. Due: 2026-03-15. Ref: M-PESA-TRX-002"
   - SMS to Lender: "Ksh 400 received from 07XXXXXXXX for Loan LN-12345. 
                     Remaining: Ksh 4,650. Ref: M-PESA-TRX-002"
       ↓
   [Dashboard Updated]
   - Both parties see transaction in ledger
   - Real-time balance updates
   - Interest calculations reflect new principal
       ↓

MISSED PAYMENT & PENALTY APPLICATION (Due date + Grace period elapsed)
       ↓
   [Grace Period Expires - Automated Job Runs]
   - Due date: 2026-03-15
   - Grace period: 7 days (configured)
   - Check date: 2026-03-23
   - Outstanding balance: Ksh 4,650
       ↓
   [Penalty Application]
   - Penalty type: Daily compound rate
   - Penalty rate: 10% of original principal per day
   - Daily penalty: Ksh 5,000 × 10% = Ksh 500 per day
   - Days since grace expired: 2 days
   - Penalty accrued: Ksh 500 × 2 = Ksh 1,000
   - NEW TOTAL: Ksh 4,650 + Ksh 1,000 = Ksh 5,650
       ↓
   [Penalty Caps Check]
   - Max penalty allowed: 50% of original principal = Ksh 2,500
   - Current penalty: Ksh 1,000 (OK, under cap)
   - Update balance: Ksh 5,650
       ↓
   [Notifications Sent - RED ALERT]
   - SMS to Debtor: "⚠️ ALERT: Loan LN-12345 overdue. 
                     Penalty Ksh 1,000 applied. 
                     New balance: Ksh 5,650. 
                     Legal action may be initiated if not paid by 2026-03-30."
   - SMS to Lender: "Loan LN-12345 now overdue. Debtor: 07XXXXXXXX. 
                     Penalties accrued: Ksh 1,000. 
                     Contact system admin if legal action required."
       ↓
   [Dashboard Flags Loan]
   - Red indicator on debtor's dashboard
   - Overdue status visible to lender
   - Penalty breakdown shown in ledger
```

### 3.4 Loan Closure Workflow

```
LOAN FULLY PAID OFF
       ↓
   [Balance Reaches Zero via Repayments]
   - Previous balance: Ksh 400
   - Incoming repayment: Ksh 400
   - New balance: Ksh 0
       ↓
   [System Actions]
   - Update loan status: "closed"
   - Mark closure date and time
   - Generate Final Receipt PDF
   - Generate Signed Agreement PDF with all transactions
   - Store documents in cloud storage
       ↓
   [Notifications Sent]
   - SMS to Debtor: "🎉 Congratulations! Loan LN-12345 fully repaid. 
                     Total paid: Ksh 5,500 (Principal + Interest). 
                     Download receipt in app."
   - SMS to Lender: "Loan LN-12345 fully repaid by 07XXXXXXXX. 
                     Total received: Ksh 5,500. Download receipt in app."
       ↓
   [Dashboard Updates]
   - Remove from active loans list
   - Archive to "Closed Loans" section
   - Both parties can download:
     * Signed agreement PDF
     * Transaction ledger
     * Receipt with all details
       ↓
   [ML Scoring Update]
   - Debtor's payment history: "On-time repayment"
   - Increase debtor's reliability score
   - Next loaner will see improved score
       ↓
```

### 3.5 Dispute & Reversal Workflow

```
USER INITIATES DISPUTE
       ↓
   [Dispute Types]
   - Erroneous deduction
   - System error
   - Unauthorized transaction
   - Transaction not received
   - Disputed interest calculation
       ↓
   [User Submits Dispute via Dashboard]
   - Select transaction to dispute
   - Select dispute reason
   - Upload evidence (screenshots, M-Pesa confirmation, etc.)
   - Optional: Free text explanation
   - Tap "Submit Dispute"
       ↓
   [System Actions]
   - Generate Dispute ID: D-98765
   - Timestamp dispute submission
   - Lock affected ledger entries (prevents further auto-deductions)
   - Notify operations team
   - Log all evidence
       ↓
   [SMS Acknowledgment to User]
   "Dispute D-98765 received. We will investigate within 24 hours. 
    No further deductions will be made until resolved."
       ↓
   [Operations Team Review (Manual)]
   - Admin opens dispute detail page
   - Views transaction details
   - Reviews evidence provided
   - Checks M-Pesa transaction logs
   - Verifies agreement terms
       ↓
   [Resolution Decision]
   ┌─────────────────────────────────────────────────┐
   │ Option 1: UPHOLD DISPUTE (Reversal)             │
   │ - Transaction was erroneous                      │
   │ - Action: Reverse transaction                    │
   │ - Refund: Ksh 400 + interest                     │
   │ - Mark loan balance as updated                   │
   │ - Notify both parties                            │
   │                                                  │
   │ Option 2: DENY DISPUTE (Upheld Transaction)     │
   │ - Transaction was valid                         │
   │ - Action: Explain decision to user              │
   │ - Provide detailed reasoning                    │
   │ - Offer escalation to higher authority          │
   │                                                  │
   │ Option 3: PARTIAL REVERSAL                      │
   │ - Partial error detected                        │
   │ - Action: Reverse Ksh 200, keep Ksh 200        │
   │ - Adjust balance accordingly                    │
   └─────────────────────────────────────────────────┘
       ↓
   [IF REVERSAL APPROVED]
   - Admin confirms reversal in system
   - System initiates M-Pesa reversal to debtor's account
   - Update loan balance
   - Log reversal transaction with justification
   - Send SMS to both parties:
     Debtor: "Dispute D-98765 approved. Ksh 400 reversed to your M-Pesa. 
              Balance adjusted to Ksh 4,250."
     Lender: "Transaction reversed for Loan LN-12345. 
              Ksh 400 deducted from your account. Dispute D-98765."
       ↓
   [IF REVERSAL DENIED]
   - Admin sends explanation email/SMS to debtor
   - Provide appeal process instructions
   - Unlock ledger entries
   - Close dispute with detailed explanation
       ↓
   [SLA & Escalation]
   - Initial response: 24 hours
   - Full resolution: 7 business days
   - If not resolved in 7 days: Auto-escalate to management
   - If still unresolved: Option to dispute with regulatory authority
       ↓
```

---

## 4. USER DASHBOARD & INTERFACE

### 4.1 Unified User Dashboard Features

The dashboard serves both loaners and borrowers. Users may hold multiple roles simultaneously.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER DASHBOARD                               │
├─────────────────────────────────────────────────────────────────────┤
│  [User Name] | Reliability Score: 0.82 (MEDIUM) | Logout             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  QUICK STATS                                                 │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌────────────┐   │  │
│  │  │ You OWE         │  │ You HAVE LOANED │  │ Total Due  │   │  │
│  │  │ Ksh 4,650       │  │ Ksh 15,000      │  │ 2026-03-15 │   │  │
│  │  │ (2 active)      │  │ (3 active)      │  │            │   │  │
│  │  └─────────────────┘  └─────────────────┘  └────────────┘   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  [🔴 NEW REQUEST] [📋 Request Loan] [📤 View Activity]        │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  LOANS YOU OWE (Active Debts)                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─ LOAN 1: LN-12345 ───────────────────────────────────────────┐  │
│  │ Lender: John Doe (07YYYYYYYY)                                │  │
│  │ Principal: Ksh 5,000 | Interest: 1% daily                    │  │
│  │ Balance: Ksh 4,650 | Interest Accrued Today: Ksh 50          │  │
│  │ Due Date: 2026-03-15 | Status: ⚠️ DUE IN 5 DAYS             │  │
│  │ Repayment Method: Fixed Ksh 400 when funds arrive            │  │
│  │                                                                │  │
│  │ [View Agreement] [Dispute] [View Ledger] [Pay Now]           │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ LOAN 2: LN-12346 ───────────────────────────────────────────┐  │
│  │ Lender: Jane Smith (07ZZZZZZZZ)                              │  │
│  │ Principal: Ksh 3,000 | Interest: 2% daily                    │  │
│  │ Balance: Ksh 3,120 | Interest Accrued Today: Ksh 60          │  │
│  │ Due Date: 2026-04-20 | Status: ✅ ON TRACK                  │  │
│  │ Repayment Method: 20% of incoming funds                      │  │
│  │                                                                │  │
│  │ [View Agreement] [Dispute] [View Ledger] [Pay Now]           │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  LOANS YOU'VE ISSUED (Money Lent Out)                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─ LOAN 1: LN-12347 ───────────────────────────────────────────┐  │
│  │ Borrower: Alice Mwangi (07XXXXXXXX) | Risk: 🟡 MEDIUM        │  │
│  │ Principal: Ksh 5,000 | Interest: 1% daily                    │  │
│  │ Balance Owed: Ksh 4,650 | Interest Earned: Ksh 50            │  │
│  │ Due Date: 2026-03-15 | Status: ⚠️ TRACKING                  │  │
│  │ Last Payment: Ksh 400 (2 days ago)                           │  │
│  │                                                                │  │
│  │ [View Agreement] [View Ledger] [View Evidence] [Escalate]    │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ LOAN 2: LN-12348 ───────────────────────────────────────────┐  │
│  │ Borrower: Bob Kipchoge (07WWWWWWWW) | Risk: 🟢 LOW          │  │
│  │ Principal: Ksh 10,000 | Interest: 0.5% daily                 │  │
│  │ Balance Owed: Ksh 10,000 | Interest Earned: Ksh 0 (Day 1)   │  │
│  │ Due Date: 2026-05-01 | Status: ✅ ACTIVE                    │  │
│  │ Last Payment: None yet (Disbursed today)                     │  │
│  │                                                                │  │
│  │ [View Agreement] [View Ledger] [View Evidence]               │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  PENDING REQUESTS                                                   │
├─────────────────────────────────────────────────────────────────────┤
│  No pending requests at this time.                                  │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  RECENT ACTIVITY                                                    │
├─────────────────────────────────────────────────────────────────────┤
│  2026-03-10 14:35 | Repayment Processed | LN-12345 | Ksh 400       │
│  2026-03-10 08:22 | Interest Accrued | LN-12345 | Ksh 50           │
│  2026-03-09 12:45 | Dispute D-98765 Resolved | LN-12345 | Reversed │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 "Request Loan" Flow (Mobile/Web)

**Screen 1: Loan Details**
```
[Back Button] REQUEST A LOAN

Loan Amount *
[________] Ksh

Lender's Phone *
[__________________] (07XXXXXXXX format)

Due Date *
[Picker: 2026-03-15]

Interest Rate *
○ No Interest (0%)
○ 1% Daily (Default)
○ 2% Daily
○ Custom: [_____]%

Grace Period (Days) *
[_____] days (default: 7)

[NEXT] [CANCEL]
```

**Screen 2: Review Terms & Conditions**
```
[Back Button] TERMS & CONDITIONS

Read each term carefully and tick the checkbox.
Disagreeing means your loan request will NOT be sent.

☐ Clause 1: Automatic Repayment Deduction
   "I understand that any money I receive via M-Pesa 
    will be automatically deducted for loan repayment 
    once the due date arrives and my balance is outstanding."

☐ Clause 2: Interest Accrual
   "I agree that interest will accrue daily at the rate 
    I selected (1% per day = Ksh 50/day) starting from 
    the date the funds are disbursed."

☐ Clause 3: Penalty for Default
   "I acknowledge that if I fail to pay by the due date 
    plus grace period, a daily penalty of 10% of the 
    principal (Ksh 500/day) will be applied, capped at 
    50% of the principal amount."

☐ Clause 4: Legal Consequences
   "I understand that the lender may initiate legal 
    proceedings if I breach this agreement, and I may 
    be liable for court costs and additional fines."

☐ Clause 5: Dispute Resolution
   "I have read the dispute resolution policy and 
    understand I can contest any transaction within 
    30 days with evidence."

☐ Clause 6: Data Privacy & Consent
   "I consent to this agreement being stored digitally, 
    shared with the lender, and used as evidence in 
    any legal proceeding. I have read the privacy policy."

ALL CLAUSES MUST BE TICKED TO PROCEED
⚠️ 5 clauses remaining

[NEXT STEP - SIGN]
```

**Screen 3: Electronic Signature**
```
[Back Button] SIGNATURE & SUBMISSION

LOAN SUMMARY
Amount: Ksh 5,000
Lender: 07YYYYYYYY
Due: 2026-03-15
Interest: 1% daily
Penalties: 10% daily (max 50%)

SIGN BELOW:
[Signature Pad Area]
[CLEAR SIGNATURE] [SIGN]

--- OR (for feature phones) ---

Accept all terms by tapping CONFIRM:
[CONFIRM]

PAYMENT METHOD:
The system requires M-Pesa authorization to process
automatic repayment deductions.

[ENTER M-PESA PIN]
[____]

[SUBMIT LOAN REQUEST] [CANCEL]
```

### 4.3 Agreement Viewing Screen

```
┌─────────────────────────────────────────────────────────────┐
│  LOAN AGREEMENT LN-12345                                   │
├─────────────────────────────────────────────────────────────┤
│  [Download PDF] [Share] [Dispute] [Back]                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  PEER-TO-PEER LOAN AGREEMENT                              │
│  Agreement ID: LN-12345                                   │
│  Executed: 2026-03-01 14:22:30 UTC                        │
│  Device: iPhone 12 | IP: 192.168.1.100                   │
│                                                             │
│  PARTIES                                                   │
│  Lender: John Doe | Phone: 07YYYYYYYY | ID: U-2           │
│  Borrower: Alice Mwangi | Phone: 07XXXXXXXX | ID: U-1     │
│                                                             │
│  LOAN TERMS                                               │
│  Principal: KES 5,000.00                                 │
│  Interest Rate: 1.0% per day                             │
│  Repayment Method: Fixed amount KES 400 per trigger      │
│  Trigger Threshold: KES 100 (min incoming M-Pesa)        │
│  Disbursement Date: 2026-03-01                           │
│  First Repayment Due: 2026-03-15                         │
│  Grace Period: 7 days                                    │
│  Late Payment Penalty: 10% of principal per day          │
│  Penalty Cap: 50% of principal (KES 2,500)               │
│                                                             │
│  CLAUSES & CONSENT RECORD                                │
│                                                             │
│  1. AUTOMATIC REPAYMENT DEDUCTION                        │
│     "The borrower authorizes automatic deductions        │
│      from incoming M-Pesa funds for loan repayment."    │
│     Consent: ✅ YES | Timestamp: 2026-03-01 14:20:00    │
│                                                             │
│  2. INTEREST ACCRUAL                                     │
│     "Interest accrues daily at the agreed rate."        │
│     Consent: ✅ YES | Timestamp: 2026-03-01 14:20:15    │
│                                                             │
│  [View more clauses...scroll]                           │
│                                                             │
│  SIGNATURES & AUTHORIZATION                              │
│  Borrower: Alice Mwangi                                 │
│  Digital Signature: [ENC-SIG-001] | 2026-03-01 14:22:30 │
│  Fingerprint: ✅ Verified                               │
│                                                             │
│  Lender: John Doe                                        │
│  Digital Signature: [ENC-SIG-002] | 2026-03-01 14:25:00 │
│  Fingerprint: ✅ Verified                               │
│                                                             │
│  M-PESA AUTHORIZATION                                    │
│  Borrower M-Pesa PIN authorization: ✅ Confirmed        │
│  Lender M-Pesa PIN authorization: ✅ Confirmed          │
│                                                             │
│  TRANSACTION EVIDENCE                                    │
│  Disbursement: M-PESA-TRX-001 | KES 5,000 | 2026-03-01 │
│  Status: Completed ✅                                    │
│                                                             │
│  REPAYMENTS                                              │
│  1. KES 400 | M-PESA-TRX-002 | 2026-03-10 14:35:22      │
│  2. KES 400 | M-PESA-TRX-003 | 2026-03-11 09:12:45      │
│                                                             │
│  DISPUTES & REVERSALS                                    │
│  D-98765 | Submitted: 2026-03-09 | Status: Resolved     │
│  Reversal Amount: KES 0 | Outcome: Denied (Valid TX)    │
│                                                             │
│  LEGAL NOTICE                                            │
│  This agreement is governed by the laws of Kenya.        │
│  Both parties acknowledge that this digital record       │
│  is legally binding and admissible as evidence in        │
│  court proceedings. For disputes, contact our support   │
│  team or file through our dispute resolution system.     │
│                                                             │
│  Support: support@debtmgmt.app | +254 7XX XXX XXX       │
│  Certificate of Authenticity: [CERT-12345-XXXXX]        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. ML RISK SCORING MODULE

### 5.1 Scoring Model

**Purpose:** Quantify borrower reliability for lenders to make informed decisions.

**Model Type:** Gradient Boosted Trees (XGBoost) with SHAP explainability

### 5.2 Input Features

| Feature | Description | Data Source |
|---------|-------------|-------------|
| **Payment History** | % of on-time repayments (last 6 months) | Ledger |
| **Loan Frequency** | Number of loans taken in last 6 months | Loans table |
| **Loan Completion Rate** | % of loans fully repaid vs defaulted | Loans table |
| **Average Loan Duration** | Avg time to repay loans | Transactions |
| **Default Count** | Number of past defaults (penalties incurred) | Disputes/Ledger |
| **Dispute Rate** | % of transactions disputed | Disputes table |
| **Average Outstanding Balance** | Avg balance owed across active loans | Loans |
| **Tenure** | Time as platform member (days) | Users.created_at |
| **Transaction Velocity** | Frequency of M-Pesa transactions (proxy for cash flow) | External: M-Pesa integration |
| **Account Age** | Days since registration | Users.created_at |

### 5.3 Scoring Output

```
{
  "score": 0.72,                    // 0.0-1.0 scale
  "risk_band": "MEDIUM",            // LOW, MEDIUM, HIGH
  "percentile": 65,                 // 65th percentile among all users
  "confidence": 0.91,               // Model confidence (0.0-1.0)
  "top_factors": [
    {
      "factor": "Payment History",
      "impact": 0.35,               // Relative impact on score
      "value": 0.95,                // User's value for this factor (95% on-time)
      "direction": "positive"
    },
    {
      "factor": "Loan Completion Rate",
      "impact": 0.28,
      "value": 0.88,
      "direction": "positive"
    },
    {
      "factor": "Default Count",
      "impact": -0.15,
      "value": 2,                   // 2 defaults in history
      "direction": "negative"
    }
  ],
  "risk_flags": [
    "No repayment history yet (new user)",
    "Low transaction frequency detected"
  ],
  "recommendation": "PROCEED WITH CAUTION",
  "generated_at": "2026-03-10T10:30:00Z",
  "valid_until": "2026-03-17T10:30:00Z" // 7-day validity
}
```

### 5.4 Lender Prompt Display

When a lender receives a loan request, they see:

```
LOAN REQUEST from ALICE MWANGI
Amount: KES 5,000
Due: 2026-03-15

BORROWER RELIABILITY SCORE: 🟡 MEDIUM (0.72)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Percentile: 65th (Better than 65% of users)
Confidence: 91% (Model is quite confident)

TOP FACTORS INFLUENCING THIS SCORE:
1. ✅ Payment History: 95% on-time (Strong positive)
2. ✅ Loan Completion: 88% loans fully repaid (Strong positive)
3. ⚠️ Past Defaults: 2 defaults in history (Slight concern)

RISK FLAGS:
• No repayment activity yet on new loans
• Low M-Pesa transaction frequency (< 3 tx/week)

RECOMMENDATION: PROCEED WITH CAUTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This score is ADVISORY ONLY and should not be your sole
decision-making criterion. Consider:
- Your personal relationship with the borrower
- Their employment stability
- The loan purpose and amount
- Your risk tolerance

[I UNDERSTAND] [DECLINE] [APPROVE & SEND FUNDS]
```

### 5.5 Model Training & Retraining

- **Initial Training:** Upon MVP launch with historical synthetic data + early user data
- **Retraining Schedule:** Monthly during pilot, quarterly in production
- **Data Sources:** Ledger transactions, disputes, loan outcomes
- **Bias Monitoring:** Monthly fairness audits (demographic parity, equalized odds)
- **Explainability:** SHAP values logged for every prediction for auditability

---

## 6. PENALTY & INTEREST RULES

### 6.1 Interest Rate Options

Users can select from preset or custom rates:

| Option | Rate | Daily Accrual | Monthly (30 days) |
|--------|------|---------------|-------------------|
| **No Interest** | 0% | KES 0 | KES 0 |
| **Low (Conservative)** | 0.5%/day | KES 25 (on KES 5k) | KES 750 |
| **Standard** | 1%/day | KES 50 (on KES 5k) | KES 1,500 |
| **High (Risky)** | 2%/day | KES 100 (on KES 5k) | KES 3,000 |
| **Custom** | User-defined | Varies | Varies |

### 6.2 Penalty Rules

```
PENALTY APPLICATION LOGIC

IF (due_date + grace_period) < current_date AND balance > 0:

  days_overdue = current_date - (due_date + grace_period)
  
  penalty_daily = principal_amount × 10% // KES 500 on KES 5,000
  
  penalty_accrued = penalty_daily × days_overdue
  
  penalty_capped = MIN(penalty_accrued, principal_amount × 50%)
  
  new_balance = outstanding_balance + penalty_capped
  
  // Notify debtor & lender
  // Log penalty application in ledger
  // Update dashboard in real-time
```

**Example Penalty Accrual:**
```
Principal: KES 5,000
Due Date: 2026-03-15
Grace Period: 7 days (expires 2026-03-22)

Day 1 (2026-03-23): Penalty = KES 500 | Total = KES 5,000 + KES 500 = KES 5,500
Day 2 (2026-03-24): Penalty = KES 500 | Total = KES 5,500 + KES 500 = KES 6,000
Day 3 (2026-03-25): Penalty = KES 500 | Total = KES 6,000 + KES 500 = KES 6,500
...
Day 5 (2026-03-27): Penalty = KES 500 | Total = KES 7,500
Day 6 (2026-03-28): MAX PENALTY REACHED (50% of KES 5,000 = KES 2,500)
                     Total = KES 5,000 + KES 2,500 = KES 7,500 (capped)

From Day 6 onwards, penalty stays at KES 7,500 even if still unpaid.
```

### 6.3 Legal Compliance

- **Interest Rates:** Compliant with Central Bank of Kenya guidelines (verified by legal counsel)
- **Penalty Caps:** Conservative 50% cap aligns with consumer protection standards
- **Grace Periods:** Minimum 7 days allows for payment processing delays
- **Transparency:** All terms displayed in agreement before execution
- **Opt-out:** Interest-free option available for conservative users

---

## 7. DATABASE SCHEMA

### 7.1 Core Tables

```sql
-- USERS TABLE
CREATE TABLE users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(15) UNIQUE NOT NULL,
  email VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  kyc_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
  kyc_verified_date TIMESTAMP,
  national_id VARCHAR(20) UNIQUE,
  profile_complete BOOLEAN DEFAULT FALSE
);

-- PROFILES TABLE
CREATE TABLE profiles (
  profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
  date_of_birth DATE,
  occupation VARCHAR(100),
  employer VARCHAR(100),
  monthly_income_range VARCHAR(50),
  bio TEXT,
  profile_photo_url TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- LOANS TABLE
CREATE TABLE loans (
  loan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  borrower_id UUID NOT NULL REFERENCES users(user_id),
  lender_id UUID NOT NULL REFERENCES users(user_id),
  principal DECIMAL(12, 2) NOT NULL,
  current_balance DECIMAL(12, 2) NOT NULL, -- includes interest & penalties
  interest_rate DECIMAL(5, 2) NOT NULL,    -- % per day (e.g., 1.00)
  interest_type ENUM('daily', 'fixed') DEFAULT 'daily',
  penalty_daily_rate DECIMAL(5, 2) DEFAULT 10.00,
  penalty_cap_percent DECIMAL(5, 2) DEFAULT 50.00,
  grace_period_days INT DEFAULT 7,
  repayment_method ENUM('fixed_amount', 'percentage_incoming', 'one_time') NOT NULL,
  repayment_amount DECIMAL(12, 2),         -- for fixed_amount method
  repayment_percentage DECIMAL(5, 2),      -- for percentage_incoming method
  trigger_threshold DECIMAL(12, 2) DEFAULT 100, -- min incoming M-Pesa to trigger
  disbursement_date TIMESTAMP NOT NULL,
  due_date DATE NOT NULL,
  first_repayment_date DATE,
  status ENUM('pending_approval', 'active', 'closed', 'defaulted', 'declined') DEFAULT 'pending_approval',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_date TIMESTAMP,
  notes TEXT
);

-- AGREEMENTS TABLE
CREATE TABLE agreements (
  agreement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID UNIQUE NOT NULL REFERENCES loans(loan_id) ON DELETE CASCADE,
  agreement_text TEXT NOT NULL, -- Full agreement in plain text
  clauses JSONB NOT NULL,       -- Array of clause objects
  borrower_consent_timestamps JSONB NOT NULL, -- {clause_1: timestamp, ...}
  lender_consent_timestamps JSONB NOT NULL,
  borrower_signature_metadata JSONB, -- {type: 'digital', method: 'fingerprint', timestamp, ...}
  lender_signature_metadata JSONB,
  borrower_signed_at TIMESTAMP,
  lender_signed_at TIMESTAMP,
  agreement_pdf_url TEXT,       -- S3/Cloud storage path
  agreement_pdf_hash VARCHAR(64), -- SHA-256 for integrity verification
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TRANSACTIONS TABLE (Ledger)
CREATE TABLE transactions (
  transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES loans(loan_id) ON DELETE CASCADE,
  type ENUM('disbursement', 'repayment', 'interest_accrual', 'penalty_accrual', 'reversal') NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  previous_balance DECIMAL(12, 2),  -- Balance before this transaction
  new_balance DECIMAL(12, 2),       -- Balance after this transaction
  mpesa_reference VARCHAR(50),      -- M-Pesa transaction reference
  mpesa_status ENUM('pending', 'completed', 'failed', 'reversed') DEFAULT 'pending',
  triggered_by_incoming_amount DECIMAL(12, 2), -- If repayment, what incoming amount triggered it?
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB -- Additional info (device info, IP, etc.)
);

-- DISPUTES TABLE
CREATE TABLE disputes (
  dispute_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(transaction_id),
  loan_id UUID NOT NULL REFERENCES loans(loan_id),
  initiated_by_user_id UUID NOT NULL REFERENCES users(user_id),
  dispute_type ENUM('erroneous_deduction', 'system_error', 'unauthorized', 'not_received', 'interest_calculation_error') NOT NULL,
  description TEXT NOT NULL,
  evidence_attachments JSONB, -- Array of {url, type, uploaded_at}
  status ENUM('open', 'under_review', 'resolved_upheld', 'resolved_denied', 'resolved_partial') DEFAULT 'open',
  resolution_notes TEXT,
  resolved_by_admin_id UUID REFERENCES users(user_id),
  reversal_amount DECIMAL(12, 2), -- Amount to be reversed if upheld
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sla_due_date TIMESTAMP -- 7 business days from creation
);

-- ML SCORES TABLE
CREATE TABLE ml_scores (
  score_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  score_value DECIMAL(3, 2) NOT NULL, -- 0.0 to 1.0
  risk_band ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL,
  percentile INT,                      -- 1-100
  confidence DECIMAL(3, 2),            -- 0.0 to 1.0
  top_factors JSONB NOT NULL,          -- Array of {factor, impact, value, direction}
  risk_flags JSONB,                    -- Array of risk flag strings
  recommendation VARCHAR(50),          -- PROCEED / PROCEED_WITH_CAUTION / DECLINE
  model_version VARCHAR(20),           -- e.g., "v2.1"
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  valid_until TIMESTAMP                -- Score expiration (e.g., 7 days)
);

-- NOTIFICATIONS TABLE
CREATE TABLE notifications (
  notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  type ENUM('loan_request', 'loan_approved', 'repayment_prompt', 'repayment_completed', 'penalty_applied', 'dispute_received', 'dispute_resolved', 'interest_accrual', 'loan_closed') NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  related_loan_id UUID REFERENCES loans(loan_id),
  related_transaction_id UUID REFERENCES transactions(transaction_id),
  sms_sent BOOLEAN DEFAULT FALSE,
  email_sent BOOLEAN DEFAULT FALSE,
  in_app_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP
);

-- AUDIT LOG TABLE
CREATE TABLE audit_logs (
  audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(100) NOT NULL,         -- e.g., 'loan_created', 'repayment_processed'
  entity_type VARCHAR(50),              -- 'loan', 'transaction', 'dispute'
  entity_id UUID,
  user_id UUID REFERENCES users(user_id),
  old_values JSONB,                     -- Previous state
  new_values JSONB,                     -- New state
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  action_timestamp TIMESTAMP
);
```

---

## 8. API SPECIFICATIONS

### 8.1 Authentication

```
POST /api/v1/auth/register
Request:
{
  "phone_number": "07XXXXXXXX",
  "email": "user@example.com",
  "password": "hashed_password_from_client",
  "first_name": "Alice",
  "last_name": "Mwangi"
}

Response: 201 Created
{
  "user_id": "U-abc123",
  "token": "JWT_TOKEN_HERE",
  "refresh_token": "REFRESH_TOKEN",
  "expires_in": 3600
}
```

### 8.2 Loan Endpoints

```
POST /api/v1/loans
Create loan request

Request:
{
  "borrower_id": "U-abc123",
  "lender_phone": "07YYYYYYYY",
  "principal": 5000,
  "interest_rate": 1.0,           // % per day
  "repayment_method": "fixed_amount",
  "repayment_amount": 400,
  "trigger_threshold": 100,
  "due_date": "2026-03-15",
  "grace_period_days": 7,
  "penalty_daily_rate": 10,
  "penalty_cap_percent": 50
}

Response: 201 Created
{
  "loan_id": "LN-12345",
  "status": "pending_approval",
  "created_at": "2026-03-01T14:22:00Z"
}

---

POST /api/v1/loans/{loan_id}/approve
Lender approves and initiates disbursement

Request:
{
  "lender_id": "U-def456",
  "mpesa_authorization": true  // M-Pesa PIN provided on device
}

Response: 200 OK
{
  "loan_id": "LN-12345",
  "status": "prompt_sent",
  "prompt_id": "P-98765",
  "expected_disbursement_date": "2026-03-01"
}

---

GET /api/v1/loans/{loan_id}
Retrieve full loan details

Response: 200 OK
{
  "loan_id": "LN-12345",
  "borrower": {...},
  "lender": {...},
  "principal": 5000,
  "current_balance": 4650,
  "interest_rate": 1.0,
  "due_date": "2026-03-15",
  "status": "active",
  "transactions": [...],
  "ml_score": {...},
  "agreement": {...}
}

---

GET /api/v1/loans?user_id={user_id}&role=borrower|lender
List loans for a user

Response: 200 OK
{
  "loans": [
    {
      "loan_id": "LN-12345",
      "counterparty": "John Doe (07YYYYYYYY)",
      "amount": 5000,
      "balance": 4650,
      "status": "active",
      "due_date": "2026-03-15"
    },
    ...
  ],
  "total": 5,
  "page": 1,
  "limit": 10
}
```

### 8.3 Transaction Endpoints

```
POST /api/v1/transactions
Record a transaction (internal use mostly)

Request:
{
  "loan_id": "LN-12345",
  "type": "repayment",
  "amount": 400,
  "mpesa_reference": "M-PESA-TRX-002",
  "mpesa_status": "completed"
}

Response: 201 Created
{
  "transaction_id": "T-555",
  "loan_id": "LN-12345",
  "new_balance": 4650,
  "created_at": "2026-03-10T14:35:00Z"
}

---

GET /api/v1/loans/{loan_id}/ledger
Retrieve full transaction ledger

Response: 200 OK
{
  "loan_id": "LN-12345",
  "ledger": [
    {
      "transaction_id": "T-001",
      "type": "disbursement",
      "amount": 5000,
      "balance_after": 5000,
      "timestamp": "2026-03-01T14:25:00Z",
      "mpesa_ref": "M-PESA-TRX-001"
    },
    {
      "transaction_id": "T-002",
      "type": "interest_accrual",
      "amount": 50,
      "balance_after": 5050,
      "timestamp": "2026-03-02T00:01:00Z"
    },
    ...
  ]
}
```

### 8.4 ML Score Endpoint

```
GET /api/v1/users/{user_id}/score
Get latest ML score for a user

Response: 200 OK
{
  "score_id": "S-123",
  "user_id": "U-abc123",
  "score_value": 0.72,
  "risk_band": "MEDIUM",
  "percentile": 65,
  "confidence": 0.91,
  "top_factors": [
    {
      "factor": "Payment History",
      "impact": 0.35,
      "value": 0.95,
      "direction": "positive"
    },
    ...
  ],
  "risk_flags": ["No repayment history yet"],
  "recommendation": "PROCEED_WITH_CAUTION",
  "created_at": "2026-03-10T10:30:00Z",
  "valid_until": "2026-03-17T10:30:00Z"
}
```

### 8.5 Dispute Endpoints

```
POST /api/v1/disputes
Create a dispute

Request:
{
  "transaction_id": "T-555",
  "loan_id": "LN-12345",
  "initiated_by_user_id": "U-abc123",
  "dispute_type": "erroneous_deduction",
  "description": "This transaction was not authorized",
  "evidence_urls": ["https://s3.../receipt.jpg"]
}

Response: 201 Created
{
  "dispute_id": "D-98765",
  "status": "open",
  "created_at": "2026-03-10T15:00:00Z",
  "sla_due_date": "2026-03-17T15:00:00Z"
}

---

GET /api/v1/disputes/{dispute_id}
Retrieve dispute details

Response: 200 OK
{
  "dispute_id": "D-98765",
  "transaction": {...},
  "loan": {...},
  "initiated_by": {...},
  "status": "under_review",
  "evidence": [...],
  "resolution_notes": "Investigating...",
  "created_at": "2026-03-10T15:00:00Z"
}

---

PUT /api/v1/admin/disputes/{dispute_id}/resolve
Resolve a dispute (admin only)

Request:
{
  "resolution_status": "resolved_upheld",
  "reversal_amount": 400,
  "resolution_notes": "Transaction was indeed erroneous. Reversing."
}

Response: 200 OK
{
  "dispute_id": "D-98765",
  "status": "resolved_upheld",
  "reversal_initiated": true,
  "resolved_at": "2026-03-11T10:30:00Z"
}
```

### 8.6 Agreement Endpoints

```
GET /api/v1/loans/{loan_id}/agreement
Retrieve agreement details

Response: 200 OK
{
  "agreement_id": "AG-123",
  "loan_id": "LN-12345",
  "clauses": [
    {
      "clause_number": 1,
      "title": "Automatic Repayment Deduction",
      "text": "The borrower authorizes...",
      "borrower_consent": true,
      "borrower_consent_timestamp": "2026-03-01T14:20:00Z",
      "lender_consent": true,
      "lender_consent_timestamp": "2026-03-01T14:25:00Z"
    },
    ...
  ],
  "borrower_signed_at": "2026-03-01T14:22:00Z",
  "borrower_signature_method": "fingerprint",
  "lender_signed_at": "2026-03-01T14:25:00Z",
  "lender_signature_method": "digital",
  "agreement_pdf_url": "https://s3.../agreement-LN-12345.pdf",
  "agreement_pdf_hash": "sha256_hash_here"
}

---

POST /api/v1/loans/{loan_id}/agreement/download-pdf
Download signed agreement PDF

Response: 200 OK (PDF file)
```

---

## 9. FOLDER STRUCTURE & PROJECT SETUP

```
peer-to-peer-debt-management/
│
├── README.md
├── SYSTEM_DESIGN_V2.md (This document)
├── .env.example
├── .env (gitignored)
├── .gitignore
├── package.json
├── package-lock.json
├── jest.config.js
│
├── /backend
│   ├── server.js                    # Express app entry point
│   ├── config/
│   │   ├── database.js              # PostgreSQL connection
│   │   ├── redis.js                 # Redis cache setup
│   │   ├── env.js                   # Environment variables
│   │   └── constants.js             # App-wide constants
│   │
│   ├── src/
│   │   ├── middleware/
│   │   │   ├── auth.js              # JWT authentication
│   │   │   ├── errorHandler.js      # Global error handling
│   │   │   ├── validation.js        # Request validation
│   │   │   └── audit.js             # Audit logging middleware
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.routes.js       # /api/v1/auth
│   │   │   ├── loans.routes.js      # /api/v1/loans
│   │   │   ├── transactions.routes.js # /api/v1/transactions
│   │   │   ├── agreements.routes.js # /api/v1/agreements
│   │   │   ├── disputes.routes.js   # /api/v1/disputes
│   │   │   ├── scores.routes.js     # /api/v1/scores
│   │   │   ├── notifications.routes.js # /api/v1/notifications
│   │   │   └── admin.routes.js      # /api/v1/admin
│   │   │
│   │   ├── controllers/
│   │   │   ├── authController.js    # Auth logic
│   │   │   ├── loanController.js    # Loan creation, approval, tracking
│   │   │   ├── transactionController.js # Transaction recording
│   │   │   ├── agreementController.js # Agreement management
│   │   │   ├── disputeController.js # Dispute handling
│   │   │   ├── scoreController.js   # ML score retrieval
│   │   │   └── adminController.js   # Admin operations
│   │   │
│   │   ├── services/
│   │   │   ├── userService.js       # User management
│   │   │   ├── loanService.js       # Loan business logic
│   │   │   ├── agreementService.js  # Agreement generation & signing
│   │   │   ├── transactionService.js # Ledger updates
│   │   │   ├── mpesaService.js      # M-Pesa integration
│   │   │   ├── notificationService.js # SMS, email, in-app alerts
│   │   │   ├── mlScoreService.js    # ML model inference
│   │   │   ├── disputeService.js    # Dispute resolution
│   │   │   ├── kycService.js        # KYC verification
│   │   │   ├── pdfService.js        # Agreement PDF generation
│   │   │   └── auditService.js      # Audit logging
│   │   │
│   │   ├── jobs/
│   │   │   ├── interestAccrualJob.js  # Daily interest calculation
│   │   │   ├── penaltyApplicationJob.js # Penalty accrual
│   │   │   ├── triggerEngineJob.js   # Monitor incoming funds & trigger repayments
│   │   │   ├── notificationJob.js    # Batch notification sending
│   │   │   ├── mlRetrainingJob.js    # Monthly/Quarterly model retraining
│   │   │   └── cleanupJob.js         # Data cleanup & archival
│   │   │
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Loan.js
│   │   │   ├── Agreement.js
│   │   │   ├── Transaction.js
│   │   │   ├── Dispute.js
│   │   │   ├── MLScore.js
│   │   │   ├── Notification.js
│   │   │   └── AuditLog.js
│   │   │
│   │   ├── utils/
│   │   │   ├── validators.js        # Input validation functions
│   │   │   ├── formatters.js        # Response formatters
│   │   │   ├── errorCodes.js        # Error code definitions
│   │   │   ├── encryptionUtils.js   # AES-256 encryption
│   │   │   ├── tokenUtils.js        # JWT token generation
│   │   │   └── dateUtils.js         # Date calculations
│   │   │
│   │   └── ml/
│   │       ├── xgboostModel.py      # Python ML model (called via subprocess)
│   │       ├── featureExtractor.js  # Feature engineering
│   │       ├── modelTrainer.py      # Model retraining script
│   │       ├── evaluator.py         # Model evaluation & bias detection
│   │       └── requirements.txt     # Python dependencies
│   │
│   └── tests/
│       ├── unit/
│       │   ├── services.test.js
│       │   ├── controllers.test.js
│       │   └── utils.test.js
│       ├── integration/
│       │   ├── loanFlow.test.js
│       │   ├── mpesaIntegration.test.js
│       │   └── disputeFlow.test.js
│       └── e2e/
│           ├── fullLoanCycle.test.js
│           └── mlScoring.test.js
│
├── /frontend
│   ├── package.json
│   ├── index.html
│   ├── vite.config.js             # Vite bundler config
│   │
│   ├── /src
│   │   ├── main.jsx               # React entry point
│   │   ├── App.jsx                # Root component
│   │   │
│   │   ├── /pages
│   │   │   ├── Dashboard.jsx      # Main user dashboard
│   │   │   ├── LoanRequest.jsx    # Loan request form
│   │   │   ├── LoanDetail.jsx     # Loan details view
│   │   │   ├── Agreement.jsx      # Agreement review & signing
│   │   │   ├── Disputes.jsx       # Dispute management
│   │   │   ├── Profile.jsx        # User profile & KYC
│   │   │   ├── Notifications.jsx  # Notification center
│   │   │   └── Admin.jsx          # Admin dashboard
│   │   │
│   │   ├── /components
│   │   │   ├── LoanCard.jsx
│   │   │   ├── TransactionList.jsx
│   │   │   ├── ScoreDisplay.jsx
│   │   │   ├── SignaturePad.jsx
│   │   │   ├── AgreementClause.jsx
│   │   │   └── DisputeForm.jsx
│   │   │
│   │   ├── /services
│   │   │   ├── api.js             # API client (axios)
│   │   │   ├── auth.js            # Auth service
│   │   │   └── storage.js         # LocalStorage management
│   │   │
│   │   ├── /hooks
│   │   │   ├── useAuth.js
│   │   │   ├── useLoanData.js
│   │   │   └── useMLScore.js
│   │   │
│   │   ├── /styles
│   │   │   ├── global.css
│   │   │   ├── dashboard.css
│   │   │   └── responsive.css
│   │   │
│   │   └── /utils
│   │       ├── formatters.js      # Number formatting, date formatting
│   │       └── validators.js      # Client-side validation
│   │
│   └── tests/
│       ├── unit/
│       └── integration/
│
├── /mobile (React Native / Flutter)
│   ├── app.json
│   ├── package.json
│   │
│   ├── /src
│   │   ├── screens/
│   │   │   ├── DashboardScreen.js
│   │   │   ├── LoanRequestScreen.js
│   │   │   ├── SignatureScreen.js
│   │   │   └── NotificationScreen.js
│   │   │
│   │   ├── components/
│   │   ├── services/
│   │   └── styles/
│   │
│   └── tests/
│
├── /ussd (USSD Backend)
│   ├── ussd-server.js
│   ├── /src
│   │   ├── menus/
│   │   │   ├── mainMenu.js
│   │   │   ├── loanMenu.js
│   │   │   ├── agreementMenu.js
│   │   │   └── confirmationMenu.js
│   │   │
│   │   ├── services/
│   │   │   └── ussdParser.js
│   │   │
│   │   └── controllers/
│   │       └── ussdController.js
│   │
│   └── tests/
│
├── /ml-models
│   ├── models/
│   │   ├── xgboost_v2.1.pkl       # Serialized XGBoost model
│   │   └── scaler.pkl              # Feature scaler
│   │
│   ├── notebooks/
│   │   ├── 01_data_exploration.ipynb
│   │   ├── 02_feature_engineering.ipynb
│   │   ├── 03_model_training.ipynb
│   │   └── 04_bias_analysis.ipynb
│   │
│   ├── src/
│   │   ├── train.py
│   │   ├── predict.py
│   │   ├── evaluate.py
│   │   └── bias_checker.py
│   │
│   └── requirements.txt
│
├── /database
│   ├── schema.sql                  # Complete DB schema
│   ├── seed_data.sql               # Sample data for testing
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_add_ml_scores.sql
│   │   └── 003_add_audit_logs.sql
│   │
│   └── backup/ (for manual backups)
│
├── /docs
│   ├── SYSTEM_DESIGN_V2.md (this file)
│   ├── API_DOCUMENTATION.md        # OpenAPI/Swagger docs
│   ├── INTEGRATION_GUIDE.md        # M-Pesa integration details
│   ├── DEPLOYMENT_GUIDE.md         # Docker, Kubernetes setup
│   ├── SECURITY.md                 # Security best practices
│   ├── COMPLIANCE.md               # Legal & regulatory notes
│   └── TROUBLESHOOTING.md          # Common issues & solutions
│
├── /scripts
│   ├── setup-dev.sh                # Local development setup
│   ├── setup-db.sh                 # Database initialization
│   ├── deploy.sh                   # CI/CD deployment
│   ├── backup-db.sh                # Backup script
│   └── load-test.js                # Performance testing
│
├── /config
│   ├── nginx.conf                  # Nginx reverse proxy config
│   ├── docker-compose.yml          # Docker composition
│   └── kubernetes/                 # K8s manifests
│       ├── deployment.yaml
│       ├── service.yaml
│       └── configmap.yaml
│
└── /infra
    ├── terraform/                  # Infrastructure as code
    │   ├── main.tf
    │   ├── variables.tf
    │   └── outputs.tf
    │
    └── monitoring/                 # Monitoring & logging setup
        ├── prometheus.yml
        ├── grafana/
        └── elk/ (Elasticsearch, Logstash, Kibana)
```

---

## 10. TECHNOLOGY STACK & IMPLEMENTATION ROADMAP

### 10.1 Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| **Backend** | Node.js + Express | Lightweight, async-friendly, event-driven |
| **Database** | PostgreSQL | ACID transactions, JSON support, extensibility |
| **Cache** | Redis | In-memory caching, job queues |
| **Frontend** | React + Vite | Modern UI, component-based, fast build |
| **Mobile** | React Native OR Flutter | Cross-platform, code reuse |
| **USSD** | Node.js + USSD Gateway API | Simple text-based interface |
| **ML** | Python (XGBoost) + SHAP | Interpretable, production-ready |
| **PDF Generation** | PDFKit / ReportLab | Agreement PDF creation |
| **Job Queue** | Bull (Node.js) or Celery (Python) | Background task scheduling |
| **Authentication** | JWT + MFA | Stateless, scalable |
| **Encryption** | OpenSSL, AES-256, TLS 1.2+ | Industry-standard security |
| **Cloud** | AWS/GCP/Azure | Scalable infrastructure |
| **Containerization** | Docker + Kubernetes | DevOps best practices |
| **Monitoring** | Prometheus + Grafana | Performance visibility |
| **Logging** | ELK Stack | Centralized logging |

### 10.2 Implementation Roadmap

#### **Phase 1: MVP Foundation (Weeks 1-8)**
- [x] System design & architecture review
- [ ] Backend API scaffolding (Auth, Users, Loans)
- [ ] PostgreSQL schema setup
- [ ] Basic frontend dashboard
- [ ] Agreement generation (PDF)
- [ ] M-Pesa prompt simulation (mock)
- [ ] Rule-based ML scoring prototype

**Deliverables:** Functional loan creation, lender approval, agreement signing

---

#### **Phase 2: Core Features (Weeks 9-16)**
- [ ] Interest accrual engine (daily calculations)
- [ ] Trigger engine (incoming M-Pesa detection)
- [ ] Automatic repayment deduction workflow
- [ ] Penalty application logic
- [ ] Real-time dashboard updates (WebSockets)
- [ ] Notification system (SMS integration)
- [ ] Dispute management workflow

**Deliverables:** Full loan lifecycle with automated repayments

---

#### **Phase 3: ML & Advanced Features (Weeks 17-24)**
- [ ] Data pipeline for ML training
- [ ] XGBoost model training & validation
- [ ] SHAP explainability integration
- [ ] Bias detection & mitigation
- [ ] ML scoring display in lender prompts
- [ ] Mobile app (iOS/Android)
- [ ] USSD interface for feature phones

**Deliverables:** ML-driven risk assessment, multi-platform support

---

#### **Phase 4: Production Hardening (Weeks 25-28)**
- [ ] Security penetration testing
- [ ] Performance optimization & load testing
- [ ] Compliance audit (CBK, Data Protection)
- [ ] Operations console for admins
- [ ] Backup & disaster recovery setup
- [ ] Monitoring & alerting system
- [ ] User documentation & training

**Deliverables:** Production-ready system, regulatory approval

---

### 10.3 Local Development Setup

```bash
# Clone repository
git clone <repo_url>
cd peer-to-peer-debt-management

# Install backend dependencies
cd backend
npm install

# Install Python dependencies for ML
pip install -r src/ml/requirements.txt

# Setup environment variables
cp .env.example .env
# Edit .env with your M-Pesa API keys, Twilio credentials, etc.

# Start PostgreSQL & Redis (Docker)
docker-compose up -d postgres redis

# Run database migrations
npm run migrate

# Seed sample data
npm run seed

# Start backend server
npm run dev          # Starts on http://localhost:3000

# Install frontend dependencies (in a new terminal)
cd frontend
npm install

# Start frontend dev server
npm run dev          # Starts on http://localhost:5173

# USSD server (separate terminal)
cd ussd
npm run dev          # Starts on http://localhost:3001

# Run tests
npm run test         # All tests
npm run test:integration  # Integration tests only
```

---

## 11. REGULATORY & COMPLIANCE CONSIDERATIONS

### 11.1 Key Compliance Areas

1. **CBK Digital Credit Licensing**
   - Confirm if platform qualifies as Digital Credit Provider
   - Obtain necessary licensing OR partner with licensed entity
   - Comply with CBK rules on interest rates & penalties

2. **Data Protection Act (Kenya)**
   - Implement lawful basis for data processing
   - Provide data subject rights (access, deletion, portability)
   - Conduct Data Protection Impact Assessment (DPIA)
   - Report breaches within 72 hours

3. **Consumer Protection**
   - Transparent fee disclosure
   - Clear interest & penalty explanations
   - Dispute resolution SLA (24-hour initial response)
   - Right to cancel within grace period

4. **Interest & Penalty Legality**
   - Maximum daily rate: Review with legal counsel (suggest ≤2% daily)
   - Penalties: Conservative caps (50% of principal)
   - Grace periods: Minimum 7 days
   - No compounding of penalties beyond legal limits

5. **Evidence Admissibility**
   - E-signatures compliance (Kenya's Evidence Act)
   - Timestamped agreement PDFs
   - Device metadata capture
   - Immutable audit trail for court use

### 11.2 Suggested Legal Review Items

- [ ] Licensing requirements (CBK)
- [ ] Permissible interest & penalty rates
- [ ] Enforceability of electronic signatures
- [ ] Partnership terms with Safaricom/M-Pesa
- [ ] Consumer dispute resolution mechanism
- [ ] Data retention & deletion policies
- [ ] AML/KYC compliance thresholds

---

## 12. HONEST SYSTEM VALIDATION & ASSESSMENT

### 12.1 Strengths of This Design

✅ **Legally Sound Architecture**
- Immutable ledger provides court-admissible evidence
- Clause-by-clause consent captures informed agreement
- E-signatures with device metadata increase enforceability

✅ **User-Friendly Simplicity**
- Single dashboard for loans issued and owed (no role confusion)
- Automatic interest & penalty calculations reduce manual disputes
- Real-time balance updates keep users informed

✅ **Innovative M-Pesa Integration**
- No fund custody eliminates regulatory burden
- Automatic deductions via Fuliza reduce default rates
- User-initiated prompts respect Safaricom's security model

✅ **ML-Driven Risk Mitigation**
- Explainable scores reduce bias & discrimination
- Lenders make informed decisions, not blind guesses
- Platform learns borrower behavior over time

✅ **Dispute Resolution Built-In**
- 24-hour SLA prevents user frustration
- Reversal mechanism protects from system errors
- Audit trail provides evidence for resolution

### 12.2 Critical Challenges & Risks

⚠️ **M-Pesa Integration Complexity**
- Requires direct API partnership with Safaricom
- Fuliza deductions may have limitations or caps
- Callback webhooks must be highly reliable
- **Mitigation:** Early engagement with Safaricom, fallback to manual prompts

⚠️ **Regulatory Uncertainty**
- CBK licensing requirements unclear for this model
- Electronic signature enforceability needs legal validation
- Interest rate caps may restrict viability
- **Mitigation:** Conduct ASAP legal review before MVP launch

⚠️ **Penalty Enforcement Challenges**
- 10% daily penalty may face legal challenges
- Users may dispute penalty amounts
- Court enforcement of digital penalties untested in Kenya
- **Mitigation:** Set conservative penalty rates, provide dispute channel

⚠️ **User Trust & Adoption**
- Feature phone users may distrust digital agreements
- USSD interface complexity limits accessibility
- Borrowers may resist automatic deductions
- **Mitigation:** Extensive user education, pilot with trusted community groups

⚠️ **ML Model Limitations**
- New users have no history for scoring
- Cannot detect sophisticated fraud (collusion)
- Model may perpetuate bias if training data is skewed
- **Mitigation:** Combine ML with manual review, frequent bias audits

⚠️ **Operational Overhead**
- Dispute resolution requires trained staff (24/7?)
- Regulatory compliance requires legal expertise
- Customer support for digital agreements non-trivial
- **Mitigation:** Start with small pilot (500 users), grow ops gradually

### 12.3 Market Viability Assessment

**Addressable Market:**
- Kenya's informal lending ecosystem: estimated KES 500B+ annually
- 25M+ adults with M-Pesa accounts
- SACCOs & Chamas looking for digital tools
- Target market: 10,000-100,000 users in Year 1

**Revenue Model Options:**
1. **Transaction Fees:** 1-3% on disbursement (KES 50-150 per KES 5k loan)
2. **Premium Analytics:** KES 500-2,000/month for detailed lender dashboards
3. **SACCO Licensing:** KES 10,000-50,000/month for institutional partners
4. **Interest Sharing:** 0.1-0.5% of daily interest accrued

**Unit Economics (Example):**
- Average loan: KES 5,000
- Transaction fee (2%): KES 100 per loan
- Platform takes 30-50% margin: KES 30-50 revenue per loan
- Monthly active users: 10,000
- Loans per user per month: 0.5
- Monthly revenue: KES 150,000-250,000 (~USD 1,100-1,850)
- Operating cost: ~KES 500,000-1M per month (MVP stage)
- **Breakeven timeline:** 12-18 months with 50k+ users

### 12.4 Go/No-Go Criteria for MVP Launch

**GO if:**
- [ ] Legal review confirms electronic signature enforceability
- [ ] CBK indicates no licensing required OR we partner with licensed entity
- [ ] Safaricom agrees to API/webhook partnership
- [ ] Pilot partner (SACCO/Chama) signs LOI with 500+ users
- [ ] Team in place: 3+ backend, 2+ frontend, 1 ML, 1 legal

**NO-GO if:**
- [ ] CBK requires Digital Credit Provider license (unclear path)
- [ ] Safaricom demands unacceptable fees or restrictions
- [ ] Courts unlikely to enforce electronic agreements
- [ ] Interest rate caps make unit economics unviable
- [ ] Key team members unavailable for 6-month sprint

---

## 13. NEXT STEPS & IMMEDIATE ACTIONS

### 13.1 Week 1 Priority Tasks

1. **Legal Review Sprint**
   - Engage external legal counsel (CBK compliance, interest rates, e-signatures)
   - Estimated: 3-5 business days, KES 30,000-50,000

2. **Safaricom Partnership Outreach**
   - Request meeting with Safaricom's M-Pesa API team
   - Present integration proposal & commercial terms
   - Estimated: 1-2 weeks for initial response

3. **Pilot Partner Identification**
   - Contact 3-5 SACCOs / Chama networks
   - Gauge interest & collect requirements
   - Aim to secure 1 LOI by end of month

4. **Team Assembly**
   - Confirm availability of core team (8-10 people)
   - Set up development environment
   - Create agile board (Jira/Monday.com)

### 13.2 Week 2-4 Tasks

5. **Database & API Setup**
   - Finalize PostgreSQL schema
   - Build core API endpoints (auth, loans, transactions)
   - Deploy to staging environment

6. **Frontend Prototype**
   - Build dashboard wireframes
   - Implement loan request form
   - Begin agreement review screen

7. **M-Pesa Mock Server**
   - Create prompt simulator for testing
   - Define callback webhook format
   - Set up sandbox testing

---

## 14. CONCLUSION

This refined Peer-to-Peer Debt Management System represents a **significant innovation** in Kenya's informal lending landscape. By combining:

- **Formal agreements** (clause-by-clause consent, e-signatures, court-admissible PDFs)
- **Automated enforcement** (M-Pesa Fuliza deductions, interest/penalty accrual)
- **Intelligent risk assessment** (explainable ML scoring)
- **Strong dispute protection** (24-hour SLA, reversals, audit trail)

...the platform addresses a genuine market need: **formalizing informal lending without custody risk or regulatory burden**.

**However, success depends on:**
1. Regulatory clarity (CBK licensing, interest rate caps)
2. Safaricom partnership (API access, callback reliability)
3. User adoption (education, trust-building in pilot)
4. Operational excellence (dispute resolution, customer support)

**Recommended Path Forward:**
- Complete legal review (2-3 weeks)
- Secure Safaricom partnership MOU (4-6 weeks)
- Launch 500-user pilot with 1 SACCO (3 months)
- Measure: repayment rate, dispute rate, NPS, default reduction
- Scale to 50,000+ users if metrics favorable

**Investment Needed:** KES 2-5M for MVP (8-person team, 3 months)
**Expected ROI:** Breakeven in 12-18 months, positive unit economics at 50k+ users

---

**Document Prepared By:** System Architecture Team  
**Last Updated:** 03 February 2026  
**Next Review:** Upon completion of legal review

---
