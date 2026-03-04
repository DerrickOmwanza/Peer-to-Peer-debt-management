import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth APIs
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
};

// User APIs
export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  addFunds: (amount) => api.post('/users/wallet/add-funds', { amount }),
};

// Loan APIs
export const loanAPI = {
  requestLoan: (data) => api.post('/loans/request', data),
  approveLoan: (loanId, approved) =>
    api.patch(`/loans/${loanId}/approval`, { approved }),
  getBorrowerLoans: () => api.get('/loans/borrower'),
  getLenderLoans: () => api.get('/loans/lender'),
};

// Transaction APIs
export const transactionAPI = {
  simulateIncoming: (data) => api.post('/transactions/incoming', data),
  getTransactions: () => api.get('/transactions'),
};

// Repayment APIs
export const repaymentAPI = {
  getLoanRepayments: (loanId) => api.get(`/repayments/loan/${loanId}`),
  getBorrowerRepayments: () => api.get('/repayments/borrower/all'),
  getLenderRepayments: () => api.get('/repayments/lender/all'),
};

// Notification APIs
export const notificationAPI = {
  getNotifications: () => api.get('/notifications'),
  markAsRead: (notificationId) =>
    api.patch(`/notifications/${notificationId}/read`),
  getUnreadCount: () => api.get('/notifications/unread/count'),
};

export default api;
