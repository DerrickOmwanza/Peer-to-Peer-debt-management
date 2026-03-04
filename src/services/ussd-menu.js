/**
 * USSD Menu Builder
 * Constructs menu responses for USSD interactions
 */

/**
 * Main menu
 */
function getMainMenu() {
  return `M-PESA LOANS
1. Request Loan
2. View My Loans
3. Approve Loan
4. View Balance
5. Transactions
0. Exit`;
}

/**
 * Loan request form - Step 1: Get lender phone
 */
function getLoanRequestStep1() {
  return `REQUEST LOAN
Enter lender phone:`;
}

/**
 * Loan request form - Step 2: Get amount
 */
function getLoanRequestStep2() {
  return `Enter loan amount (Ksh):`;
}

/**
 * Loan request form - Step 3: Get repayment
 */
function getLoanRequestStep3() {
  return `Enter repayment per (Ksh):`;
}

/**
 * Loan request confirmation
 */
function getLoanConfirmation(sessionData) {
  return `CONFIRM LOAN
Lender: ${sessionData.lenderPhone}
Amount: Ksh ${sessionData.amount}
Repayment: Ksh ${sessionData.repayment}
1. Confirm 0. Cancel`;
}

/**
 * View loans menu
 */
function getViewLoansMenu(loans) {
  if (!loans || loans.length === 0) {
    return `MY LOANS
No loans found.
0. Back`;
  }

  let menu = 'MY LOANS\n';
  loans.forEach((loan, index) => {
    const num = index + 1;
    menu += `${num}. ${loan.lenderName || loan.lenderPhone.slice(-4)}
   Ksh ${loan.amount} | Balance: ${loan.balance}
`;
  });
  menu += '0. Back';
  
  return menu;
}

/**
 * Loan details view
 */
function getLoanDetails(loan) {
  return `LOAN DETAILS
Lender: ${loan.lenderName || loan.lenderPhone}
Amount: Ksh ${loan.amount}
Balance: Ksh ${loan.balance}
Status: ${loan.status}
1. Back`;
}

/**
 * Approval menu
 */
function getApprovalMenu(pendingLoans) {
  if (!pendingLoans || pendingLoans.length === 0) {
    return `APPROVE LOANS
No pending approvals.
0. Back`;
  }

  let menu = 'APPROVE LOANS\n';
  pendingLoans.forEach((loan, index) => {
    const num = index + 1;
    menu += `${num}. From ${loan.borrowerName || loan.borrowerPhone.slice(-4)}
   Ksh ${loan.amount}
`;
  });
  menu += '0. Back';
  
  return menu;
}

/**
 * Loan approval confirmation
 */
function getApprovalConfirmation(loan) {
  return `APPROVE LOAN?
From: ${loan.borrowerName || loan.borrowerPhone}
Amount: Ksh ${loan.amount}
Repayment: Ksh ${loan.repayment}
1. Approve 0. Decline`;
}

/**
 * Balance view
 */
function getBalanceView(balance, pendingLoans = 0) {
  return `WALLET BALANCE
Available: Ksh ${balance}
Pending Loans: Ksh ${pendingLoans}
0. Back`;
}

/**
 * Transactions menu
 */
function getTransactionsMenu(transactions) {
  if (!transactions || transactions.length === 0) {
    return `TRANSACTIONS
No transactions.
0. Back`;
  }

  let menu = 'TRANSACTIONS\n';
  transactions.slice(0, 5).forEach((tx, index) => {
    const num = index + 1;
    const type = tx.type === 'CREDIT' ? '+' : '-';
    menu += `${num}. ${type}Ksh ${tx.amount} (${new Date(tx.date).toLocaleDateString()})\n`;
  });
  menu += '0. Back';
  
  return menu;
}

/**
 * Error message
 */
function getErrorMenu(errorMessage) {
  return `ERROR
${errorMessage}
0. Back`;
}

/**
 * Success message
 */
function getSuccessMenu(message) {
  return `SUCCESS
${message}
0. Back`;
}

/**
 * Session timeout message
 */
function getTimeoutMenu() {
  return `SESSION TIMEOUT
Your session has expired.
Dial *383# to continue.`;
}

/**
 * Invalid input message
 */
function getInvalidInputMenu() {
  return `INVALID INPUT
Please select a valid option.
0. Back`;
}

/**
 * Loading message (for long operations)
 */
function getLoadingMenu() {
  return `Please wait...
Processing your request.`;
}

/**
 * Build a simple confirmation menu
 */
function getConfirmationMenu(message) {
  return `${message}
1. Yes 0. No`;
}

/**
 * Build pagination menu
 */
function getPaginationMenu(items, pageNumber, itemsPerPage = 5) {
  const start = pageNumber * itemsPerPage;
  const end = start + itemsPerPage;
  const pageItems = items.slice(start, end);
  const hasNext = items.length > end;

  let menu = '';
  pageItems.forEach((item, index) => {
    menu += `${index + 1}. ${item}\n`;
  });

  if (hasNext) {
    menu += '9. Next';
  }
  menu += '0. Back';

  return menu;
}

module.exports = {
  getMainMenu,
  getLoanRequestStep1,
  getLoanRequestStep2,
  getLoanRequestStep3,
  getLoanConfirmation,
  getViewLoansMenu,
  getLoanDetails,
  getApprovalMenu,
  getApprovalConfirmation,
  getBalanceView,
  getTransactionsMenu,
  getErrorMenu,
  getSuccessMenu,
  getTimeoutMenu,
  getInvalidInputMenu,
  getLoadingMenu,
  getConfirmationMenu,
  getPaginationMenu
};
