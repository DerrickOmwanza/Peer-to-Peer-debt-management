import React, { useState, useEffect } from 'react';
import { transactionAPI } from '../services/api';
import Navbar from '../components/Navbar';
import './Transactions.css';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [simulating, setSimulating] = useState(false);
  const [simulateForm, setSimulateForm] = useState({
    amount: '1000',
    source_phone: '+254705555555',
    description: 'Payment from client',
  });

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await transactionAPI.getTransactions();
      setTransactions(response.data);
    } catch (err) {
      setError('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = async (e) => {
    e.preventDefault();
    setSimulating(true);
    setError('');
    setSuccess('');

    try {
      await transactionAPI.simulateIncoming(simulateForm);
      setSuccess('Transaction simulated! Repayment triggered if applicable.');
      setSimulateForm({
        amount: '1000',
        source_phone: '+254705555555',
        description: 'Payment from client',
      });
      setTimeout(() => {
        fetchTransactions();
        setSuccess('');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to simulate transaction');
    } finally {
      setSimulating(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setSimulateForm((prev) => ({ ...prev, [name]: value }));
  };

  if (loading) return <div className="loading">Loading transactions...</div>;

  return (
    <>
      <Navbar />
      <div className="transactions-container">
        <h1>Transactions</h1>

        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        {/* Simulate Transaction Form */}
        <div className="card simulate-card">
          <h2>Simulate Incoming Transaction</h2>
          <p className="subtitle">
            Test automatic repayment trigger (amount ≥ Ksh 100)
          </p>

          <form onSubmit={handleSimulate}>
            <div className="form-row">
              <div className="form-group">
                <label>Amount (Ksh)</label>
                <input
                  type="number"
                  name="amount"
                  value={simulateForm.amount}
                  onChange={handleFormChange}
                  min="1"
                  required
                />
              </div>
              <div className="form-group">
                <label>Source Phone</label>
                <input
                  type="tel"
                  name="source_phone"
                  value={simulateForm.source_phone}
                  onChange={handleFormChange}
                  placeholder="+254..."
                />
              </div>
            </div>

            <div className="form-group">
              <label>Description</label>
              <input
                type="text"
                name="description"
                value={simulateForm.description}
                onChange={handleFormChange}
                placeholder="Payment from client..."
              />
            </div>

            <button type="submit" disabled={simulating} className="submit-btn">
              {simulating ? 'Processing...' : 'Simulate Transaction'}
            </button>
          </form>
        </div>

        {/* Transactions List */}
        <div className="card">
          <h2>Transaction History</h2>
          {transactions.length > 0 ? (
            <div className="transactions-list">
              {transactions.map((txn) => (
                <div key={txn.id} className="transaction-item">
                  <div className="txn-left">
                    <div className={`txn-icon ${txn.transaction_type}`}>
                      {txn.transaction_type === 'incoming' ? '📥' : '📤'}
                    </div>
                    <div className="txn-info">
                      <p className="txn-description">{txn.description}</p>
                      <p className="txn-source">
                        {txn.source_phone || 'Unknown source'}
                      </p>
                      <p className="txn-time">
                        {new Date(txn.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className={`txn-amount ${txn.transaction_type}`}>
                    {txn.transaction_type === 'incoming' ? '+' : '-'}Ksh{' '}
                    {txn.amount}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">No transactions yet</p>
          )}
        </div>
      </div>
    </>
  );
}
