const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/database');
const { verifyToken } = require('../middleware/auth');

// Simulate incoming transaction (mock M-PESA)
router.post('/incoming', verifyToken, async (req, res) => {
  try {
    const { amount, source_phone, description } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
    // Create transaction record
    const transaction = await pool.query(
      `INSERT INTO transactions (id, user_id, amount, transaction_type, description, source_phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_id, amount, transaction_type, created_at`,
      [uuidv4(), req.user.id, amount, 'incoming', description || 'M-PESA transfer', source_phone || 'unknown']
    );
    
    // Update wallet balance
    await pool.query(
      `UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2`,
      [amount, req.user.id]
    );
    
    // Trigger repayment check
    await checkAndProcessRepayments(req.user.id, amount, transaction.rows[0].id);
    
    res.status(201).json({
      message: 'Transaction recorded successfully',
      transaction: transaction.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get user transactions
router.get('/', verifyToken, async (req, res) => {
  try {
    const transactions = await pool.query(
      'SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    
    res.json(transactions.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Helper function to process repayments
async function checkAndProcessRepayments(userId, incomingAmount, transactionId) {
  try {
    const threshold = parseInt(process.env.TRANSACTION_THRESHOLD || 100);
    
    if (incomingAmount < threshold) {
      return; // Below threshold, skip repayment processing
    }
    
    // Get active loans for this user as borrower
    const loans = await pool.query(
      `SELECT * FROM loans 
       WHERE borrower_id = $1 AND status = 'active' AND remaining_balance > 0
       ORDER BY created_at ASC`,
      [userId]
    );
    
    let remainingAmount = incomingAmount;
    
    for (const loan of loans.rows) {
      if (remainingAmount <= 0) break;
      
      let repaymentAmount = loan.repayment_amount;
      
      // If percentage-based, calculate actual amount
      if (loan.repayment_method === 'percentage') {
        repaymentAmount = (incomingAmount * loan.repayment_amount) / 100;
      }
      
      // Deduct repayment amount (can't exceed incoming amount or remaining balance)
      const deductedAmount = Math.min(
        repaymentAmount,
        Math.min(remainingAmount, loan.remaining_balance)
      );
      
      if (deductedAmount > 0) {
        const newBalance = loan.remaining_balance - deductedAmount;
        
        // Record repayment
        await pool.query(
          `INSERT INTO repayments (id, loan_id, amount_deducted, remaining_balance_after, transaction_id, status)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [uuidv4(), loan.id, deductedAmount, newBalance, transactionId, 'completed']
        );
        
        // Update loan balance
        const loanStatus = newBalance <= 0 ? 'completed' : 'active';
        await pool.query(
          `UPDATE loans SET remaining_balance = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
          [Math.max(0, newBalance), loanStatus, loan.id]
        );
        
        // Create notifications
        const borrower = await pool.query('SELECT phone_number FROM users WHERE id = $1', [userId]);
        const lender = await pool.query('SELECT phone_number FROM users WHERE id = $1', [loan.lender_id]);
        
        const borrowerMsg = `Ksh ${deductedAmount} deducted for loan repayment. Balance: Ksh ${newBalance}`;
        const lenderMsg = `Ksh ${deductedAmount} received from Borrower. Loan Balance: Ksh ${newBalance}`;
        
        await pool.query(
          `INSERT INTO notifications (id, user_id, loan_id, repayment_id, notification_type, message)
           VALUES ($1, $2, $3, NULL, $4, $5)`,
          [uuidv4(), userId, loan.id, 'repayment', borrowerMsg]
        );
        
        await pool.query(
          `INSERT INTO notifications (id, user_id, loan_id, repayment_id, notification_type, message)
           VALUES ($1, $2, $3, NULL, $4, $5)`,
          [uuidv4(), loan.lender_id, loan.id, 'repayment', lenderMsg]
        );
        
        remainingAmount -= deductedAmount;
      }
    }
  } catch (err) {
    console.error('Error processing repayments:', err.message);
  }
}

module.exports = router;
