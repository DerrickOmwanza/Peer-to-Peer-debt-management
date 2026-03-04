/**
 * DisputeForm Component
 * Allows users to file disputes with evidence
 * Shows Nova Act analysis and recommendation
 */

import React, { useState } from 'react';
import { createDispute } from '../services/novaApi';
import './DisputeForm.css';

const DisputeForm = ({ loanId, borrowerName, lenderName, amount, onDisputeCreated }) => {
  const [formData, setFormData] = useState({
    reason: '',
    evidence: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [novaAnalysis, setNovaAnalysis] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.reason.trim()) {
      setError('Please provide a reason for the dispute');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setNovaAnalysis(null);

    const result = await createDispute({
      loan_id: loanId,
      reason: formData.reason,
      evidence: {
        type: 'text',
        content: formData.evidence || 'No evidence provided'
      }
    });

    setLoading(false);

    if (result.success) {
      setSuccess('Dispute filed successfully');
      setNovaAnalysis(result.data.dispute.nova_analysis);
      setFormData({ reason: '', evidence: '' });

      // Callback to parent component
      if (onDisputeCreated) {
        onDisputeCreated(result.data.dispute);
      }

      // Auto-hide form after 3 seconds
      setTimeout(() => {
        setIsExpanded(false);
      }, 3000);
    } else {
      setError(result.error || 'Failed to file dispute');
    }
  };

  const handleReset = () => {
    setFormData({ reason: '', evidence: '' });
    setError(null);
    setSuccess(null);
    setNovaAnalysis(null);
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return '#10b981'; // Green
    if (confidence >= 60) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  return (
    <div className="dispute-form-container">
      {/* Header / Toggle */}
      <button
        className="dispute-toggle-btn"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="toggle-icon">{isExpanded ? '▼' : '▶'}</span>
        <span className="toggle-text">
          {isExpanded ? 'Hide Dispute Form' : 'File a Dispute'}
        </span>
      </button>

      {/* Form (Collapsed/Expanded) */}
      {isExpanded && (
        <div className="dispute-form-card">
          {/* Loan Info Banner */}
          <div className="loan-info-banner">
            <div className="info-item">
              <span className="info-label">Loan Amount:</span>
              <span className="info-value">Ksh {amount?.toLocaleString()}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Lender:</span>
              <span className="info-value">{lenderName}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Borrower:</span>
              <span className="info-value">{borrowerName}</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="dispute-form">
            {/* Reason Field */}
            <div className="form-group">
              <label htmlFor="reason" className="form-label">
                Dispute Reason <span className="required">*</span>
              </label>
              <textarea
                id="reason"
                name="reason"
                value={formData.reason}
                onChange={handleInputChange}
                placeholder="Describe the reason for your dispute (e.g., 'Repayment was made but not recorded')"
                className="form-textarea"
                rows={4}
                disabled={loading}
              />
              <span className="char-count">
                {formData.reason.length} / 1000
              </span>
            </div>

            {/* Evidence Field */}
            <div className="form-group">
              <label htmlFor="evidence" className="form-label">
                Evidence / Details (Optional)
              </label>
              <textarea
                id="evidence"
                name="evidence"
                value={formData.evidence}
                onChange={handleInputChange}
                placeholder="Provide any additional evidence or details (e.g., M-PESA reference, dates, conversation screenshots)"
                className="form-textarea"
                rows={3}
                disabled={loading}
              />
              <span className="char-count">
                {formData.evidence.length} / 2000
              </span>
            </div>

            {/* Alerts */}
            {error && (
              <div className="alert alert-error">
                <span className="alert-icon">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="alert alert-success">
                <span className="alert-icon">✓</span>
                <span>{success}</span>
              </div>
            )}

            {/* Nova Analysis Result */}
            {novaAnalysis && (
              <div className="nova-analysis-result">
                <h4 className="analysis-title">Nova AI Analysis</h4>

                <div className="analysis-item">
                  <span className="analysis-label">Summary:</span>
                  <p className="analysis-text">{novaAnalysis.summary}</p>
                </div>

                <div className="analysis-item">
                  <span className="analysis-label">Recommendation:</span>
                  <p className="analysis-text">{novaAnalysis.suggestion}</p>
                </div>

                <div className="analysis-item confidence-item">
                  <span className="analysis-label">Confidence:</span>
                  <div className="confidence-bar">
                    <div
                      className="confidence-fill"
                      style={{
                        width: `${novaAnalysis.confidence}%`,
                        backgroundColor: getConfidenceColor(novaAnalysis.confidence)
                      }}
                    ></div>
                  </div>
                  <span className="confidence-text">{novaAnalysis.confidence}%</span>
                </div>

                {novaAnalysis.flags && novaAnalysis.flags.length > 0 && (
                  <div className="analysis-item">
                    <span className="analysis-label">Flags:</span>
                    <ul className="flags-list">
                      {novaAnalysis.flags.map((flag, index) => (
                        <li key={index} className="flag-item">
                          🚩 {flag}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Buttons */}
            <div className="form-buttons">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="btn-spinner"></span>
                    Filing Dispute...
                  </>
                ) : (
                  'File Dispute'
                )}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleReset}
                disabled={loading}
              >
                Clear
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default DisputeForm;
