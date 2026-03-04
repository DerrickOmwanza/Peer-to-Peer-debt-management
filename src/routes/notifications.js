const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { verifyToken } = require('../middleware/auth');

// Get notifications for user
router.get('/', verifyToken, async (req, res) => {
  try {
    const limit = req.query.limit || 20;
    
    const notifications = await pool.query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [req.user.id, limit]
    );
    
    res.json(notifications.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Mark notification as read
router.patch('/:notificationId/read', verifyToken, async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    const notification = await pool.query(
      `UPDATE notifications SET status = 'read' WHERE id = $1 AND user_id = $2 RETURNING *`,
      [notificationId, req.user.id]
    );
    
    if (notification.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json(notification.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get unread count
router.get('/unread/count', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND status = 'unread'`,
      [req.user.id]
    );
    
    res.json({ unread_count: parseInt(result.rows[0].count) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
