/**
 * Dispute Routes - Loan dispute management with Nova AI
 * Endpoints for filing, analyzing, and resolving disputes
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const { analyzeDispute } = require('../services/novaService');

/**
 * GET /api/disputes
 * Get all disputes for the current user
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const query = await pool.query(
      `SELECT d.*, l.principal_amount
       FROM disputes d
       JOIN loans l ON d.loan_id = l.id
       WHERE d.borrower_id = $1 OR d.lender_id = $1
       ORDER BY d.created_at DESC`,
      [req.user.id]
    );
    res.json(query.rows);
  } catch (err) {
    console.error('[Disputes List Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/disputes/create
 * File a new dispute for a loan
 * 
 * Request body:
 * {
 *   "loan_id": "uuid",
 *   "reason": "string - description of dispute",
 *   "evidence": { photos: [], messages: [], documents: [] }
 * }
 */
router.post('/create', verifyToken, async (req, res) => {
  try {
    const { loan_id, reason, evidence } = req.body;

    // Validate input
    if (!loan_id || !reason) {
      return res.status(400).json({
        error: 'Missing required fields: loan_id, reason'
      });
    }

    // Get loan details
    const loanQuery = await pool.query(
      `SELECT l.*, u_b.full_name as borrower_name, u_l.full_name as lender_name
       FROM loans l
       JOIN users u_b ON l.borrower_id = u_b.id
       JOIN users u_l ON l.lender_id = u_l.id
       WHERE l.id = $1`,
      [loan_id]
    );

    if (loanQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const loan = loanQuery.rows[0];

    // Verify user is either borrower or lender
    if (req.user.id !== loan.borrower_id && req.user.id !== loan.lender_id) {
      return res.status(403).json({
        error: 'Only borrower or lender can file dispute'
      });
    }

    const disputeId = uuidv4();

    // Call Nova to analyze dispute
    console.log(`[Dispute] Analyzing with Nova...`);
    const novaAnalysis = await analyzeDispute({
      reason,
      evidence: evidence || {},
      loanAmount: loan.principal_amount,
      borrowerName: loan.borrower_name,
      lenderName: loan.lender_name
    });

    // Store dispute in database
    const insertQuery = await pool.query(
      `INSERT INTO disputes 
       (id, loan_id, borrower_id, lender_id, reason, evidence, 
        nova_summary, nova_suggestion, nova_confidence, nova_flags, nova_response)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        disputeId,
        loan_id,
        loan.borrower_id,
        loan.lender_id,
        reason,
        JSON.stringify(evidence || {}),
        novaAnalysis.summary,
        novaAnalysis.suggestion,
        novaAnalysis.confidence,
        JSON.stringify(novaAnalysis.flags),
        JSON.stringify(novaAnalysis)
      ]
    );

    const dispute = insertQuery.rows[0];

    // Notify lender/borrower
    const otherUserId = req.user.id === loan.borrower_id ? loan.lender_id : loan.borrower_id;
    await pool.query(
      `INSERT INTO notifications (id, user_id, loan_id, notification_type, message)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        uuidv4(),
        otherUserId,
        loan_id,
        'dispute',
        `Dispute filed on loan. Nova analysis: "${novaAnalysis.summary}"`
      ]
    );

    res.status(201).json({
      message: 'Dispute filed successfully',
      dispute: {
        id: dispute.id,
        loan_id: dispute.loan_id,
        reason: dispute.reason,
        status: dispute.status,
        nova_analysis: {
          summary: dispute.nova_summary,
          suggestion: dispute.nova_suggestion,
          confidence: dispute.nova_confidence,
          flags: dispute.nova_flags
        },
        created_at: dispute.created_at
      }
    });
  } catch (err) {
    console.error('[Dispute Create Error]:', err);
    res.status(500).json({
      error: 'Failed to file dispute',
      message: err.message
    });
  }
});

/**
 * GET /api/disputes/:disputeId
 * Get dispute details with Nova analysis
 */
router.get('/:disputeId', verifyToken, async (req, res) => {
  try {
    const { disputeId } = req.params;

    const query = await pool.query(
      `SELECT d.*, 
              u_b.full_name as borrower_name, 
              u_l.full_name as lender_name,
              l.principal_amount
       FROM disputes d
       JOIN users u_b ON d.borrower_id = u_b.id
       JOIN users u_l ON d.lender_id = u_l.id
       JOIN loans l ON d.loan_id = l.id
       WHERE d.id = $1`,
      [disputeId]
    );

    if (query.rows.length === 0) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    const dispute = query.rows[0];

    // Verify user is involved in this dispute
    if (req.user.id !== dispute.borrower_id && req.user.id !== dispute.lender_id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json({
      id: dispute.id,
      loan_id: dispute.loan_id,
      borrower_name: dispute.borrower_name,
      lender_name: dispute.lender_name,
      principal_amount: dispute.principal_amount,
      reason: dispute.reason,
      evidence: dispute.evidence,
      status: dispute.status,
      resolution: dispute.resolution,
      nova_analysis: {
        summary: dispute.nova_summary,
        suggestion: dispute.nova_suggestion,
        confidence: dispute.nova_confidence,
        flags: dispute.nova_flags
      },
      created_at: dispute.created_at,
      resolved_at: dispute.resolved_at
    });
  } catch (err) {
    console.error('[Dispute Get Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/disputes/loan/:loanId
 * Get all disputes for a specific loan
 */
router.get('/loan/:loanId', verifyToken, async (req, res) => {
  try {
    const { loanId } = req.params;

    const query = await pool.query(
      `SELECT d.id, d.reason, d.status, d.nova_summary, d.nova_suggestion, 
              d.nova_confidence, d.created_at
       FROM disputes d
       WHERE d.loan_id = $1
       ORDER BY d.created_at DESC`,
      [loanId]
    );

    res.json(query.rows);
  } catch (err) {
    console.error('[Dispute List Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/disputes/:disputeId/resolve
 * Resolve a dispute (admin/lender only)
 * 
 * Request body:
 * {
 *   "resolution": "string - how dispute was resolved",
 *   "status": "resolved|escalated"
 * }
 */
router.patch('/:disputeId/resolve', verifyToken, async (req, res) => {
  try {
    const { disputeId } = req.params;
    const { resolution, status = 'resolved' } = req.body;

    if (!resolution) {
      return res.status(400).json({ error: 'Resolution text required' });
    }

    if (!['resolved', 'escalated'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Get dispute to verify authorization
    const disputeQuery = await pool.query(
      'SELECT * FROM disputes WHERE id = $1',
      [disputeId]
    );

    if (disputeQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    const dispute = disputeQuery.rows[0];

    // Only lender can resolve (or admin in real system)
    if (req.user.id !== dispute.lender_id) {
      return res.status(403).json({
        error: 'Only lender can resolve dispute'
      });
    }

    const updatedQuery = await pool.query(
      `UPDATE disputes 
       SET status = $1, resolution = $2, resolved_by = $3, resolved_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [status, resolution, req.user.id, disputeId]
    );

    const updated = updatedQuery.rows[0];

    // Notify borrower of resolution
    await pool.query(
      `INSERT INTO notifications (id, user_id, loan_id, notification_type, message)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        uuidv4(),
        dispute.borrower_id,
        dispute.loan_id,
        'dispute_resolved',
        `Dispute resolved: ${resolution}`
      ]
    );

    res.json({
      message: 'Dispute resolved',
      dispute: {
        id: updated.id,
        status: updated.status,
        resolution: updated.resolution,
        resolved_at: updated.resolved_at
      }
    });
  } catch (err) {
    console.error('[Dispute Resolve Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/disputes/admin/queue
 * Get all open disputes for admin dashboard
 * Uses the dispute_queue view
 */
router.get('/admin/queue', verifyToken, async (req, res) => {
  try {
    // In production, verify user is admin
    // if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin only' });

    const query = await pool.query(
      `SELECT * FROM dispute_queue WHERE status IN ('open', 'reviewing') ORDER BY created_at ASC`
    );

    res.json(query.rows);
  } catch (err) {
    console.error('[Admin Queue Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
