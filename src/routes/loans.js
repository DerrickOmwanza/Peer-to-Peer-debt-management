const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const { getRiskScore } = require('../services/novaService');

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
      repayment_start_date
    } = req.body;
    
    // Validate input
    if (!lender_phone || !principal_amount || !repayment_method || !repayment_amount || !repayment_start_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Normalize phone number (remove +, leading 0)
    const normalizedPhone = normalizePhoneNumber(lender_phone);
    
    // Get lender by phone
    const lender = await pool.query(
      'SELECT id FROM users WHERE phone_number = $1',
      [normalizedPhone]
    );
    
    if (lender.rows.length === 0) {
      return res.status(404).json({ error: 'Lender not found' });
    }
    
    // Create loan
    const loan = await pool.query(
      `INSERT INTO loans (id, borrower_id, lender_id, principal_amount, remaining_balance, repayment_method, repayment_amount, repayment_start_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, borrower_id, lender_id, principal_amount, remaining_balance, repayment_method, repayment_amount, repayment_start_date, status, created_at`,
      [uuidv4(), req.user.id, lender.rows[0].id, principal_amount, principal_amount, repayment_method, repayment_amount, repayment_start_date, 'pending']
    );
    
    // Create notification for lender
    await pool.query(
      `INSERT INTO notifications (id, user_id, loan_id, notification_type, message)
       VALUES ($1, $2, $3, $4, $5)`,
      [uuidv4(), lender.rows[0].id, loan.rows[0].id, 'loan_request', `New loan request: Ksh ${principal_amount} from borrower`]
    );
    
    res.status(201).json({
      message: 'Loan request created successfully',
      loan: loan.rows[0]
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
      'SELECT borrower_id, lender_id FROM loans WHERE id = $1',
      [loanId]
    );
    
    if (loan.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }
    
    if (loan.rows[0].lender_id !== req.user.id) {
      return res.status(403).json({ error: 'Only lender can approve/decline' });
    }
    
    const newStatus = approved ? 'active' : 'declined';
    const updatedLoan = await pool.query(
      `UPDATE loans SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [newStatus, loanId]
    );
    
    // Notify borrower
    await pool.query(
      `INSERT INTO notifications (id, user_id, loan_id, notification_type, message)
       VALUES ($1, $2, $3, $4, $5)`,
      [uuidv4(), loan.rows[0].borrower_id, loanId, 'approval', `Loan ${newStatus}`]
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

module.exports = router;
