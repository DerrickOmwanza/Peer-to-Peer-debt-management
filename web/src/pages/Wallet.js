import React, { useState, useEffect } from 'react';
import { userAPI } from '../services/api';
import api from '../services/api';
import Navbar from '../components/Navbar';
import './Wallet.css';

export default function Wallet() {
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    fetchProfile();
    fetchTransactions();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await userAPI.getProfile();
      setBalance(response.data.wallet_balance);
    } catch (err) {
      setError('Failed to fetch wallet balance');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await api.get('/transactions');
      setTransactions(response.data || []);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    }
  };

  const handleAddFunds = async (e) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await userAPI.addFunds(parseFloat(amount));
      setBalance(response.data.wallet_balance);
      setSuccess(`Ksh ${amount} added to your wallet!`);
      setAmount('');
      
      // Refresh transactions
      fetchTransactions();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add funds');
    } finally {
      setSubmitting(false);
    }
  };

  const quickAmounts = [500, 1000, 2500, 5000, 10000];

  if (loading) return <div className="loading">Loading wallet...</div>;

  return (
    <>
      <Navbar />
      <div className="wallet-container">
        <h1>My Wallet</h1>

        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        {/* Balance Display */}
        <div className="balance-card">
          <div className="balance-content">
            <p className="balance-label">Current Balance</p>
            <p className="balance-amount">
              Ksh <span>{parseFloat(balance).toFixed(2)}</span>
            </p>
            <p className="balance-subtitle">Available for loans and repayments</p>
          </div>
        </div>

        {/* Add Funds Form */}
        <div className="card">
          <h2>Add Funds</h2>
          <p className="subtitle">
            Simulate receiving M-PESA funds to your wallet
          </p>

          {/* Quick Amount Buttons */}
          <div className="quick-amounts">
            <p className="quick-label">Quick Add:</p>
            <div className="quick-buttons">
              {quickAmounts.map((quickAmount) => (
                <button
                  key={quickAmount}
                  className="quick-btn"
                  onClick={() => setAmount(quickAmount.toString())}
                >
                  +Ksh {quickAmount}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleAddFunds}>
            <div className="form-group">
              <label>Amount (Ksh)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                min="1"
                step="100"
              />
            </div>

            <button type="submit" disabled={submitting} className="submit-btn">
              {submitting ? 'Processing...' : 'Add Funds'}
            </button>
          </form>
        </div>

        {/* Transaction History */}
        <div className="card">
          <h2>Transaction History</h2>
          {transactions.length === 0 ? (
            <p className="no-transactions">No transactions yet</p>
          ) : (
            <div className="transactions-list">
              {transactions.slice(0, 10).map((tx) => (
                <div key={tx.id} className="transaction-item">
                  <div className="tx-info">
                    <p className="tx-description">{tx.description || tx.transaction_type}</p>
                    <p className="tx-date">{new Date(tx.created_at).toLocaleString()}</p>
                  </div>
                  <div className={`tx-amount ${tx.transaction_type}`}>
                    {tx.transaction_type === 'incoming' ? '+' : '-'}Ksh {parseFloat(tx.amount).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Wallet Info */}
        <div className="card info-card">
          <h3>How It Works</h3>
          <ul className="info-list">
            <li>
              <span className="icon">💰</span>
              <div>
                <strong>Add Funds:</strong> Simulate receiving money to test your wallet
              </div>
            </li>
            <li>
              <span className="icon">🔄</span>
              <div>
                <strong>Auto Deduction:</strong> Loan repayments are automatically deducted
              </div>
            </li>
            <li>
              <span className="icon">📊</span>
              <div>
                <strong>Track Balance:</strong> Monitor your wallet balance in real-time
              </div>
            </li>
            <li>
              <span className="icon">📱</span>
              <div>
                <strong>Notifications:</strong> Get alerts for all wallet activities
              </div>
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}
