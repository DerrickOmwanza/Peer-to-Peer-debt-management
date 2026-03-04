/**
 * RiskScoreCard Component
 * Displays Amazon Nova risk assessment for a borrower
 * Shows risk score, band, key factors, and recommendation
 */

import React, { useState, useEffect } from 'react';
import { getRiskScore } from '../services/novaApi';
import './RiskScoreCard.css';

const RiskScoreCard = ({ borrowerId, borrowerName = 'Borrower' }) => {
  const [riskScore, setRiskScore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (borrowerId) {
      fetchRiskScore();
    }
  }, [borrowerId]);

  const fetchRiskScore = async () => {
    setLoading(true);
    setError(null);

    const result = await getRiskScore(borrowerId);

    if (result.success) {
      setRiskScore(result.data);
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  const getRiskColor = (band) => {
    switch (band) {
      case 'Low':
        return '#10b981'; // Green
      case 'Medium':
        return '#f59e0b'; // Amber
      case 'High':
        return '#ef4444'; // Red
      default:
        return '#6b7280'; // Gray
    }
  };

  const getRecommendationColor = (recommendation) => {
    switch (recommendation) {
      case 'Approve':
        return '#10b981';
      case 'Decline':
        return '#ef4444';
      case 'Conditional':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div className="risk-score-card loading">
        <div className="spinner"></div>
        <p>Computing Nova risk assessment...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="risk-score-card error">
        <div className="error-icon">⚠️</div>
        <h3>Unable to Compute Risk Score</h3>
        <p>{error}</p>
        <button onClick={fetchRiskScore} className="retry-btn">
          Retry
        </button>
      </div>
    );
  }

  if (!riskScore) {
    return (
      <div className="risk-score-card empty">
        <p>No risk score available</p>
      </div>
    );
  }

  const scorePercentage = riskScore.riskScore || 0;
  const riskColor = getRiskColor(riskScore.riskBand);
  const recommendationColor = getRecommendationColor(riskScore.recommendation);

  return (
    <div className="risk-score-card">
      {/* Header */}
      <div className="risk-card-header">
        <h2>Risk Assessment for {borrowerName}</h2>
        <span className="nova-badge">Powered by Amazon Nova</span>
      </div>

      {/* Score Section */}
      <div className="score-section">
        <div className="score-circle" style={{ borderColor: riskColor }}>
          <div className="score-value">{scorePercentage}</div>
          <div className="score-max">/100</div>
        </div>

        <div className="score-info">
          <div className="risk-band">
            <span className="risk-label">Risk Band:</span>
            <span
              className="risk-badge"
              style={{ backgroundColor: riskColor, color: 'white' }}
            >
              {riskScore.riskBand}
            </span>
          </div>

          <div className="recommendation">
            <span className="rec-label">Recommendation:</span>
            <button
              className="rec-button"
              style={{ backgroundColor: recommendationColor }}
            >
              {riskScore.recommendation}
            </button>
          </div>
        </div>
      </div>

      {/* Reasoning */}
      {riskScore.reasoning && (
        <div className="reasoning-section">
          <h4>Analysis</h4>
          <p>{riskScore.reasoning}</p>
        </div>
      )}

      {/* Key Factors */}
      <div className="factors-section">
        <h4>Key Factors</h4>
        <ul className="factors-list">
          {riskScore.keyFactors && riskScore.keyFactors.length > 0 ? (
            riskScore.keyFactors.map((factor, index) => (
              <li key={index} className="factor-item">
                <span className="factor-icon">▸</span>
                {factor}
              </li>
            ))
          ) : (
            <li className="factor-item">No factors available</li>
          )}
        </ul>
      </div>

      {/* Source Information */}
      <div className="source-info">
        <p>
          Score computed {riskScore.source === 'cached' ? 'from cache' : 'by Nova 2 Lite'}
          {riskScore.calculatedAt && (
            <>
              {' '}
              on{' '}
              {new Date(riskScore.calculatedAt).toLocaleDateString()}
            </>
          )}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button onClick={fetchRiskScore} className="refresh-btn">
          🔄 Refresh Score
        </button>
      </div>
    </div>
  );
};

export default RiskScoreCard;
