const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { verifyToken } = require('../middleware/auth');

// Get repayment history for a loan
router.get('/loan/:loanId', verifyToken, async (req, res) => {
  try {
    const { loanId } = req.params;
    
    // Verify user is borrower or lender
    const loan = await pool.query(
      'SELECT borrower_id, lender_id FROM loans WHERE id = $1',
      [loanId]
    );
    
    if (loan.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }
    
    const isParty = loan.rows[0].borrower_id === req.user.id || loan.rows[0].lender_id === req.user.id;
    if (!isParty) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const repayments = await pool.query(
      `SELECT * FROM repayments WHERE loan_id = $1 ORDER BY created_at DESC`,
      [loanId]
    );
    
    res.json(repayments.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get all repayments for borrower
router.get('/borrower/all', verifyToken, async (req, res) => {
  try {
    const repayments = await pool.query(
      `SELECT r.*, l.principal_amount, l.lender_id
       FROM repayments r
       JOIN loans l ON r.loan_id = l.id
       WHERE l.borrower_id = $1
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );
    
    res.json(repayments.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get all repayments for lender
router.get('/lender/all', verifyToken, async (req, res) => {
  try {
    const repayments = await pool.query(
      `SELECT r.*, l.principal_amount, l.borrower_id
       FROM repayments r
       JOIN loans l ON r.loan_id = l.id
       WHERE l.lender_id = $1
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );
    
    res.json(repayments.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
