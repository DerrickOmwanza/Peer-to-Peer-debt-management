/**
 * Nova API Service Layer
 * Handles all communication with backend Nova endpoints
 * Includes error handling, retry logic, and token management
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create Axios instance with defaults
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - add JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired - clear localStorage and redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * RISK SCORING APIs
 */

/**
 * Get borrower's risk score from Nova
 * @param {string} borrowerId - UUID of borrower
 * @returns {Promise} Risk score object with band, factors, recommendation
 */
export const getRiskScore = async (borrowerId) => {
  try {
    const response = await api.get(`/loans/risk-score/${borrowerId}`);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('[RiskScore API Error]:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to fetch risk score',
      statusCode: error.response?.status
    };
  }
};

/**
 * Get admin dashboard statistics
 * @returns {Promise} Loans and disputes statistics
 */
export const getAdminStats = async () => {
  try {
    const response = await api.get('/loans/admin/stats');
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('[Admin Stats API Error]:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to fetch statistics'
    };
  }
};

/**
 * DISPUTE APIs
 */

/**
 * File a new dispute with Nova analysis
 * @param {object} disputeData - { loan_id, reason, evidence }
 * @returns {Promise} Dispute object with Nova analysis
 */
export const createDispute = async (disputeData) => {
  try {
    const response = await api.post('/disputes/create', {
      loan_id: disputeData.loan_id,
      reason: disputeData.reason,
      evidence: disputeData.evidence || {}
    });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('[Create Dispute API Error]:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to file dispute',
      statusCode: error.response?.status
    };
  }
};

/**
 * Get dispute details with Nova analysis
 * @param {string} disputeId - UUID of dispute
 * @returns {Promise} Dispute object with Nova output
 */
export const getDisputeDetails = async (disputeId) => {
  try {
    const response = await api.get(`/disputes/${disputeId}`);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('[Get Dispute API Error]:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to fetch dispute'
    };
  }
};

/**
 * Get all disputes for a specific loan
 * @param {string} loanId - UUID of loan
 * @returns {Promise} Array of disputes
 */
export const getDisputesByLoan = async (loanId) => {
  try {
    const response = await api.get(`/disputes/loan/${loanId}`);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('[Get Disputes by Loan API Error]:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to fetch disputes'
    };
  }
};

/**
 * Resolve a dispute (admin only)
 * @param {string} disputeId - UUID of dispute
 * @param {object} resolutionData - { resolution, status }
 * @returns {Promise} Updated dispute
 */
export const resolveDispute = async (disputeId, resolutionData) => {
  try {
    const response = await api.patch(`/disputes/${disputeId}/resolve`, {
      resolution: resolutionData.resolution,
      status: resolutionData.status || 'resolved'
    });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('[Resolve Dispute API Error]:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to resolve dispute'
    };
  }
};

/**
 * Get admin dispute queue (all open disputes)
 * @returns {Promise} Array of disputes in queue
 */
export const getDisputeQueue = async () => {
  try {
    const response = await api.get('/disputes/admin/queue');
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('[Dispute Queue API Error]:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to fetch dispute queue'
    };
  }
};

/**
 * LOAN APIs (existing - for reference)
 */

/**
 * Create loan request
 * @param {object} loanData - { lender_phone, principal_amount, repayment_method, repayment_amount, repayment_start_date }
 * @returns {Promise} Created loan object
 */
export const createLoan = async (loanData) => {
  try {
    const response = await api.post('/loans/request', loanData);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('[Create Loan API Error]:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to create loan'
    };
  }
};

/**
 * Approve or decline a loan
 * @param {string} loanId - UUID of loan
 * @param {boolean} approved - true to approve, false to decline
 * @returns {Promise} Updated loan
 */
export const approveLoan = async (loanId, approved) => {
  try {
    const response = await api.patch(`/loans/${loanId}/approval`, { approved });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('[Approve Loan API Error]:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to approve/decline loan'
    };
  }
};

/**
 * Get borrower's loans
 * @returns {Promise} Array of loans
 */
export const getBorrowerLoans = async () => {
  try {
    const response = await api.get('/loans/borrower');
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('[Get Borrower Loans API Error]:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to fetch loans'
    };
  }
};

/**
 * Get lender's loans
 * @returns {Promise} Array of loans
 */
export const getLenderLoans = async () => {
  try {
    const response = await api.get('/loans/lender');
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('[Get Lender Loans API Error]:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to fetch loans'
    };
  }
};

/**
 * USER APIs
 */

/**
 * Get current user profile
 * @returns {Promise} User profile
 */
export const getUserProfile = async () => {
  try {
    const response = await api.get('/users/profile');
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('[Get Profile API Error]:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to fetch profile'
    };
  }
};

/**
 * UTILITY FUNCTIONS
 */

/**
 * Test backend connectivity
 * @returns {Promise} Health status
 */
export const healthCheck = async () => {
  try {
    const response = await api.get('/health');
    return {
      success: true,
      status: response.data.status
    };
  } catch (error) {
    return {
      success: false,
      error: 'Backend unreachable'
    };
  }
};

/**
 * Set JWT token in localStorage
 * @param {string} token - JWT token from login
 */
export const setToken = (token) => {
  if (token) {
    localStorage.setItem('token', token);
    api.defaults.headers.Authorization = `Bearer ${token}`;
  }
};

/**
 * Clear JWT token
 */
export const clearToken = () => {
  localStorage.removeItem('token');
  delete api.defaults.headers.Authorization;
};

/**
 * Get JWT token from localStorage
 * @returns {string|null} JWT token or null
 */
export const getToken = () => {
  return localStorage.getItem('token');
};

/**
 * Check if user is authenticated
 * @returns {boolean} True if token exists
 */
export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};

export default api;
