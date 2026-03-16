const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { verifyToken } = require('../middleware/auth');

// Get current user's risk score
router.get('/score', verifyToken, async (req, res) => {
  try {
    const borrowerId = req.user.id;

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
        risk_score: score.risk_score,
        risk_band: score.risk_band,
        key_factors: score.key_factors,
        recommendation: score.recommendation,
        reasoning: score.reasoning,
        calculated_at: score.calculated_at,
        expires_at: score.expires_at,
        source: 'cached'
      });
    }

    // Query borrower metrics
    const metricsQuery = await pool.query(
      `SELECT 
        COUNT(*) as total_loans,
        COALESCE(SUM(CASE WHEN status = 'defaulted' THEN 1 ELSE 0 END)::float / 
          NULLIF(COUNT(*), 0) * 100, 0) as default_rate,
        COALESCE(AVG(EXTRACT(DAY FROM repayment_start_date - created_at)), 30) as avg_repayment_days,
        COUNT(DISTINCT DATE_TRUNC('quarter', created_at)) as loan_frequency
       FROM loans WHERE borrower_id = $1`,
      [borrowerId]
    );

    const rawMetrics = metricsQuery.rows[0];
    const metrics = {
      total_loans: Number(rawMetrics.total_loans) || 0,
      default_rate: parseFloat(rawMetrics.default_rate) || 0,
      avg_repayment_days: parseFloat(rawMetrics.avg_repayment_days) || 30,
      loan_frequency: Number(rawMetrics.loan_frequency) || 0,
    };

    // Simple risk scoring algorithm (no Nova for now)
    let riskScore = 50; // Starting baseline
    const factors = [];

    // Adjust based on default rate
    if (metrics.default_rate > 30) {
      riskScore += 30;
      factors.push('High default rate on previous loans');
    } else if (metrics.default_rate > 10) {
      riskScore += 15;
      factors.push('Some defaults on previous loans');
    } else if (metrics.default_rate === 0 && metrics.total_loans > 0) {
      riskScore -= 15;
      factors.push('Perfect repayment history');
    }

    // Adjust based on loan frequency
    if (metrics.loan_frequency >= 4) {
      riskScore -= 10;
      factors.push('Consistent loan activity');
    } else if (metrics.loan_frequency === 0) {
      riskScore += 10;
      factors.push('New borrower - no loan history');
    }

    // Adjust based on repayment days
    if (metrics.avg_repayment_days > 60) {
      riskScore += 10;
      factors.push('Long repayment periods');
    } else if (metrics.avg_repayment_days < 30) {
      riskScore -= 5;
      factors.push('Quick repayment periods');
    }

    // Determine risk band and recommendation
    let riskBand, recommendation;
    if (riskScore <= 33) {
      riskBand = 'Low';
      recommendation = 'Approve';
    } else if (riskScore <= 66) {
      riskBand = 'Medium';
      recommendation = 'Conditional';
    } else {
      riskBand = 'High';
      recommendation = 'Decline';
    }

    // Ensure score is within bounds
    riskScore = Math.max(0, Math.min(100, riskScore));

    // Create reasoning
    const reasoning = `Assessment based on ${metrics.total_loans} loan(s) with ${metrics.default_rate.toFixed(1)}% default rate. ` +
      `Average repayment period: ${metrics.avg_repayment_days.toFixed(0)} days. ` +
      factors.join(', ') + '.';

    // Save to database (upsert to handle unique constraint)
    const insertQuery = await pool.query(
      `INSERT INTO borrower_risk_scores 
       (borrower_id, risk_score, risk_band, key_factors, recommendation, reasoning) 
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (borrower_id) DO UPDATE SET
         risk_score = $2, risk_band = $3, key_factors = $4,
         recommendation = $5, reasoning = $6,
         calculated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [borrowerId, riskScore, riskBand, JSON.stringify(factors), recommendation, reasoning]
    );

    const savedScore = insertQuery.rows[0];

    res.json({
      risk_score: savedScore.risk_score,
      risk_band: savedScore.risk_band,
      key_factors: savedScore.key_factors,
      recommendation: savedScore.recommendation,
      reasoning: savedScore.reasoning,
      calculated_at: savedScore.calculated_at,
      expires_at: savedScore.expires_at,
      source: 'calculated'
    });
  } catch (err) {
    console.error('[Risk Score Error]:', err);
    res.status(500).json({ error: 'Failed to fetch risk score' });
  }
});

module.exports = router;
