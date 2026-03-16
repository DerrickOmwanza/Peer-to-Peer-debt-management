const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const { getRiskScore } = require('../services/novaService');
const { sendAgreementEmail } = require('../services/emailService');

const CBK_BASE_RATE = 10.75;
const RISK_PREMIUM = 3.0;
const ANNUAL_INTEREST_RATE = CBK_BASE_RATE + RISK_PREMIUM;

// Normalize phone number format
function normalizePhoneNumber(phone) {
  if (!phone) return phone;
  
  // Remove spaces and special characters except digits
  let normalized = phone.replace(/\D/g, '');
  
  // If starts with 0, replace with 254
  if (normalized.startsWith('0')) {
    normalized = '254' + normalized.substring(1);
  }
  // If doesn't start with 254, add it
  else if (!normalized.startsWith('254')) {
    normalized = '254' + normalized;
  }
  
  return normalized;
}

// Borrower creates loan request
router.post('/request', verifyToken, async (req, res) => {
  try {
    const {
      lender_phone,
      principal_amount,
      repayment_method,
      repayment_amount,
      repayment_start_date,
      terms_accepted,
      terms_accepted_at,
      lender_name
    } = req.body;
    
    // Validate input
    if (!lender_phone || !principal_amount || !repayment_method || !repayment_amount || !repayment_start_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate Terms & Conditions acceptance
    if (terms_accepted !== true) {
      return res.status(400).json({ error: 'You must accept the Terms & Conditions before requesting a loan' });
    }
    
    // Get borrower name and email and metrics
    const borrowerData = await pool.query(
      `SELECT full_name, email, 
        (SELECT COUNT(*) FROM loans WHERE borrower_id = $1) as total_loans,
        (SELECT COALESCE(SUM(CASE WHEN status = 'defaulted' THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0) * 100, 0) FROM loans WHERE borrower_id = $1) as default_rate,
        (SELECT COALESCE(AVG(EXTRACT(DAY FROM repayment_start_date - created_at)), 30) FROM loans WHERE borrower_id = $1) as avg_repayment_days,
        (SELECT COALESCE(COUNT(DISTINCT DATE_TRUNC('quarter', created_at)), 0) FROM loans WHERE borrower_id = $1) as loan_frequency,
        (SELECT COUNT(*) FROM disputes WHERE borrower_id = $1) as dispute_count
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (borrowerData.rows.length === 0) {
      return res.status(404).json({ error: 'Borrower not found' });
    }

    const borrower = borrowerData.rows[0];
    const borrowerName = borrower.full_name || 'Unknown';
    const borrowerEmail = borrower.email;

    // Get Nova Risk Score for borrower
    console.log(`[Loans] Fetching risk score for ${borrowerName}...`);
    const riskScoreResult = await getRiskScore(req.user.id, {
      totalLoans: parseInt(borrower.total_loans),
      defaultRate: parseFloat(borrower.default_rate),
      avgRepaymentDays: parseFloat(borrower.avg_repayment_days),
      loanFrequency: parseInt(borrower.loan_frequency),
      disputeCount: parseInt(borrower.dispute_count)
    });

    const riskScoreMsg = riskScoreResult.success 
      ? `Risk Score: ${riskScoreResult.riskScore} (${riskScoreResult.riskBand})`
      : 'Risk Score: Unable to calculate (Medium default)';

    // Normalize phone number (remove +, leading 0)
    const normalizedPhone = normalizePhoneNumber(lender_phone);
    
    // Get lender by phone
    const lender = await pool.query(
      'SELECT id, full_name, email FROM users WHERE phone_number = $1',
      [normalizedPhone]
    );
    
    if (lender.rows.length === 0) {
      return res.status(404).json({ error: 'Lender not found' });
    }
    
    const resolvedLenderName = lender_name || lender.rows[0].full_name || 'Unknown';
    const lenderEmail = lender.rows[0].email;
    
    // Calculate repayment amount based on CBK rules if interest-based
    let finalRepaymentAmount = parseFloat(repayment_amount);
    if (repayment_method === 'interest') {
      const principal = parseFloat(principal_amount);
      const interest = (principal * ANNUAL_INTEREST_RATE) / 100;
      finalRepaymentAmount = principal + interest;
    }
    
    const loanId = uuidv4();
    const acceptedAt = terms_accepted_at || new Date().toISOString();
    
    // Create loan
    const loan = await pool.query(
      `INSERT INTO loans (id, borrower_id, lender_id, principal_amount, remaining_balance, repayment_method, repayment_amount, repayment_start_date, status, terms_accepted, terms_accepted_at, lender_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id, borrower_id, lender_id, principal_amount, remaining_balance, repayment_method, repayment_amount, repayment_start_date, status, created_at, terms_accepted, terms_accepted_at, lender_name`,
      [loanId, req.user.id, lender.rows[0].id, principal_amount, principal_amount, repayment_method, finalRepaymentAmount, repayment_start_date, 'pending', true, acceptedAt, resolvedLenderName]
    );
    
    // Generate loan agreement
    const agreementId = uuidv4();
    const agreementDate = new Date().toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' });
    const agreementText = `LOAN AGREEMENT

Agreement Reference: ${agreementId}
Date: ${agreementDate}

PARTIES:
- Borrower: ${borrowerName} (${borrowerEmail})
- Lender: ${resolvedLenderName} (${lenderEmail})

LOAN DETAILS:
- Principal Amount: Ksh ${principal_amount}
- Repayment Method: ${repayment_method}
- Repayment Amount: Ksh ${finalRepaymentAmount.toFixed(2)}
- Repayment Start Date: ${repayment_start_date}
- Interest Rate applied: ${repayment_method === 'interest' ? ANNUAL_INTEREST_RATE + '%' : 'Fixed'} (CBK base rate + risk premium)

TERMS AND CONDITIONS (LEGAL):
1. The Borrower agrees to repay the total loan amount as specified above.
2. Repayments shall commence on the agreed start date and follow the ${repayment_method} schedule.
3. Each repayment installment shall be Ksh ${finalRepaymentAmount.toFixed(2)}.
4. Failure to make timely repayments may result in the loan being marked as defaulted.
5. In case of default, the Borrower agrees to legal enforcement through the Kenyan courts of law.
6. The Borrower acknowledges that late payment or default will negatively impact their Nova Risk Score.
7. Both parties agree to resolve any disputes through the platform's AI-mediated dispute resolution mechanism before escalating to human arbitration or legal action.
8. This agreement is binding upon acceptance by both parties through the platform.

ACCEPTANCE:
- Borrower (${borrowerName}) accepted Terms & Conditions and digitally signed on ${acceptedAt}.
- Lender acceptance is pending approval of the loan request.`;

    await pool.query(
      `INSERT INTO loan_agreements (id, loan_id, agreement_text, signatures)
       VALUES ($1, $2, $3, $4)`,
      [agreementId, loanId, agreementText, JSON.stringify({ borrower: borrowerName, signedAt: acceptedAt })]
    );
    
    // Update loan with agreement reference
    await pool.query(
      'UPDATE loans SET agreement_id = $1 WHERE id = $2',
      [agreementId, loanId]
    );
    
    // Create notification for lender with richer summary and risk score
    const notificationMessage = `New loan request: Ksh ${principal_amount} from ${borrowerName}. ${riskScoreMsg}. Repayment: Ksh ${finalRepaymentAmount.toFixed(2)} starting ${repayment_start_date}.`;
    await pool.query(
      `INSERT INTO notifications (id, user_id, loan_id, notification_type, message)
       VALUES ($1, $2, $3, $4, $5)`,
      [uuidv4(), lender.rows[0].id, loanId, 'loan_request', notificationMessage]
    );
    
    // Send email "soft copy" to lender and borrower
    console.log(`[Loans] Sending agreement emails for loan ${loanId}...`);
    const emailData = {
      borrowerName,
      lenderName: resolvedLenderName,
      amount: principal_amount,
      repaymentAmount: finalRepaymentAmount.toFixed(2),
      repaymentDate: repayment_start_date
    };

    // Attempt to send emails (background)
    sendAgreementEmail(lenderEmail, emailData, agreementText).catch(e => console.error('[Email Error]:', e));
    sendAgreementEmail(borrowerEmail, emailData, agreementText).catch(e => console.error('[Email Error]:', e));

    res.status(201).json({
      message: 'Loan request created successfully and agreement sent via email',
      loan: loan.rows[0],
      agreement_id: agreementId,
      riskScore: riskScoreResult
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Lender approves/declines loan
router.patch('/:loanId/approval', verifyToken, async (req, res) => {
  try {
    const { loanId } = req.params;
    const { approved } = req.body;
    
    if (typeof approved !== 'boolean') {
      return res.status(400).json({ error: 'Invalid approval status' });
    }
    
    const loan = await pool.query(
      'SELECT borrower_id, lender_id, principal_amount FROM loans WHERE id = $1',
      [loanId]
    );
    
    if (loan.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }
    
    if (loan.rows[0].lender_id !== req.user.id) {
      return res.status(403).json({ error: 'Only lender can approve/decline' });
    }
    
    const newStatus = approved ? 'active' : 'declined';
    const { borrower_id, lender_id, principal_amount } = loan.rows[0];
    
    // If approved, transfer funds from lender to borrower
    if (approved) {
      // Check lender has sufficient balance
      const lenderBalance = await pool.query(
        'SELECT wallet_balance FROM users WHERE id = $1',
        [lender_id]
      );
      
      if (lenderBalance.rows.length === 0 || parseFloat(lenderBalance.rows[0].wallet_balance) < parseFloat(principal_amount)) {
        return res.status(400).json({ error: 'Insufficient funds in lender wallet' });
      }
      
      // Deduct from lender wallet
      await pool.query(
        'UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2',
        [principal_amount, lender_id]
      );
      
      // Add to borrower wallet
      await pool.query(
        'UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2',
        [principal_amount, borrower_id]
      );
      
      // Log lender transaction (outgoing)
      await pool.query(
        `INSERT INTO transactions (id, user_id, amount, transaction_type, description, created_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
        [uuidv4(), lender_id, principal_amount, 'outgoing', `Loan disbursement to borrower for loan ${loanId}`]
      );
      
      // Log borrower transaction (incoming)
      await pool.query(
        `INSERT INTO transactions (id, user_id, amount, transaction_type, description, created_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
        [uuidv4(), borrower_id, principal_amount, 'incoming', `Loan received from lender for loan ${loanId}`]
      );
    }
    
    const updatedLoan = await pool.query(
      `UPDATE loans SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [newStatus, loanId]
    );
    
    // Notify borrower
    await pool.query(
      `INSERT INTO notifications (id, user_id, loan_id, notification_type, message)
       VALUES ($1, $2, $3, $4, $5)`,
      [uuidv4(), borrower_id, loanId, 'approval', `Loan ${newStatus}`]
    );
    
    res.json({
      message: `Loan ${newStatus} successfully`,
      loan: updatedLoan.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get borrower's loans
router.get('/borrower', verifyToken, async (req, res) => {
  try {
    const loans = await pool.query(
      `SELECT l.*, u.full_name as lender_name, u.phone_number as lender_phone
       FROM loans l
       JOIN users u ON l.lender_id = u.id
       WHERE l.borrower_id = $1
       ORDER BY l.created_at DESC`,
      [req.user.id]
    );
    
    res.json(loans.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get lender's loans
router.get('/lender', verifyToken, async (req, res) => {
  try {
    const loans = await pool.query(
      `SELECT l.*, u.full_name as borrower_name, u.phone_number as borrower_phone
       FROM loans l
       JOIN users u ON l.borrower_id = u.id
       WHERE l.lender_id = $1
       ORDER BY l.created_at DESC`,
      [req.user.id]
    );
    
    res.json(loans.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/loans/risk-score/:borrowerId
 * Get Nova AI risk score for a borrower
 * 
 * Returns:
 * {
 *   riskScore: 0-100,
 *   riskBand: 'Low|Medium|High',
 *   keyFactors: [...],
 *   recommendation: 'Approve|Decline|Conditional',
 *   reasoning: '...'
 * }
 */
router.get('/risk-score/:borrowerId', verifyToken, async (req, res) => {
  try {
    const { borrowerId } = req.params;

    // Check if score already exists and is recent (expires after 30 days)
    const cachedScore = await pool.query(
      `SELECT * FROM borrower_risk_scores 
       WHERE borrower_id = $1 
       AND calculated_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
       ORDER BY calculated_at DESC LIMIT 1`,
      [borrowerId]
    );

    if (cachedScore.rows.length > 0) {
      const score = cachedScore.rows[0];
      return res.json({
        riskScore: score.risk_score,
        riskBand: score.risk_band,
        keyFactors: score.key_factors,
        recommendation: score.recommendation,
        reasoning: score.reasoning,
        source: 'cached',
        calculatedAt: score.calculated_at
      });
    }

    // Query borrower metrics for Nova
    const metricsQuery = await pool.query(
      `SELECT 
        COUNT(*) as total_loans,
        COALESCE(SUM(CASE WHEN status = 'defaulted' THEN 1 ELSE 0 END)::float / 
          NULLIF(COUNT(*), 0) * 100, 0) as default_rate,
        COALESCE(AVG(EXTRACT(DAY FROM repayment_start_date - created_at)), 30) as avg_repayment_days,
        COALESCE(COUNT(DISTINCT DATE_TRUNC('quarter', created_at)), 0) as loan_frequency,
        COALESCE((SELECT COUNT(*) FROM disputes WHERE borrower_id = $1), 0) as dispute_count
       FROM loans
       WHERE borrower_id = $1`,
      [borrowerId]
    );

    if (metricsQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Borrower not found' });
    }

    const metrics = metricsQuery.rows[0];

    // Call Nova to compute risk score
    console.log(`[Loans] Computing Nova risk score for borrower ${borrowerId}...`);
    const riskScore = await getRiskScore(borrowerId, metrics);

    // Store in database
    const storeQuery = await pool.query(
      `INSERT INTO borrower_risk_scores 
       (borrower_id, risk_score, risk_band, key_factors, recommendation, reasoning, nova_response)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (borrower_id) DO UPDATE SET
        risk_score = $2,
        risk_band = $3,
        key_factors = $4,
        recommendation = $5,
        reasoning = $6,
        nova_response = $7,
        calculated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        borrowerId,
        riskScore.riskScore,
        riskScore.riskBand,
        JSON.stringify(riskScore.keyFactors),
        riskScore.recommendation,
        riskScore.reasoning,
        JSON.stringify(riskScore)
      ]
    );

    const stored = storeQuery.rows[0];

    res.json({
      riskScore: stored.risk_score,
      riskBand: stored.risk_band,
      keyFactors: stored.key_factors,
      recommendation: stored.recommendation,
      reasoning: stored.reasoning,
      source: riskScore.source,
      calculatedAt: stored.calculated_at
    });
  } catch (err) {
    console.error('[Risk Score Error]:', err);
    res.status(500).json({
      error: 'Failed to compute risk score',
      message: err.message
    });
  }
});

/**
 * GET /api/loans/admin/stats
 * Get statistics for admin dashboard
 */
router.get('/admin/stats', verifyToken, async (req, res) => {
  try {
    const statsQuery = await pool.query(`
      SELECT 
        COUNT(*) as total_loans,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_loans,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_loans,
        SUM(CASE WHEN status = 'defaulted' THEN 1 ELSE 0 END) as defaulted_loans,
        COUNT(DISTINCT borrower_id) as unique_borrowers,
        COUNT(DISTINCT lender_id) as unique_lenders,
        COALESCE(AVG(principal_amount), 0) as avg_loan_amount,
        COALESCE(MAX(principal_amount), 0) as max_loan_amount
      FROM loans
    `);

    const dispuesQuery = await pool.query(`
      SELECT 
        COUNT(*) as total_disputes,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_disputes,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_disputes,
        COALESCE(AVG(nova_confidence), 0) as avg_nova_confidence
      FROM disputes
    `);

    res.json({
      loans: statsQuery.rows[0],
      disputes: dispuesQuery.rows[0]
    });
  } catch (err) {
    console.error('[Stats Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get loan agreement
router.get('/:loanId/agreement', verifyToken, async (req, res) => {
  try {
    const { loanId } = req.params;

    // Verify user is borrower or lender of this loan
    const loan = await pool.query(
      'SELECT borrower_id, lender_id FROM loans WHERE id = $1',
      [loanId]
    );

    if (loan.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    if (loan.rows[0].borrower_id !== req.user.id && loan.rows[0].lender_id !== req.user.id) {
      return res.status(403).json({ error: 'You are not authorized to view this agreement' });
    }

    const agreement = await pool.query(
      'SELECT id, loan_id, agreement_text, clauses, signatures, is_valid, created_at, updated_at FROM loan_agreements WHERE loan_id = $1',
      [loanId]
    );

    if (agreement.rows.length === 0) {
      return res.status(404).json({ error: 'Agreement not found for this loan' });
    }

    res.json(agreement.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
