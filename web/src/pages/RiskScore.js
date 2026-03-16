import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../services/api';
import './RiskScore.css';

const RiskScore = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [riskScore, setRiskScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRiskScore = async () => {
      try {
        setLoading(true);
        const response = await api.get('/risk/score');
        setRiskScore(response.data);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch risk score');
        setRiskScore(null);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchRiskScore();
    }
  }, [user]);

  const getRiskBandColor = (band) => {
    switch (band) {
      case 'Low': return '#10b981';
      case 'Medium': return '#f59e0b';
      case 'High': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getRiskBandIcon = (band) => {
    switch (band) {
      case 'Low': return '✅';
      case 'Medium': return '⚠️';
      case 'High': return '🚨';
      default: return '📊';
    }
  };

  const getScorePercentage = (score) => {
    return Math.min(100, Math.max(0, score));
  };

  return (
    <>
    <Navbar />
    <div className="risk-page">
      <div className="risk-page-header">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>
          ← Back to Dashboard
        </button>
        <div className="page-title-section">
          <h1>📊 Risk Score Assessment</h1>
          <p className="page-subtitle">
            Your creditworthiness score based on loan history and repayment behaviour
          </p>
        </div>
      </div>

      {loading && (
        <div className="risk-loading-card">
          <div className="loading-spinner"></div>
          <p>Analyzing your risk profile...</p>
        </div>
      )}

      {error && !loading && (
        <div className="risk-error-card">
          <div className="error-icon">⚠️</div>
          <h3>Unable to Generate Risk Score</h3>
          <p>{error}</p>
          <p className="error-hint">Your risk assessment will be available after your first loan activity.</p>
        </div>
      )}

      {!loading && !error && riskScore && (
        <div className="risk-content">
          {/* Score Overview Card */}
          <div className="score-overview-card">
            <div className="score-ring-container">
              <svg className="score-ring" viewBox="0 0 120 120">
                <circle className="score-ring-bg" cx="60" cy="60" r="52" />
                <circle
                  className="score-ring-fill"
                  cx="60" cy="60" r="52"
                  style={{
                    strokeDashoffset: 327 - (327 * getScorePercentage(riskScore.risk_score)) / 100,
                    stroke: getRiskBandColor(riskScore.risk_band)
                  }}
                />
              </svg>
              <div className="score-ring-text">
                <span className="score-value" style={{ color: getRiskBandColor(riskScore.risk_band) }}>
                  {riskScore.risk_score}
                </span>
                <span className="score-of">/100</span>
              </div>
            </div>
            <div className="score-summary">
              <span
                className="risk-band-badge"
                style={{ backgroundColor: getRiskBandColor(riskScore.risk_band) }}
              >
                {getRiskBandIcon(riskScore.risk_band)} {riskScore.risk_band} Risk
              </span>
              <div className="recommendation-tag">
                <span className="rec-label">Recommendation</span>
                <span className="rec-value">{riskScore.recommendation}</span>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="risk-details-grid">
            {/* Reasoning Card */}
            <div className="detail-card reasoning-card">
              <div className="detail-card-header">
                <span className="detail-icon">📋</span>
                <h3>Assessment Summary</h3>
              </div>
              <p className="reasoning-text">{riskScore.reasoning}</p>
            </div>

            {/* Key Factors Card */}
            {riskScore.key_factors && riskScore.key_factors.length > 0 && (
              <div className="detail-card factors-card">
                <div className="detail-card-header">
                  <span className="detail-icon">🔍</span>
                  <h3>Key Factors</h3>
                </div>
                <ul className="factors-list">
                  {riskScore.key_factors.map((factor, idx) => (
                    <li key={idx}>
                      <span className="factor-bullet">•</span>
                      {factor}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Meta Info Card */}
            <div className="detail-card meta-card">
              <div className="detail-card-header">
                <span className="detail-icon">📅</span>
                <h3>Score Details</h3>
              </div>
              <div className="meta-items">
                <div className="meta-row">
                  <span className="meta-label">Assessed On</span>
                  <span className="meta-value">
                    {new Date(riskScore.calculated_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}
                  </span>
                </div>
                {riskScore.expires_at && (
                  <div className="meta-row">
                    <span className="meta-label">Valid Until</span>
                    <span className="meta-value">
                      {new Date(riskScore.expires_at).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </span>
                  </div>
                )}
                <div className="meta-row">
                  <span className="meta-label">Source</span>
                  <span className="meta-value capitalize">{riskScore.source}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Score Guide */}
          <div className="score-guide">
            <h3>Understanding Your Score</h3>
            <div className="guide-bands">
              <div className="guide-band">
                <div className="guide-bar" style={{ backgroundColor: '#10b981' }}></div>
                <div className="guide-info">
                  <strong>Low Risk (0–33)</strong>
                  <p>Strong reliability. Likely to receive favourable loan terms.</p>
                </div>
              </div>
              <div className="guide-band">
                <div className="guide-bar" style={{ backgroundColor: '#f59e0b' }}></div>
                <div className="guide-info">
                  <strong>Medium Risk (34–66)</strong>
                  <p>Moderate history. Standard lending terms may apply.</p>
                </div>
              </div>
              <div className="guide-band">
                <div className="guide-bar" style={{ backgroundColor: '#ef4444' }}></div>
                <div className="guide-info">
                  <strong>High Risk (67–100)</strong>
                  <p>Concerns identified. May face higher rates or stricter conditions.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && !riskScore && (
        <div className="risk-empty-card">
          <div className="empty-icon">📊</div>
          <h3>No Risk Score Available</h3>
          <p>Your risk assessment will be generated after your first loan activity.</p>
          <button className="back-btn-alt" onClick={() => navigate('/dashboard')}>
            Go to Dashboard
          </button>
        </div>
      )}
    </div>
    </>
  );
};

export default RiskScore;
