/**
 * AdminDashboard Component
 * Shows dispute queue with Nova analysis and admin actions
 * Displays statistics and allows resolution of disputes
 */

import React, { useState, useEffect } from 'react';
import { getDisputeQueue, getAdminStats, resolveDispute } from '../services/novaApi';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [disputes, setDisputes] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [resolvingId, setResolvingId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    // Fetch both disputes and stats in parallel
    const [disputeResult, statsResult] = await Promise.all([
      getDisputeQueue(),
      getAdminStats()
    ]);

    if (disputeResult.success) {
      setDisputes(disputeResult.data);
    } else {
      setError(disputeResult.error);
    }

    if (statsResult.success) {
      setStats(statsResult.data);
    }

    setLoading(false);
  };

  const handleResolveDispute = async () => {
    if (!selectedDispute || !resolutionNote.trim()) {
      alert('Please provide a resolution note');
      return;
    }

    setResolvingId(selectedDispute.id);

    const result = await resolveDispute(selectedDispute.id, {
      resolution: resolutionNote,
      status: 'resolved'
    });

    setResolvingId(null);

    if (result.success) {
      // Remove from disputes list
      setDisputes((prev) =>
        prev.filter((d) => d.id !== selectedDispute.id)
      );
      setSelectedDispute(null);
      setResolutionNote('');
      alert('Dispute resolved successfully');
    } else {
      alert(`Failed to resolve: ${result.error}`);
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return '#10b981';
    if (confidence >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getDaysOpen = (createdAt) => {
    const days = Math.floor(
      (new Date() - new Date(createdAt)) / (1000 * 60 * 60 * 24)
    );
    return days;
  };

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <button onClick={fetchData} className="refresh-btn">
          🔄 Refresh
        </button>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="stats-section">
          <div className="stat-card">
            <h3>Total Loans</h3>
            <p className="stat-number">{stats.loans?.total_loans || 0}</p>
          </div>
          <div className="stat-card">
            <h3>Active Loans</h3>
            <p className="stat-number">{stats.loans?.active_loans || 0}</p>
          </div>
          <div className="stat-card">
            <h3>Total Disputes</h3>
            <p className="stat-number">{stats.disputes?.total_disputes || 0}</p>
          </div>
          <div className="stat-card highlight">
            <h3>Open Disputes</h3>
            <p className="stat-number">{stats.disputes?.open_disputes || 0}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="error-message">
          <span>⚠️</span>
          <span>{error}</span>
          <button onClick={fetchData} className="retry-btn">
            Retry
          </button>
        </div>
      )}

      {/* Dispute Queue */}
      <div className="dispute-queue-section">
        <h2>Dispute Queue ({disputes.length})</h2>

        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading disputes...</p>
          </div>
        ) : disputes.length === 0 ? (
          <div className="empty-state">
            <p>No open disputes 🎉</p>
          </div>
        ) : (
          <div className="disputes-list">
            {disputes.map((dispute) => (
              <div
                key={dispute.id}
                className={`dispute-item ${
                  selectedDispute?.id === dispute.id ? 'selected' : ''
                }`}
                onClick={() => setSelectedDispute(dispute)}
              >
                <div className="dispute-header">
                  <div className="dispute-title">
                    <h3>{dispute.reason?.substring(0, 60)}...</h3>
                    <span className="days-open">
                      {getDaysOpen(dispute.created_at)} days ago
                    </span>
                  </div>
                  <div className="dispute-parties">
                    <span className="party-badge">
                      {dispute.borrower_name} → {dispute.lender_name}
                    </span>
                    <span className="amount-badge">
                      Ksh {dispute.principal_amount?.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Nova Analysis Compact */}
                {dispute.nova_summary && (
                  <div className="dispute-nova-compact">
                    <p className="nova-summary">{dispute.nova_summary}</p>

                    <div className="nova-badges">
                      {dispute.nova_suggestion && (
                        <span className="badge-suggestion">
                          💡 {dispute.nova_suggestion?.substring(0, 40)}...
                        </span>
                      )}
                      {dispute.nova_confidence && (
                        <span
                          className="badge-confidence"
                          style={{
                            backgroundColor: getConfidenceColor(
                              dispute.nova_confidence
                            )
                          }}
                        >
                          {dispute.nova_confidence}% confidence
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selectedDispute && (
        <div className="detail-panel">
          <div className="panel-header">
            <h2>Dispute Details</h2>
            <button
              className="close-btn"
              onClick={() => {
                setSelectedDispute(null);
                setResolutionNote('');
              }}
            >
              ✕
            </button>
          </div>

          <div className="panel-content">
            {/* Dispute Info */}
            <section className="section">
              <h3>Dispute Information</h3>
              <div className="info-grid">
                <div className="info-row">
                  <span className="label">Borrower:</span>
                  <span className="value">{selectedDispute.borrower_name}</span>
                </div>
                <div className="info-row">
                  <span className="label">Lender:</span>
                  <span className="value">{selectedDispute.lender_name}</span>
                </div>
                <div className="info-row">
                  <span className="label">Loan Amount:</span>
                  <span className="value">
                    Ksh {selectedDispute.principal_amount?.toLocaleString()}
                  </span>
                </div>
                <div className="info-row">
                  <span className="label">Days Open:</span>
                  <span className="value">
                    {getDaysOpen(selectedDispute.created_at)} days
                  </span>
                </div>
              </div>
            </section>

            {/* Reason */}
            <section className="section">
              <h3>Dispute Reason</h3>
              <p className="reason-text">{selectedDispute.reason}</p>
            </section>

            {/* Nova Analysis */}
            {selectedDispute.nova_summary && (
              <section className="section nova-section">
                <h3>Amazon Nova Analysis</h3>

                <div className="nova-item">
                  <h4>Summary</h4>
                  <p>{selectedDispute.nova_summary}</p>
                </div>

                {selectedDispute.nova_suggestion && (
                  <div className="nova-item">
                    <h4>Recommendation</h4>
                    <p>{selectedDispute.nova_suggestion}</p>
                  </div>
                )}

                {selectedDispute.nova_confidence && (
                  <div className="nova-item confidence">
                    <h4>Confidence Level</h4>
                    <div className="confidence-display">
                      <div className="confidence-bar">
                        <div
                          className="confidence-fill"
                          style={{
                            width: `${selectedDispute.nova_confidence}%`,
                            backgroundColor: getConfidenceColor(
                              selectedDispute.nova_confidence
                            )
                          }}
                        ></div>
                      </div>
                      <span className="confidence-value">
                        {selectedDispute.nova_confidence}%
                      </span>
                    </div>
                  </div>
                )}

                {selectedDispute.nova_flags &&
                  selectedDispute.nova_flags.length > 0 && (
                    <div className="nova-item">
                      <h4>Flags</h4>
                      <ul className="flags-list">
                        {selectedDispute.nova_flags.map((flag, index) => (
                          <li key={index}>🚩 {flag}</li>
                        ))}
                      </ul>
                    </div>
                  )}
              </section>
            )}

            {/* Resolution Form */}
            <section className="section resolution-section">
              <h3>Resolve Dispute</h3>
              <textarea
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="Enter your resolution note (required)..."
                className="resolution-textarea"
                rows={4}
                disabled={resolvingId === selectedDispute.id}
              />
              <div className="resolution-buttons">
                <button
                  onClick={handleResolveDispute}
                  className="btn btn-resolve"
                  disabled={resolvingId === selectedDispute.id}
                >
                  {resolvingId === selectedDispute.id ? (
                    <>
                      <span className="btn-spinner"></span>
                      Resolving...
                    </>
                  ) : (
                    '✓ Resolve Dispute'
                  )}
                </button>
                <button
                  onClick={() => {
                    setSelectedDispute(null);
                    setResolutionNote('');
                  }}
                  className="btn btn-cancel"
                >
                  Cancel
                </button>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
