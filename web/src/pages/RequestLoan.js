import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loanAPI } from '../services/api';
import Navbar from '../components/Navbar';
import './Pages.css';

export default function RequestLoan() {
  const [formData, setFormData] = useState({
    lender_phone: '',
    principal_amount: '',
    repayment_method: 'fixed',
    repayment_amount: '',
    repayment_start_date: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await loanAPI.requestLoan(formData);
      setSuccess('Loan request created! Awaiting lender approval.');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create loan request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="page-container">
        <div className="form-card">
          <h1>Request a Loan</h1>
          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Lender's Phone Number</label>
              <input
                type="tel"
                name="lender_phone"
                value={formData.lender_phone}
                onChange={handleChange}
                placeholder="+254..."
                required
              />
            </div>

            <div className="form-group">
              <label>Principal Amount (Ksh)</label>
              <input
                type="number"
                name="principal_amount"
                value={formData.principal_amount}
                onChange={handleChange}
                min="1"
                required
              />
            </div>

            <div className="form-group">
              <label>Repayment Method</label>
              <select
                name="repayment_method"
                value={formData.repayment_method}
                onChange={handleChange}
              >
                <option value="fixed">Fixed Amount</option>
                <option value="percentage">Percentage</option>
              </select>
            </div>

            <div className="form-group">
              <label>
                Repayment {formData.repayment_method === 'fixed' ? 'Amount' : 'Percentage'} (%)
              </label>
              <input
                type="number"
                name="repayment_amount"
                value={formData.repayment_amount}
                onChange={handleChange}
                min="1"
                required
              />
            </div>

            <div className="form-group">
              <label>Repayment Start Date</label>
              <input
                type="date"
                name="repayment_start_date"
                value={formData.repayment_start_date}
                onChange={handleChange}
                required
              />
            </div>

            <button type="submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Request Loan'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
