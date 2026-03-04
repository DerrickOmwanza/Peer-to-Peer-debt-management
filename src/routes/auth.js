const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/database');

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

// Register
router.post('/register', async (req, res) => {
  try {
    const { phone_number, full_name, email, password } = req.body;
    
    // Validate input
    if (!phone_number || !full_name || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(phone_number);
    
    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR phone_number = $2',
      [email, normalizedPhone]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = await pool.query(
      `INSERT INTO users (id, phone_number, full_name, email, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, phone_number, full_name, email, created_at`,
      [uuidv4(), normalizedPhone, full_name, email, hashedPassword]
    );
    
    res.status(201).json({
      message: 'User registered successfully',
      user: user.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }
    
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (user.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const validPassword = await bcrypt.compare(password, user.rows[0].password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: user.rows[0].id, email: user.rows[0].email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.rows[0].id,
        phone_number: user.rows[0].phone_number,
        full_name: user.rows[0].full_name,
        email: user.rows[0].email,
        wallet_balance: user.rows[0].wallet_balance
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
