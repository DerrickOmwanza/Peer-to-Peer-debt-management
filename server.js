const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./src/config/database');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/users', require('./src/routes/users'));
app.use('/api/loans', require('./src/routes/loans'));
app.use('/api/disputes', require('./src/routes/disputes'));
app.use('/api/transactions', require('./src/routes/transactions'));
app.use('/api/repayments', require('./src/routes/repayments'));
app.use('/api/notifications', require('./src/routes/notifications'));
app.use('/api/ussd', require('./src/routes/ussd'));
app.use('/api/sync', require('./src/routes/sync'));
app.use('/api/safaricom', require('./src/routes/safaricom'));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong', message: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Database connected');
});

module.exports = app;
