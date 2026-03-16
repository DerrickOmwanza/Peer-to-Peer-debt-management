import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { loanAPI } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import './Pages.css';

const CBK_BASE_RATE = 10.75;
const RISK_PREMIUM = 3.0;
const ANNUAL_INTEREST_RATE = CBK_BASE_RATE + RISK_PREMIUM;

export default function RequestLoan() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsAcceptedAt, setTermsAcceptedAt] = useState(null);
  const [digitalSignature, setDigitalSignature] = useState(user?.full_name || '');

  const [formData, setFormData] = useState({
    lender_name: '',
    lender_phone: '',
    principal_amount: '',
    repayment_method: 'fixed',
    repayment_amount: '',
    repayment_start_date: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const now = new Date();
  const formattedTimestamp = now.toLocaleString('en-KE', {
    dateStyle: 'full',
    timeStyle: 'medium',
    timeZone: 'Africa/Nairobi',
  });

  const calculateInterest = () => {
    const principal = parseFloat(formData.principal_amount);
    if (!principal || principal <= 0) return { rate: ANNUAL_INTEREST_RATE, interest: 0, total: 0 };
    const interest = (principal * ANNUAL_INTEREST_RATE) / 100;
    return {
      rate: ANNUAL_INTEREST_RATE,
      interest: interest.toFixed(2),
      total: (principal + interest).toFixed(2),
    };
  };

  const handleAcceptTerms = () => {
    const timestamp = new Date().toISOString();
    setTermsAcceptedAt(timestamp);
    setStep(2);
  };

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
      const interestCalc = calculateInterest();
      const submitData = {
        lender_phone: formData.lender_phone,
        principal_amount: parseFloat(formData.principal_amount),
        repayment_method: formData.repayment_method,
        repayment_amount:
          formData.repayment_method === 'interest'
            ? parseFloat(interestCalc.total)
            : parseFloat(formData.repayment_amount),
        repayment_start_date: formData.repayment_start_date,
        terms_accepted: true,
        terms_accepted_at: termsAcceptedAt,
      };

      await loanAPI.requestLoan(submitData);
      setSuccess('Loan request submitted successfully! The lender will be notified for approval.');
      setTimeout(() => navigate('/dashboard'), 2500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit loan request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const interestCalc = calculateInterest();

  return (
    <>
      <Navbar />
      <div className="loan-request-page">
        {/* Top Navigation */}
        <div className="loan-top-bar">
          <button className="back-dashboard-btn" onClick={() => navigate('/dashboard')}>
            ← Back to Dashboard
          </button>
        </div>

        {/* Step Indicator */}
        <div className="step-indicator">
          <div className={`step-item ${step >= 1 ? 'active' : ''}`}>
            <div className="step-number">1</div>
            <span className="step-label">Terms & Conditions</span>
          </div>
          <div className="step-line"></div>
          <div className={`step-item ${step >= 2 ? 'active' : ''}`}>
            <div className="step-number">2</div>
            <span className="step-label">Loan Request</span>
          </div>
        </div>

        {/* Step 1: Terms & Conditions */}
        {step === 1 && (
          <div className="terms-card">
            <div className="terms-header">
              <h1>Loan Agreement — Terms & Conditions</h1>
              <p className="terms-subtitle">
                Please read the following terms carefully before proceeding with your loan request.
                This document constitutes a legally binding agreement.
              </p>
            </div>

            <div className="terms-scroll-container">
              <div className="terms-content">
                <h2>PEER-TO-PEER LOAN AGREEMENT</h2>
                <p className="terms-preamble">
                  This Peer-to-Peer Loan Agreement ("Agreement") is entered into through the P2P Debt
                  Management Platform ("Platform"), governed by the laws of the Republic of Kenya,
                  including but not limited to the Central Bank of Kenya Act (Cap. 491), the Banking
                  Act (Cap. 488), the National Payment Systems Act, 2011, and the Data Protection Act,
                  2019.
                </p>

                <h3>1. PARTIES TO THE AGREEMENT</h3>
                <p>
                  <strong>1.1</strong> The <strong>Borrower</strong> is the individual who initiates
                  the loan request through the Platform, whose identity is verified via their
                  registered M-PESA phone number and account credentials.
                </p>
                <p>
                  <strong>1.2</strong> The <strong>Lender</strong> is the individual identified by
                  the phone number provided in the loan request form, who will receive notification
                  and must approve the loan before disbursement.
                </p>
                <p>
                  <strong>1.3</strong> Both parties acknowledge that this Agreement is facilitated by
                  the Platform but constitutes a direct obligation between the Borrower and the
                  Lender.
                </p>

                <h3>2. BORROWER OBLIGATIONS</h3>
                <p>
                  <strong>2.1</strong> The Borrower agrees to repay the full loan amount, including
                  any applicable interest, within the agreed repayment period.
                </p>
                <p>
                  <strong>2.2</strong> The Borrower confirms that all information provided in the
                  loan request is true, accurate, and complete. Providing false information may
                  constitute fraud under Kenyan law (Penal Code, Cap. 63).
                </p>
                <p>
                  <strong>2.3</strong> The Borrower authorises the Platform to share their loan
                  history, repayment records, and risk assessment data with the Lender.
                </p>
                <p>
                  <strong>2.4</strong> The Borrower shall not create multiple loan obligations that
                  exceed their capacity to repay, as assessed by the Platform's AI-powered risk
                  scoring system (Nova AI).
                </p>

                <h3>3. LOAN REPAYMENT TERMS</h3>
                <p>
                  <strong>3.1</strong> Repayments shall be processed automatically via{' '}
                  <strong>Safaricom M-PESA</strong> mobile money service. The Borrower authorises
                  automatic deductions from their M-PESA account on the scheduled repayment dates.
                </p>
                <p>
                  <strong>3.2</strong> For <strong>Fixed Amount</strong> repayments, the Borrower
                  shall repay the exact amount specified in the loan agreement.
                </p>
                <p>
                  <strong>3.3</strong> For <strong>Interest-Based</strong> repayments, the interest
                  rate shall be calculated as follows: Central Bank of Kenya (CBK) base lending rate
                  (currently <strong>10.75% per annum</strong>) plus a risk premium of{' '}
                  <strong>3.00%</strong>, totalling{' '}
                  <strong>{ANNUAL_INTEREST_RATE}% per annum</strong>. This rate is subject to
                  adjustment in accordance with CBK monetary policy decisions.
                </p>
                <p>
                  <strong>3.4</strong> Late payments shall attract a penalty fee as determined by the
                  Platform, not exceeding the limits set by the CBK regulations on lending.
                </p>

                <h3>4. DEFAULT AND CONSEQUENCES</h3>
                <p>
                  <strong>4.1</strong> A loan shall be considered in <strong>default</strong> if the
                  Borrower fails to make a scheduled repayment within 14 calendar days of the due
                  date.
                </p>
                <p>
                  <strong>4.2</strong> Upon default, the following actions may be taken:
                </p>
                <ul>
                  <li>
                    The Borrower's risk score will be negatively impacted, affecting future borrowing
                    capacity on the Platform.
                  </li>
                  <li>
                    The Lender may initiate a <strong>dispute resolution</strong> process through the
                    Platform.
                  </li>
                  <li>
                    The matter may be escalated to the{' '}
                    <strong>Kenyan courts of competent jurisdiction</strong> for legal enforcement of
                    the debt.
                  </li>
                  <li>
                    Court fines and legal costs shall be borne by the defaulting Borrower, calculated
                    in proportion to the outstanding loan amount and in accordance with the Civil
                    Procedure Act (Cap. 21) and the relevant court fee schedules.
                  </li>
                </ul>
                <p>
                  <strong>4.3</strong> The Platform reserves the right to report persistent
                  defaulters to credit reference bureaus (CRBs) licensed by the CBK, including but
                  not limited to TransUnion, Metropol, and Creditinfo.
                </p>

                <h3>5. DISPUTE RESOLUTION</h3>
                <p>
                  <strong>5.1</strong> In the event of a dispute between the Borrower and the
                  Lender, the following resolution process shall apply:
                </p>
                <ol>
                  <li>
                    <strong>Stage 1 — AI Mediation:</strong> The Platform's Nova AI system shall
                    analyse the dispute and propose a fair resolution based on the loan terms,
                    payment history, and applicable regulations.
                  </li>
                  <li>
                    <strong>Stage 2 — Administrative Review:</strong> If the AI-mediated resolution
                    is not accepted by either party, the dispute shall be escalated to the Platform's
                    human administrators for review and binding arbitration.
                  </li>
                  <li>
                    <strong>Stage 3 — Legal Proceedings:</strong> If the administrative review does
                    not resolve the dispute, either party may pursue legal action in the Kenyan
                    courts. The parties agree to submit to the jurisdiction of the courts of the
                    Republic of Kenya.
                  </li>
                </ol>

                <h3>6. LENDER NOTIFICATION AND AGREEMENT</h3>
                <p>
                  <strong>6.1</strong> Upon submission of a loan request, the Lender shall receive a
                  notification via SMS and/or the Platform application containing the full terms of
                  the proposed loan.
                </p>
                <p>
                  <strong>6.2</strong> The Lender must explicitly approve the loan request before
                  any funds are disbursed. The Lender's approval constitutes their agreement to the
                  terms outlined herein.
                </p>
                <p>
                  <strong>6.3</strong> A copy of this Agreement, including the Borrower's acceptance
                  and digital signature, shall be made available to the Lender upon approval.
                </p>

                <h3>7. DATA PRIVACY AND CONSENT</h3>
                <p>
                  <strong>7.1</strong> The Platform collects and processes personal data in
                  accordance with the <strong>Kenya Data Protection Act, 2019</strong> and the
                  regulations issued by the Office of the Data Protection Commissioner (ODPC).
                </p>
                <p>
                  <strong>7.2</strong> By accepting these Terms, the Borrower consents to the
                  collection, processing, and storage of their personal data, including but not
                  limited to: full name, phone number, M-PESA transaction history, loan records,
                  repayment history, and risk assessment scores.
                </p>
                <p>
                  <strong>7.3</strong> Personal data shall be used solely for the purposes of
                  facilitating loan transactions, risk assessment, dispute resolution, and regulatory
                  compliance. Data shall not be sold or shared with third parties except as required
                  by law or with the explicit consent of the data subject.
                </p>
                <p>
                  <strong>7.4</strong> Both parties have the right to request access to, correction
                  of, or deletion of their personal data held by the Platform, subject to legal and
                  regulatory retention requirements.
                </p>

                <h3>8. GOVERNING LAW</h3>
                <p>
                  <strong>8.1</strong> This Agreement shall be governed by and construed in
                  accordance with the laws of the Republic of Kenya.
                </p>
                <p>
                  <strong>8.2</strong> Any legal proceedings arising from this Agreement shall be
                  brought before the courts of the Republic of Kenya, which shall have exclusive
                  jurisdiction.
                </p>

                <h3>9. AMENDMENTS</h3>
                <p>
                  <strong>9.1</strong> The Platform reserves the right to amend these Terms &
                  Conditions at any time. Users will be notified of material changes via the
                  Platform and/or SMS. Continued use of the Platform after notification constitutes
                  acceptance of the amended terms.
                </p>
              </div>
            </div>

            {/* Acceptance Section */}
            <div className="terms-acceptance">
              <div className="terms-timestamp">
                <span>📅 Date & Time:</span> {formattedTimestamp} (EAT)
              </div>

              <div className="terms-signature">
                <label htmlFor="digitalSignature">Digital Signature (Full Name)</label>
                <input
                  type="text"
                  id="digitalSignature"
                  value={digitalSignature}
                  onChange={(e) => setDigitalSignature(e.target.value)}
                  placeholder="Enter your full legal name"
                  required
                />
              </div>

              <label className="terms-checkbox-label">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                />
                <span>
                  I, <strong>{digitalSignature || '___________'}</strong>, have read, understood,
                  and agree to all the Terms & Conditions outlined above. I acknowledge that this
                  constitutes a legally binding agreement.
                </span>
              </label>

              <button
                className="terms-continue-btn"
                disabled={!termsAccepted || !digitalSignature.trim()}
                onClick={handleAcceptTerms}
              >
                Continue to Loan Request →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Loan Request Form */}
        {step === 2 && (
          <div className="form-card">
            <button className="back-step-btn" onClick={() => setStep(1)}>
              ← Back to Terms & Conditions
            </button>

            <h1>Loan Request Form</h1>
            <p className="form-subtitle">
              Complete the details below to send your loan request to the lender.
            </p>

            {error && <div className="error">{error}</div>}
            {success && <div className="success">{success}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Loan Amount (Ksh)</label>
                <input
                  type="number"
                  name="principal_amount"
                  value={formData.principal_amount}
                  onChange={handleChange}
                  placeholder="e.g. 5000"
                  min="100"
                  required
                />
              </div>

              <div className="form-group">
                <label>Start of Payment Period</label>
                <input
                  type="date"
                  name="repayment_start_date"
                  value={formData.repayment_start_date}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
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
                  <option value="interest">Interest-Based</option>
                </select>
              </div>

              {formData.repayment_method === 'interest' && formData.principal_amount > 0 && (
                <div className="interest-summary">
                  <h4>Interest Calculation</h4>
                  <div className="interest-row">
                    <span>Annual Interest Rate (CBK + Risk Premium):</span>
                    <strong>{interestCalc.rate}% p.a.</strong>
                  </div>
                  <div className="interest-row">
                    <span>Interest Amount:</span>
                    <strong>Ksh {Number(interestCalc.interest).toLocaleString()}</strong>
                  </div>
                  <div className="interest-row total">
                    <span>Total Repayment Amount:</span>
                    <strong>Ksh {Number(interestCalc.total).toLocaleString()}</strong>
                  </div>
                </div>
              )}

              {formData.repayment_method === 'fixed' && (
                <div className="form-group">
                  <label>Repayment Amount (Ksh)</label>
                  <input
                    type="number"
                    name="repayment_amount"
                    value={formData.repayment_amount}
                    onChange={handleChange}
                    placeholder="Total amount to repay"
                    min="1"
                    required
                  />
                </div>
              )}

              <div className="form-divider"></div>

              <div className="form-group">
                <label>Lender's Full Name</label>
                <input
                  type="text"
                  name="lender_name"
                  value={formData.lender_name}
                  onChange={handleChange}
                  placeholder="Enter lender's full name"
                  required
                />
              </div>

              <div className="form-group">
                <label>Lender's Phone Number (M-PESA)</label>
                <input
                  type="tel"
                  name="lender_phone"
                  value={formData.lender_phone}
                  onChange={handleChange}
                  placeholder="+254 7XX XXX XXX"
                  required
                />
              </div>

              <button type="submit" disabled={loading}>
                {loading ? 'Submitting...' : 'Send Loan Request to Lender'}
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
