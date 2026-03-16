import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../services/api';
import './Disputes.css';

const Disputes = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [disputes, setDisputes] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [formData, setFormData] = useState({
    loan_id: '',
    reason: '',
    evidence: ''
  });

  useEffect(() => {
    fetchDisputes();
    fetchLoans();
  }, []);

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/disputes');
      setDisputes(response.data || []);
      setError(null);
    } catch (err) {
      setError('Failed to fetch disputes');
      setDisputes([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLoans = async () => {
    try {
      const response = await api.get('/loans/borrower');
      setLoans(response.data || []);
    } catch (err) {
      console.error('Failed to fetch loans:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.loan_id || !formData.reason) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      await api.post('/disputes/create', {
        loan_id: formData.loan_id,
        reason: formData.reason,
        evidence: formData.evidence || null
      });

      setSuccess('Dispute filed successfully');
      setFormData({ loan_id: '', reason: '', evidence: '' });
      setShowForm(false);
      fetchDisputes();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to file dispute');
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      open: { label: 'Open', className: 'status-open', icon: '🟡' },
      reviewing: { label: 'Under Review', className: 'status-reviewing', icon: '🔵' },
      resolved: { label: 'Resolved', className: 'status-resolved', icon: '🟢' },
      escalated: { label: 'Escalated', className: 'status-escalated', icon: '🔴' },
    };
    return configs[status] || configs.open;
  };

  const openCount = disputes.filter(d => d.status === 'open' || d.status === 'reviewing').length;
  const resolvedCount = disputes.filter(d => d.status === 'resolved').length;

  return (
    <>
    <Navbar />
    <div className="disputes-page">
      {/* Header */}
      <div className="disputes-page-header">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>
          ← Back to Dashboard
        </button>
        <div className="page-title-section">
          <h1>⚖️ Disputes & Resolutions</h1>
          <p className="page-subtitle">File, track, and resolve disputes related to your loans</p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="d-alert d-alert-error">
          <span>⚠️</span> {error}
          <button className="alert-close" onClick={() => setError(null)}>×</button>
        </div>
      )}
      {success && (
        <div className="d-alert d-alert-success">
          <span>✅</span> {success}
        </div>
      )}

      {/* Stats Bar */}
      <div className="disputes-stats-bar">
        <div className="stat-chip">
          <span className="stat-number">{disputes.length}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat-chip stat-open">
          <span className="stat-number">{openCount}</span>
          <span className="stat-label">Active</span>
        </div>
        <div className="stat-chip stat-resolved">
          <span className="stat-number">{resolvedCount}</span>
          <span className="stat-label">Resolved</span>
        </div>
        <div className="stat-action">
          <button className="file-btn" onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕ Cancel' : '+ File New Dispute'}
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="dispute-form-card">
          <h2>📝 File a New Dispute</h2>
          <form onSubmit={handleSubmit} className="dispute-form">
            <div className="form-group">
              <label htmlFor="loan_id">Select Loan <span className="required">*</span></label>
              <select id="loan_id" name="loan_id" value={formData.loan_id} onChange={handleInputChange} required>
                <option value="">Choose a loan...</option>
                {loans.map(loan => (
                  <option key={loan.id} value={loan.id}>
                    Loan from {loan.lender_name} – Ksh {loan.principal_amount} ({loan.status})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="reason">Reason for Dispute <span className="required">*</span></label>
              <textarea
                id="reason" name="reason" value={formData.reason}
                onChange={handleInputChange}
                placeholder="Describe the issue clearly..."
                rows="4" required
              />
            </div>
            <div className="form-group">
              <label htmlFor="evidence">Supporting Evidence</label>
              <textarea
                id="evidence" name="evidence" value={formData.evidence}
                onChange={handleInputChange}
                placeholder="Provide any supporting details, screenshots, or references..."
                rows="3"
              />
            </div>
            <div className="form-actions">
              <button type="button" className="cancel-btn" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Filing...' : 'Submit Dispute'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Disputes List */}
      <div className="disputes-list-section">
        <h2>Your Disputes</h2>

        {loading && !showForm ? (
          <div className="disputes-loading">
            <div className="loading-spinner"></div>
            <p>Loading disputes...</p>
          </div>
        ) : disputes.length === 0 ? (
          <div className="disputes-empty">
            <div className="empty-icon">📭</div>
            <h3>No Disputes Filed</h3>
            <p>You haven't filed any disputes yet. If you have concerns about a loan, you can file one above.</p>
          </div>
        ) : (
          <div className="disputes-grid">
            {disputes.map(dispute => {
              const statusCfg = getStatusConfig(dispute.status);
              return (
                <div key={dispute.id} className="dispute-card">
                  <div className="dispute-card-top">
                    <div className="dispute-id">
                      #{dispute.id.substring(0, 8).toUpperCase()}
                    </div>
                    <span className={`status-pill ${statusCfg.className}`}>
                      {statusCfg.icon} {statusCfg.label}
                    </span>
                  </div>

                  <div className="dispute-card-body">
                    <div className="dispute-field">
                      <span className="field-label">Loan</span>
                      <span className="field-value">{dispute.loan_id.substring(0, 8)}...</span>
                    </div>
                    <div className="dispute-field">
                      <span className="field-label">Filed</span>
                      <span className="field-value">
                        {new Date(dispute.created_at).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="dispute-reason">
                      <span className="field-label">Reason</span>
                      <p>{dispute.reason}</p>
                    </div>
                  </div>

                  {(dispute.nova_summary || dispute.nova_suggestion) && (
                    <div className="nova-section">
                      <div className="nova-header">⚡ AI Analysis</div>
                      {dispute.nova_summary && (
                        <p className="nova-text">{dispute.nova_summary}</p>
                      )}
                      {dispute.nova_suggestion && (
                        <div className="nova-suggestion">
                          <strong>Suggestion:</strong> {dispute.nova_suggestion}
                        </div>
                      )}
                      {dispute.nova_confidence > 0 && (
                        <div className="nova-confidence">
                          Confidence: <strong>{dispute.nova_confidence}%</strong>
                        </div>
                      )}
                    </div>
                  )}

                  {dispute.resolution && (
                    <div className="resolution-section">
                      <div className="resolution-header">✅ Resolution</div>
                      <p>{dispute.resolution}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default Disputes;
