import React, { useState, useEffect } from 'react';
import { loanAPI } from '../services/api';
import api from '../services/api';
import Navbar from '../components/Navbar';
import './MyLoans.css';

export default function MyLoans() {
  const [borrowerLoans, setBorrowerLoans] = useState([]);
  const [lenderLoans, setLenderLoans] = useState([]);
  const [activeTab, setActiveTab] = useState('borrowed');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [approving, setApproving] = useState(null);
  const [declining, setDeclining] = useState(null);
  const [viewingAgreement, setViewingAgreement] = useState(null);
  const [agreementContent, setAgreementContent] = useState('');
  const [loadingAgreement, setLoadingAgreement] = useState(false);

  useEffect(() => {
    fetchLoans();
  }, []);

  const handleViewAgreement = async (loanId) => {
    try {
      setLoadingAgreement(true);
      setViewingAgreement(loanId);
      const response = await api.get(`/loans/${loanId}/agreement`);
      setAgreementContent(response.data.agreement_text);
    } catch (err) {
      setError('Failed to fetch agreement');
      setViewingAgreement(null);
    } finally {
      setLoadingAgreement(false);
    }
  };

  const closeAgreementModal = () => {
    setViewingAgreement(null);
    setAgreementContent('');
  };

  const fetchLoans = async () => {
    try {
      const [borrowerRes, lenderRes] = await Promise.all([
        loanAPI.getBorrowerLoans(),
        loanAPI.getLenderLoans(),
      ]);
      setBorrowerLoans(borrowerRes.data);
      setLenderLoans(lenderRes.data);
    } catch (err) {
      setError('Failed to fetch loans');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#ffc107';
      case 'active':
        return '#28a745';
      case 'completed':
        return '#17a2b8';
      case 'declined':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  const handleApproveLoan = async (loanId) => {
    try {
      setApproving(loanId);
      await api.patch(`/loans/${loanId}/approval`, { approved: true });
      // Refresh loans
      fetchLoans();
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve loan');
    } finally {
      setApproving(null);
    }
  };

  const handleDeclineLoan = async (loanId) => {
    try {
      setDeclining(loanId);
      await api.patch(`/loans/${loanId}/approval`, { approved: false });
      fetchLoans();
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to decline loan');
    } finally {
      setDeclining(null);
    }
  };

  if (loading) return <div className="loading">Loading loans...</div>;

  return (
    <>
      <Navbar />
      <div className="loans-container">
        <h1>My Loans</h1>

        {error && <div className="error">{error}</div>}

        <div className="tabs">
          <button
            className={`tab-btn ${activeTab === 'borrowed' ? 'active' : ''}`}
            onClick={() => setActiveTab('borrowed')}
          >
            Loans Borrowed ({borrowerLoans.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'lent' ? 'active' : ''}`}
            onClick={() => setActiveTab('lent')}
          >
            Loans Lent ({lenderLoans.length})
          </button>
        </div>

        <div className="loans-content">
          {activeTab === 'borrowed' && (
            <div className="loans-grid">
              {borrowerLoans.length > 0 ? (
                borrowerLoans.map((loan) => (
                  <div key={loan.id} className="loan-card">
                    <div
                      className="status-indicator"
                      style={{ backgroundColor: getStatusColor(loan.status) }}
                    ></div>
                    <h3>{loan.lender_name}</h3>
                    <p className="phone">{loan.lender_phone}</p>

                    <div className="loan-details">
                      <div className="detail-row">
                        <span className="label">Principal:</span>
                        <span className="value">Ksh {loan.principal_amount}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Balance:</span>
                        <span className="value highlight">
                          Ksh {loan.remaining_balance}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Repayment:</span>
                        <span className="value">
                          Ksh {loan.repayment_amount} ({loan.repayment_method})
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Start Date:</span>
                        <span className="value">
                          {new Date(loan.repayment_start_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${
                            ((loan.principal_amount - loan.remaining_balance) /
                              loan.principal_amount) *
                            100
                          }%`,
                        }}
                      ></div>
                    </div>
                    <p className="progress-text">
                      {(
                        ((loan.principal_amount - loan.remaining_balance) /
                          loan.principal_amount) *
                        100
                      ).toFixed(0)}
                      % paid
                    </p>

                    <div className={`status-badge ${loan.status}`}>
                      {loan.status.toUpperCase()}
                    </div>

                    <button 
                      className="btn-view-agreement"
                      onClick={() => handleViewAgreement(loan.id)}
                    >
                      📄 View Agreement
                    </button>
                  </div>
                ))
              ) : (
                <p className="no-data">No loans borrowed yet</p>
              )}
            </div>
          )}

          {activeTab === 'lent' && (
            <div className="loans-grid">
              {lenderLoans.length > 0 ? (
                lenderLoans.map((loan) => (
                  <div
                    key={loan.id}
                    className={`loan-card${loan.status === 'pending' ? ' loan-card-pending' : ''}`}
                  >
                    <div
                      className="status-indicator"
                      style={{ backgroundColor: getStatusColor(loan.status) }}
                    ></div>

                    {loan.status === 'pending' && (
                      <div className="pending-banner">⏳ Pending Approval</div>
                    )}

                    <h3>{loan.borrower_name}</h3>
                    <p className="phone">{loan.borrower_phone}</p>

                    {loan.status === 'pending' ? (
                      <div className="loan-details">
                        <h4 className="section-title">Borrower Summary</h4>
                        <div className="detail-row">
                          <span className="label">Borrower Name:</span>
                          <span className="value">{loan.borrower_name}</span>
                        </div>
                        <div className="detail-row">
                          <span className="label">Borrower Phone:</span>
                          <span className="value">{loan.borrower_phone}</span>
                        </div>
                        <div className="detail-row">
                          <span className="label">Loan Amount:</span>
                          <span className="value highlight">
                            Ksh {loan.principal_amount}
                          </span>
                        </div>
                        <div className="detail-row">
                          <span className="label">Repayment Method:</span>
                          <span className="value">
                            {loan.repayment_method} — Ksh {loan.repayment_amount}
                          </span>
                        </div>
                        <div className="detail-row">
                          <span className="label">Start Date:</span>
                          <span className="value">
                            {new Date(loan.repayment_start_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="loan-details">
                        <div className="detail-row">
                          <span className="label">Principal:</span>
                          <span className="value">Ksh {loan.principal_amount}</span>
                        </div>
                        <div className="detail-row">
                          <span className="label">Received:</span>
                          <span className="value highlight">
                            Ksh{' '}
                            {loan.principal_amount - loan.remaining_balance}
                          </span>
                        </div>
                        <div className="detail-row">
                          <span className="label">Pending:</span>
                          <span className="value">Ksh {loan.remaining_balance}</span>
                        </div>
                        <div className="detail-row">
                          <span className="label">Start Date:</span>
                          <span className="value">
                            {new Date(loan.repayment_start_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    )}

                    {loan.status !== 'pending' && (
                      <>
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${
                                ((loan.principal_amount - loan.remaining_balance) /
                                  loan.principal_amount) *
                                100
                              }%`,
                            }}
                          ></div>
                        </div>
                        <p className="progress-text">
                          {(
                            ((loan.principal_amount - loan.remaining_balance) /
                              loan.principal_amount) *
                            100
                          ).toFixed(0)}
                          % received
                        </p>
                      </>
                    )}

                    <div className={`status-badge ${loan.status}`}>
                      {loan.status.toUpperCase()}
                    </div>

                    <button 
                      className="btn-view-agreement"
                      onClick={() => handleViewAgreement(loan.id)}
                    >
                      📄 View Agreement
                    </button>

                    {loan.status === 'pending' && (
                      <div className="pending-actions">
                        <button
                          className="btn-approve"
                          onClick={() => handleApproveLoan(loan.id)}
                          disabled={approving === loan.id || declining === loan.id}
                        >
                          {approving === loan.id ? 'Approving...' : 'Approve Loan'}
                        </button>
                        <button
                          className="btn-decline"
                          onClick={() => handleDeclineLoan(loan.id)}
                          disabled={declining === loan.id || approving === loan.id}
                        >
                          {declining === loan.id ? 'Declining...' : 'Decline'}
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="no-data">No loans lent yet</p>
              )}
            </div>
          )}
        </div>

        {viewingAgreement && (
          <div className="agreement-modal-overlay">
            <div className="agreement-modal">
              <div className="agreement-modal-header">
                <h2>Loan Agreement</h2>
                <button onClick={closeAgreementModal} className="close-btn">&times;</button>
              </div>
              <div className="agreement-modal-body">
                {loadingAgreement ? (
                  <p>Loading agreement details...</p>
                ) : (
                  <pre className="agreement-pre">{agreementContent}</pre>
                )}
              </div>
              <div className="agreement-modal-footer">
                <button onClick={closeAgreementModal} className="btn-close-modal">Close</button>
                <button onClick={() => window.print()} className="btn-print">🖨️ Print to PDF</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
