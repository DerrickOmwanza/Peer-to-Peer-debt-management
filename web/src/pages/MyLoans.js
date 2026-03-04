import React, { useState, useEffect } from 'react';
import { loanAPI } from '../services/api';
import Navbar from '../components/Navbar';
import './MyLoans.css';

export default function MyLoans() {
  const [borrowerLoans, setBorrowerLoans] = useState([]);
  const [lenderLoans, setLenderLoans] = useState([]);
  const [activeTab, setActiveTab] = useState('borrowed');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLoans();
  }, []);

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
                  <div key={loan.id} className="loan-card">
                    <div
                      className="status-indicator"
                      style={{ backgroundColor: getStatusColor(loan.status) }}
                    ></div>
                    <h3>{loan.borrower_name}</h3>
                    <p className="phone">{loan.borrower_phone}</p>

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

                    <div className={`status-badge ${loan.status}`}>
                      {loan.status.toUpperCase()}
                    </div>
                  </div>
                ))
              ) : (
                <p className="no-data">No loans lent yet</p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
