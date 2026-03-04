const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { verifyToken } = require('../middleware/auth');

// Get user profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await pool.query(
      'SELECT id, phone_number, full_name, email, wallet_balance, status, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Update wallet balance (mock)
router.post('/wallet/add-funds', verifyToken, async (req, res) => {
  try {
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
    const user = await pool.query(
      `UPDATE users 
       SET wallet_balance = wallet_balance + $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, wallet_balance`,
      [amount, req.user.id]
    );
    
    res.json({
      message: 'Funds added successfully',
      wallet_balance: user.rows[0].wallet_balance
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
