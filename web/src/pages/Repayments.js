import React, { useState, useEffect } from 'react';
import { repaymentAPI } from '../services/api';
import Navbar from '../components/Navbar';
import './Repayments.css';

export default function Repayments() {
  const [borrowerRepayments, setBorrowerRepayments] = useState([]);
  const [lenderRepayments, setLenderRepayments] = useState([]);
  const [activeTab, setActiveTab] = useState('paid');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRepayments();
  }, []);

  const fetchRepayments = async () => {
    try {
      const [borrowerRes, lenderRes] = await Promise.all([
        repaymentAPI.getBorrowerRepayments(),
        repaymentAPI.getLenderRepayments(),
      ]);
      setBorrowerRepayments(borrowerRes.data);
      setLenderRepayments(lenderRes.data);
    } catch (err) {
      setError('Failed to fetch repayments');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading repayments...</div>;

  const calculateTotals = (repayments) => {
    return {
      count: repayments.length,
      totalAmount: repayments.reduce((sum, r) => sum + parseFloat(r.amount_deducted), 0),
    };
  };

  const borrowerTotals = calculateTotals(borrowerRepayments);
  const lenderTotals = calculateTotals(lenderRepayments);

  return (
    <>
      <Navbar />
      <div className="repayments-container">
        <h1>Repayment History</h1>

        {error && <div className="error">{error}</div>}

        <div className="tabs">
          <button
            className={`tab-btn ${activeTab === 'paid' ? 'active' : ''}`}
            onClick={() => setActiveTab('paid')}
          >
            Repayments Made ({borrowerRepayments.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'received' ? 'active' : ''}`}
            onClick={() => setActiveTab('received')}
          >
            Repayments Received ({lenderRepayments.length})
          </button>
        </div>

        {activeTab === 'paid' && (
          <div className="repayments-view">
            {borrowerRepayments.length > 0 && (
              <div className="summary-card">
                <div className="summary-stat">
                  <span className="stat-label">Total Repayments Made:</span>
                  <span className="stat-value">
                    Ksh {borrowerTotals.totalAmount.toFixed(2)}
                  </span>
                </div>
                <div className="summary-stat">
                  <span className="stat-label">Number of Payments:</span>
                  <span className="stat-value">{borrowerTotals.count}</span>
                </div>
              </div>
            )}

            <div className="repayments-list">
              {borrowerRepayments.length > 0 ? (
                borrowerRepayments.map((repay) => (
                  <div key={repay.id} className="repayment-card">
                    <div className="repay-header">
                      <div className="repay-amount">
                        <span className="currency">Ksh</span>
                        <span className="amount">
                          {parseFloat(repay.amount_deducted).toFixed(2)}
                        </span>
                      </div>
                      <div className="repay-date">
                        {new Date(repay.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="repay-details">
                      <div className="detail">
                        <span className="label">Deducted From:</span>
                        <span className="value">Transaction</span>
                      </div>
                      <div className="detail">
                        <span className="label">Remaining Balance:</span>
                        <span className="value highlight">
                          Ksh {parseFloat(repay.remaining_balance_after).toFixed(2)}
                        </span>
                      </div>
                      <div className="detail">
                        <span className="label">Status:</span>
                        <span className={`status-tag ${repay.status}`}>
                          {repay.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="no-data">No repayments made yet</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'received' && (
          <div className="repayments-view">
            {lenderRepayments.length > 0 && (
              <div className="summary-card">
                <div className="summary-stat">
                  <span className="stat-label">Total Repayments Received:</span>
                  <span className="stat-value">
                    Ksh {lenderTotals.totalAmount.toFixed(2)}
                  </span>
                </div>
                <div className="summary-stat">
                  <span className="stat-label">Number of Payments:</span>
                  <span className="stat-value">{lenderTotals.count}</span>
                </div>
              </div>
            )}

            <div className="repayments-list">
              {lenderRepayments.length > 0 ? (
                lenderRepayments.map((repay) => (
                  <div key={repay.id} className="repayment-card">
                    <div className="repay-header">
                      <div className="repay-amount received">
                        <span className="currency">Ksh</span>
                        <span className="amount">
                          {parseFloat(repay.amount_deducted).toFixed(2)}
                        </span>
                      </div>
                      <div className="repay-date">
                        {new Date(repay.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="repay-details">
                      <div className="detail">
                        <span className="label">Received From:</span>
                        <span className="value">Borrower Transaction</span>
                      </div>
                      <div className="detail">
                        <span className="label">Loan Balance:</span>
                        <span className="value">
                          Ksh {parseFloat(repay.remaining_balance_after).toFixed(2)}
                        </span>
                      </div>
                      <div className="detail">
                        <span className="label">Status:</span>
                        <span className={`status-tag ${repay.status}`}>
                          {repay.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="no-data">No repayments received yet</p>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
