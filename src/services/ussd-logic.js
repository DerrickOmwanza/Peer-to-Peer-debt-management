/**
 * USSD Logic Handler
 * Core business logic for USSD interactions
 */

const db = require('../config/database');
const ussdMenu = require('./ussd-menu');
const ussdStorage = require('./ussd-storage');
const { getOrCreateSession } = require('./ussd-session');

/**
 * Validate phone number format
 */
function validatePhoneNumber(phone) {
  // Accept +254, 254, or 0 prefix for Kenyan numbers
  const regex = /^(\+254|254|0)?([1-9]\d{8})$/;
  const match = phone.replace(/\s/g, '').match(regex);
  
  if (!match) return null;
  
  // Normalize to 254xxxxxxxxx format
  const cleanNumber = match[2];
  return `254${cleanNumber}`;
}

/**
 * Validate amount (positive integer, minimum 100)
 */
function validateAmount(amount) {
  const num = parseInt(amount);
  if (isNaN(num) || num < 100 || num > 999999) {
    return null;
  }
  return num;
}

/**
 * Get user by phone number
 */
async function getUserByPhone(phoneNumber) {
  try {
    const result = await db.query(
      'SELECT id, phone, email, name, wallet_balance FROM users WHERE phone = $1',
      [phoneNumber]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
}

/**
 * Get user's loans as borrower
 */
async function getUserBorrowerLoans(userId) {
  try {
    const result = await db.query(`
      SELECT 
        id, 
        lender_id,
        amount, 
        balance,
        repayment_amount,
        status,
        created_at
      FROM loans 
      WHERE borrower_id = $1 
      ORDER BY created_at DESC
    `, [userId]);
    
    return result.rows;
  } catch (error) {
    console.error('Error getting borrower loans:', error);
    throw error;
  }
}

/**
 * Get user's loans as lender
 */
async function getUserLenderLoans(userId) {
  try {
    const result = await db.query(`
      SELECT 
        l.id,
        l.borrower_id,
        l.amount,
        l.balance,
        l.repayment_amount,
        l.status,
        u.name as borrower_name,
        u.phone as borrower_phone
      FROM loans l
      JOIN users u ON l.borrower_id = u.id
      WHERE l.lender_id = $1
      ORDER BY l.created_at DESC
    `, [userId]);
    
    return result.rows;
  } catch (error) {
    console.error('Error getting lender loans:', error);
    throw error;
  }
}

/**
 * Get pending loan approvals for user
 */
async function getPendingApprovals(userId) {
  try {
    const result = await db.query(`
      SELECT 
        l.id,
        l.borrower_id,
        l.amount,
        l.repayment_amount,
        l.status,
        u.name as borrower_name,
        u.phone as borrower_phone
      FROM loans l
      JOIN users u ON l.borrower_id = u.id
      WHERE l.lender_id = $1 AND l.status = 'pending'
      ORDER BY l.created_at DESC
    `, [userId]);
    
    return result.rows;
  } catch (error) {
    console.error('Error getting pending approvals:', error);
    throw error;
  }
}

/**
 * Create a loan request (offline-capable)
 */
async function createLoanRequest(borrowerUserId, lenderPhone, amount, repaymentAmount) {
  try {
    // Validate lender exists
    const lender = await getUserByPhone(lenderPhone);
    if (!lender) {
      throw new Error('Lender phone number not found');
    }

    // Create loan request
    const result = await db.query(`
      INSERT INTO loans 
      (borrower_id, lender_id, amount, balance, repayment_amount, status, created_at)
      VALUES ($1, $2, $3, $3, $4, 'pending', NOW())
      RETURNING *
    `, [borrowerUserId, lender.id, amount, repaymentAmount]);

    const loan = result.rows[0];

    // Create notification for lender
    await db.query(`
      INSERT INTO notifications 
      (user_id, type, title, message, read)
      VALUES ($1, 'LOAN_REQUEST', 'Loan Request', 
              'New loan request for Ksh ${amount}', false)
    `, [lender.id]);

    return loan;
  } catch (error) {
    console.error('Error creating loan request:', error);
    throw error;
  }
}

/**
 * Queue loan request for sync (offline mode)
 */
async function queueLoanForSync(phoneNumber, lenderPhone, amount, repaymentAmount) {
  try {
    const loanRequest = {
      borrowerPhone: phoneNumber,
      lenderPhone,
      amount,
      repaymentAmount,
      createdAt: Date.now()
    };

    return await ussdStorage.queueLoanRequest(phoneNumber, loanRequest);
  } catch (error) {
    console.error('Error queuing loan:', error);
    throw error;
  }
}

/**
 * Approve a loan
 */
async function approveLoan(loanId, lenderId) {
  try {
    const result = await db.query(`
      UPDATE loans 
      SET status = 'approved', updated_at = NOW()
      WHERE id = $1 AND lender_id = $2
      RETURNING *
    `, [loanId, lenderId]);

    const loan = result.rows[0];
    if (!loan) {
      throw new Error('Loan not found or unauthorized');
    }

    // Get borrower info
    const borrowerResult = await db.query(
      'SELECT id FROM users WHERE id = $1',
      [loan.borrower_id]
    );

    // Notify borrower
    if (borrowerResult.rows[0]) {
      await db.query(`
        INSERT INTO notifications 
        (user_id, type, title, message, read)
        VALUES ($1, 'LOAN_APPROVED', 'Loan Approved', 
                'Your loan request for Ksh ${loan.amount} has been approved', false)
      `, [loan.borrower_id]);
    }

    return loan;
  } catch (error) {
    console.error('Error approving loan:', error);
    throw error;
  }
}

/**
 * Get transaction history
 */
async function getTransactionHistory(userId, limit = 5) {
  try {
    const result = await db.query(`
      SELECT 
        id,
        amount,
        transaction_type as type,
        status,
        created_at as date
      FROM transactions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [userId, limit]);

    return result.rows;
  } catch (error) {
    console.error('Error getting transactions:', error);
    throw error;
  }
}

/**
 * Get user's wallet balance
 */
async function getWalletBalance(userId) {
  try {
    const result = await db.query(
      'SELECT wallet_balance FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0]?.wallet_balance || 0;
  } catch (error) {
    console.error('Error getting wallet balance:', error);
    throw error;
  }
}

/**
 * Get pending loan balance for user
 */
async function getPendingLoanBalance(userId) {
  try {
    const result = await db.query(`
      SELECT COALESCE(SUM(balance), 0) as total
      FROM loans
      WHERE borrower_id = $1 AND status IN ('pending', 'approved')
    `, [userId]);

    return result.rows[0]?.total || 0;
  } catch (error) {
    console.error('Error getting pending loan balance:', error);
    throw error;
  }
}

/**
 * Process input based on current state
 */
async function processUSSDInput(session, input, user) {
  const state = session.state;
  const data = session.getAllData();

  try {
    // Handle main menu navigation
    if (!input || input === '0') {
      if (state === 'MAIN_MENU') {
        return { continueSession: false, message: 'Thank you for using M-PESA Loans. Goodbye!' };
      }
      session.reset();
      return { continueSession: true, message: ussdMenu.getMainMenu() };
    }

    // Main menu options
    if (state === 'MAIN_MENU') {
      return handleMainMenuInput(session, input, user);
    }

    // Request loan flow
    if (state === 'REQUEST_LOAN_PHONE') {
      return handleLoanPhoneInput(session, input, user);
    }

    if (state === 'REQUEST_LOAN_AMOUNT') {
      return handleLoanAmountInput(session, input);
    }

    if (state === 'REQUEST_LOAN_REPAYMENT') {
      return handleLoanRepaymentInput(session, input);
    }

    if (state === 'REQUEST_LOAN_CONFIRM') {
      return handleLoanConfirmInput(session, input, user);
    }

    // View loans
    if (state === 'VIEW_LOANS_MENU') {
      return handleViewLoansInput(session, input, user);
    }

    // Approvals
    if (state === 'APPROVAL_MENU') {
      return handleApprovalMenuInput(session, input, user);
    }

    if (state === 'APPROVAL_CONFIRM') {
      return handleApprovalConfirmInput(session, input, user);
    }

    return { continueSession: true, message: ussdMenu.getInvalidInputMenu() };
  } catch (error) {
    console.error('Error processing USSD input:', error);
    return { continueSession: true, message: ussdMenu.getErrorMenu('An error occurred. Try again.') };
  }
}

/**
 * Handle main menu input
 */
async function handleMainMenuInput(session, input, user) {
  switch (input) {
    case '1': // Request Loan
      session.setState('REQUEST_LOAN_PHONE');
      return { continueSession: true, message: ussdMenu.getLoanRequestStep1() };

    case '2': // View My Loans
      try {
        const loans = await getUserBorrowerLoans(user.id);
        session.setState('VIEW_LOANS_MENU');
        session.setData('loans', loans);
        return { continueSession: true, message: ussdMenu.getViewLoansMenu(loans) };
      } catch (error) {
        return { continueSession: true, message: ussdMenu.getErrorMenu('Could not fetch loans') };
      }

    case '3': // Approve Loan
      try {
        const pendingLoans = await getPendingApprovals(user.id);
        if (pendingLoans.length === 0) {
          return { continueSession: true, message: 'No pending loan approvals.\n0. Back' };
        }
        session.setState('APPROVAL_MENU');
        session.setData('pendingLoans', pendingLoans);
        return { continueSession: true, message: ussdMenu.getApprovalMenu(pendingLoans) };
      } catch (error) {
        return { continueSession: true, message: ussdMenu.getErrorMenu('Could not fetch loans') };
      }

    case '4': // View Balance
      try {
        const balance = await getWalletBalance(user.id);
        const pending = await getPendingLoanBalance(user.id);
        return { continueSession: true, message: ussdMenu.getBalanceView(balance, pending) };
      } catch (error) {
        return { continueSession: true, message: ussdMenu.getErrorMenu('Could not fetch balance') };
      }

    case '5': // Transactions
      try {
        const transactions = await getTransactionHistory(user.id);
        return { continueSession: true, message: ussdMenu.getTransactionsMenu(transactions) };
      } catch (error) {
        return { continueSession: true, message: ussdMenu.getErrorMenu('Could not fetch transactions') };
      }

    default:
      return { continueSession: true, message: ussdMenu.getInvalidInputMenu() };
  }
}

/**
 * Handle loan phone input
 */
async function handleLoanPhoneInput(session, input, user) {
  const validatedPhone = validatePhoneNumber(input);
  
  if (!validatedPhone) {
    return { continueSession: true, message: ussdMenu.getErrorMenu('Invalid phone number format') };
  }

  if (validatedPhone === user.phone) {
    return { continueSession: true, message: ussdMenu.getErrorMenu('Cannot request loan from yourself') };
  }

  session.setData('lenderPhone', validatedPhone);
  session.setState('REQUEST_LOAN_AMOUNT');
  return { continueSession: true, message: ussdMenu.getLoanRequestStep2() };
}

/**
 * Handle loan amount input
 */
async function handleLoanAmountInput(session, input) {
  const amount = validateAmount(input);
  
  if (amount === null) {
    return { continueSession: true, message: ussdMenu.getErrorMenu('Invalid amount. Min: Ksh 100') };
  }

  session.setData('amount', amount);
  session.setState('REQUEST_LOAN_REPAYMENT');
  return { continueSession: true, message: ussdMenu.getLoanRequestStep3() };
}

/**
 * Handle repayment amount input
 */
async function handleLoanRepaymentInput(session, input) {
  const repayment = validateAmount(input);
  
  if (repayment === null) {
    return { continueSession: true, message: ussdMenu.getErrorMenu('Invalid amount. Min: Ksh 100') };
  }

  session.setData('repayment', repayment);
  session.setState('REQUEST_LOAN_CONFIRM');
  
  const data = session.getAllData();
  return { continueSession: true, message: ussdMenu.getLoanConfirmation(data) };
}

/**
 * Handle loan confirmation
 */
async function handleLoanConfirmInput(session, input, user) {
  if (input !== '1') {
    session.reset();
    return { continueSession: true, message: ussdMenu.getMainMenu() };
  }

  const data = session.getAllData();

  try {
    // Try to create loan in database
    await createLoanRequest(user.id, data.lenderPhone, data.amount, data.repayment);
    
    session.reset();
    return {
      continueSession: true,
      message: ussdMenu.getSuccessMenu(`Loan request sent to ${data.lenderPhone}`)
    };
  } catch (error) {
    // If database fails, queue for sync
    console.log('Database insert failed, queuing for sync:', error.message);
    
    try {
      await queueLoanForSync(user.phone, data.lenderPhone, data.amount, data.repayment);
      session.reset();
      return {
        continueSession: true,
        message: ussdMenu.getSuccessMenu('Loan saved offline. Will sync when online.')
      };
    } catch (queueError) {
      return { continueSession: true, message: ussdMenu.getErrorMenu('Could not process loan') };
    }
  }
}

/**
 * Handle view loans menu input
 */
async function handleViewLoansInput(session, input, user) {
  const loans = session.getData('loans');
  const loanIndex = parseInt(input) - 1;

  if (loanIndex >= 0 && loanIndex < loans.length) {
    const loan = loans[loanIndex];
    return { continueSession: true, message: ussdMenu.getLoanDetails(loan) };
  }

  return { continueSession: true, message: ussdMenu.getInvalidInputMenu() };
}

/**
 * Handle approval menu input
 */
async function handleApprovalMenuInput(session, input, user) {
  const pendingLoans = session.getData('pendingLoans');
  const loanIndex = parseInt(input) - 1;

  if (loanIndex >= 0 && loanIndex < pendingLoans.length) {
    const loan = pendingLoans[loanIndex];
    session.setData('selectedLoan', loan);
    session.setState('APPROVAL_CONFIRM');
    return { continueSession: true, message: ussdMenu.getApprovalConfirmation(loan) };
  }

  return { continueSession: true, message: ussdMenu.getInvalidInputMenu() };
}

/**
 * Handle approval confirmation
 */
async function handleApprovalConfirmInput(session, input, user) {
  if (input === '1') {
    const loan = session.getData('selectedLoan');

    try {
      await approveLoan(loan.id, user.id);
      session.reset();
      return {
        continueSession: true,
        message: ussdMenu.getSuccessMenu(`Loan approved for Ksh ${loan.amount}`)
      };
    } catch (error) {
      return { continueSession: true, message: ussdMenu.getErrorMenu('Could not approve loan') };
    }
  } else {
    session.reset();
    return { continueSession: true, message: ussdMenu.getMainMenu() };
  }
}

module.exports = {
  validatePhoneNumber,
  validateAmount,
  getUserByPhone,
  getUserBorrowerLoans,
  getUserLenderLoans,
  getPendingApprovals,
  createLoanRequest,
  queueLoanForSync,
  approveLoan,
  getTransactionHistory,
  getWalletBalance,
  getPendingLoanBalance,
  processUSSDInput
};
