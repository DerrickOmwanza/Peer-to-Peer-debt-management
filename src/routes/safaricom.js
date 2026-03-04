/**
 * Safaricom Integration Routes
 * Handles M-PESA payment flows and callbacks
 */

const express = require('express');
const router = express.Router();
const SafaricomAPI = require('../services/safaricom-api');
const db = require('../config/database');

// Initialize Safaricom API client
const safaricom = new SafaricomAPI({
  consumerKey: process.env.SAFARICOM_CONSUMER_KEY,
  consumerSecret: process.env.SAFARICOM_CONSUMER_SECRET,
  businessShortCode: process.env.SAFARICOM_SHORT_CODE || '174379',
  passkey: process.env.SAFARICOM_PASSKEY,
  callbackUrl: process.env.SAFARICOM_CALLBACK_URL || 'http://localhost:5000/api/safaricom',
  isSandbox: process.env.NODE_ENV !== 'production'
});

/**
 * POST /api/safaricom/stk-push
 * Initiate STK push for loan repayment
 */
router.post('/stk-push', async (req, res) => {
  try {
    const { phoneNumber, amount, loanId, borrowerId } = req.body;

    if (!phoneNumber || !amount || !loanId) {
      return res.status(400).json({
        error: 'Missing required fields: phoneNumber, amount, loanId'
      });
    }

    // Get loan details
    const loanResult = await db.query(
      'SELECT * FROM loans WHERE id = $1',
      [loanId]
    );

    if (loanResult.rowCount === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const loan = loanResult.rows[0];

    // Initiate STK push
    const stkResult = await safaricom.stkPush(
      phoneNumber,
      amount,
      `Loan repayment for Ksh ${amount}`,
      `LOAN-${loanId}`
    );

    if (!stkResult.success) {
      return res.status(400).json({
        success: false,
        error: stkResult.error,
        responseCode: stkResult.responseCode
      });
    }

    // Save STK request for tracking
    await db.query(`
      INSERT INTO m_pesa_requests (
        type, phone_number, amount, loan_id, borrower_id,
        checkout_request_id, merchant_request_id, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    `, [
      'STK_PUSH',
      phoneNumber,
      amount,
      loanId,
      borrowerId,
      stkResult.checkoutRequestId,
      stkResult.merchantRequestId,
      'pending'
    ]);

    res.json({
      success: true,
      message: 'STK push initiated',
      checkoutRequestId: stkResult.checkoutRequestId,
      responseCode: stkResult.responseCode
    });

  } catch (error) {
    console.error('STK push error:', error);
    res.status(500).json({
      success: false,
      error: 'STK push failed'
    });
  }
});

/**
 * GET /api/safaricom/stk-status/:checkoutRequestId
 * Query STK push status
 */
router.get('/stk-status/:checkoutRequestId', async (req, res) => {
  try {
    const { checkoutRequestId } = req.params;

    // Get merchant request ID from database
    const reqResult = await db.query(
      `SELECT * FROM m_pesa_requests 
       WHERE checkout_request_id = $1 AND type = 'STK_PUSH'`,
      [checkoutRequestId]
    );

    if (reqResult.rowCount === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = reqResult.rows[0];

    // Query status from Safaricom
    const status = await safaricom.querySTKStatus(
      request.merchant_request_id,
      checkoutRequestId
    );

    // Update database
    await db.query(`
      UPDATE m_pesa_requests
      SET status = $1, response_code = $2, updated_at = NOW()
      WHERE checkout_request_id = $3
    `, [
      status.status,
      status.resultCode,
      checkoutRequestId
    ]);

    res.json({
      checkoutRequestId,
      status: status.status,
      resultCode: status.resultCode,
      resultDescription: status.resultDescription
    });

  } catch (error) {
    console.error('STK status error:', error);
    res.status(500).json({ error: 'Status query failed' });
  }
});

/**
 * POST /api/safaricom/c2b/validation
 * Safaricom C2B Validation Callback
 * Triggered when user sends money, before confirmation
 */
router.post('/c2b/validation', async (req, res) => {
  try {
    const transactionData = req.body;

    console.log('[Safaricom Callback] C2B Validation:', {
      phone: transactionData.MSISDN,
      amount: transactionData.Amount,
      reference: transactionData.BillRefNumber
    });

    // Validate payment
    const result = safaricom.validatePayment(transactionData);

    // Save callback for audit
    await db.query(`
      INSERT INTO safaricom_callbacks (type, data, created_at)
      VALUES ($1, $2, NOW())
    `, ['C2B_VALIDATION', JSON.stringify(transactionData)]);

    res.json(result);

  } catch (error) {
    console.error('C2B validation error:', error);
    res.json({
      ResultCode: 1,
      ResultDesc: 'Validation failed'
    });
  }
});

/**
 * POST /api/safaricom/c2b/confirmation
 * Safaricom C2B Confirmation Callback
 * Triggered after payment is confirmed
 */
router.post('/c2b/confirmation', async (req, res) => {
  try {
    const transactionData = req.body;

    console.log('[Safaricom Callback] C2B Confirmation:', {
      phone: transactionData.MSISDN,
      amount: transactionData.Amount,
      transactionId: transactionData.TransID,
      receipt: transactionData.ReceiptNo
    });

    const {
      MSISDN,
      Amount,
      TransID,
      BillRefNumber,
      ReceiptNo,
      TransTime
    } = transactionData;

    // Save transaction record
    await db.query(`
      INSERT INTO m_pesa_transactions (
        phone_number, amount, transaction_id, receipt_number,
        bill_reference, transaction_time, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `, [
      MSISDN,
      Amount,
      TransID,
      ReceiptNo,
      BillRefNumber,
      TransTime,
      'completed'
    ]);

    // Save callback for audit
    await db.query(`
      INSERT INTO safaricom_callbacks (type, data, created_at)
      VALUES ($1, $2, NOW())
    `, ['C2B_CONFIRMATION', JSON.stringify(transactionData)]);

    // Process repayment if loan reference
    if (BillRefNumber && BillRefNumber.startsWith('LOAN-')) {
      await processLoanRepayment(BillRefNumber.replace('LOAN-', ''), Amount, MSISDN, TransID);
    }

    res.json({
      ResultCode: 0,
      ResultDesc: 'Confirmation received'
    });

  } catch (error) {
    console.error('C2B confirmation error:', error);
    res.json({
      ResultCode: 1,
      ResultDesc: 'Confirmation failed'
    });
  }
});

/**
 * POST /api/safaricom/b2c/result
 * B2C Payment Result Callback
 * Triggered when loan disbursement completes
 */
router.post('/b2c/result', async (req, res) => {
  try {
    const { Result } = req.body;

    console.log('[Safaricom Callback] B2C Result:', {
      conversationId: Result.ConversationID,
      resultCode: Result.ResultCode,
      resultDesc: Result.ResultDesc
    });

    // Save callback
    await db.query(`
      INSERT INTO safaricom_callbacks (type, data, created_at)
      VALUES ($1, $2, NOW())
    `, ['B2C_RESULT', JSON.stringify(Result)]);

    // Update disbursement status
    if (Result.ResultCode === 0) {
      const transactions = Result.TransactionReceipt || [];
      for (const tx of transactions) {
        await db.query(`
          UPDATE m_pesa_disbursements
          SET status = 'completed', transaction_id = $1, updated_at = NOW()
          WHERE conversation_id = $2
        `, [tx.transactionID, Result.ConversationID]);
      }
    }

    res.json({ success: true });

  } catch (error) {
    console.error('B2C result error:', error);
    res.json({ success: false });
  }
});

/**
 * POST /api/safaricom/register-urls
 * Register C2B callback URLs with Safaricom
 * Call this once during setup
 */
router.post('/register-urls', async (req, res) => {
  try {
    const validationUrl = `${process.env.SAFARICOM_CALLBACK_URL}/c2b/validation`;
    const confirmationUrl = `${process.env.SAFARICOM_CALLBACK_URL}/c2b/confirmation`;

    const result = await safaricom.registerC2BUrls(validationUrl, confirmationUrl);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'C2B URLs registered successfully',
      validationUrl,
      confirmationUrl
    });

  } catch (error) {
    console.error('URL registration error:', error);
    res.status(500).json({
      success: false,
      error: 'URL registration failed'
    });
  }
});

/**
 * POST /api/safaricom/disburse-loan
 * Disburse approved loan to borrower via B2C
 */
router.post('/disburse-loan', async (req, res) => {
  try {
    const { loanId, borrowerPhone, amount } = req.body;

    if (!loanId || !borrowerPhone || !amount) {
      return res.status(400).json({
        error: 'Missing required fields'
      });
    }

    // Verify loan exists and is approved
    const loanResult = await db.query(
      'SELECT * FROM loans WHERE id = $1 AND status = $2',
      [loanId, 'approved']
    );

    if (loanResult.rowCount === 0) {
      return res.status(404).json({ error: 'Loan not found or not approved' });
    }

    // Initiate B2C payment
    const b2cResult = await safaricom.b2cPayment(
      borrowerPhone,
      amount,
      `Loan disbursement - Loan ${loanId}`,
      'SalaryPayment'
    );

    if (!b2cResult.success) {
      return res.status(400).json({
        success: false,
        error: b2cResult.error
      });
    }

    // Save disbursement record
    await db.query(`
      INSERT INTO m_pesa_disbursements (
        loan_id, borrower_phone, amount, conversation_id, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
    `, [
      loanId,
      borrowerPhone,
      amount,
      b2cResult.conversationId,
      'pending'
    ]);

    // Update loan status to 'disbursed'
    await db.query(
      'UPDATE loans SET status = $1, updated_at = NOW() WHERE id = $2',
      ['active', loanId]
    );

    res.json({
      success: true,
      message: 'Disbursement initiated',
      conversationId: b2cResult.conversationId
    });

  } catch (error) {
    console.error('Disbursement error:', error);
    res.status(500).json({
      success: false,
      error: 'Disbursement failed'
    });
  }
});

/**
 * GET /api/safaricom/account-balance
 * Get current M-PESA account balance
 */
router.get('/account-balance', async (req, res) => {
  try {
    const result = await safaricom.getAccountBalance();

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Balance query initiated',
      conversationId: result.conversationId
    });

  } catch (error) {
    console.error('Balance query error:', error);
    res.status(500).json({
      success: false,
      error: 'Balance query failed'
    });
  }
});

/**
 * POST /api/safaricom/transaction-status/:transactionId
 * Query status of a specific transaction
 */
router.post('/transaction-status/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;

    const result = await safaricom.getTransactionStatus(transactionId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Status query initiated',
      conversationId: result.conversationId
    });

  } catch (error) {
    console.error('Status query error:', error);
    res.status(500).json({
      success: false,
      error: 'Status query failed'
    });
  }
});

/**
 * POST /api/safaricom/reverse-transaction
 * Reverse a failed or incorrect transaction
 */
router.post('/reverse-transaction', async (req, res) => {
  try {
    const { transactionId, amount, reason } = req.body;

    if (!transactionId || !amount) {
      return res.status(400).json({
        error: 'Missing required fields: transactionId, amount'
      });
    }

    const result = await safaricom.reverseTransaction(transactionId, amount, reason);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Reversal initiated',
      conversationId: result.conversationId
    });

  } catch (error) {
    console.error('Reversal error:', error);
    res.status(500).json({
      success: false,
      error: 'Reversal failed'
    });
  }
});

/**
 * Helper function: Process loan repayment
 */
async function processLoanRepayment(loanId, amount, phoneNumber, transactionId) {
  try {
    // Get loan details
    const loanResult = await db.query(
      'SELECT * FROM loans WHERE id = $1',
      [loanId]
    );

    if (loanResult.rowCount === 0) {
      console.log(`Loan ${loanId} not found for repayment`);
      return;
    }

    const loan = loanResult.rows[0];

    // Check for auto-repayment
    const repaymentAmount = loan.repayment_amount;
    if (amount >= repaymentAmount && loan.balance > 0) {
      const newBalance = Math.max(0, loan.balance - repaymentAmount);

      // Create transaction record
      const txResult = await db.query(`
        INSERT INTO transactions (
          user_id, amount, transaction_type, description, status, created_at
        ) SELECT id, $1, 'incoming', $2, 'completed', NOW()
        FROM users WHERE phone = $3
        RETURNING id
      `, [amount, `M-PESA payment received`, phoneNumber]);

      if (txResult.rowCount > 0) {
        const transactionRecord = txResult.rows[0];

        // Create repayment record
        await db.query(`
          INSERT INTO repayments (
            loan_id, transaction_id, amount, balance_after,
            borrower_id, lender_id, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `, [
          loanId,
          transactionRecord.id,
          repaymentAmount,
          newBalance,
          loan.borrower_id,
          loan.lender_id
        ]);

        // Update loan balance
        await db.query(
          'UPDATE loans SET balance = $1, updated_at = NOW() WHERE id = $2',
          [newBalance, loanId]
        );

        // Create notifications
        if (newBalance === 0) {
          // Loan fully repaid
          await db.query(`
            INSERT INTO notifications (user_id, type, title, message, read)
            SELECT id, 'LOAN_REPAID', 'Loan Fully Repaid',
                   'You have fully repaid the loan. Status: Completed', false
            FROM users WHERE phone = $1
          `, [phoneNumber]);

          // Lender notification
          await db.query(`
            INSERT INTO notifications (user_id, type, title, message, read)
            SELECT id, 'REPAYMENT_COMPLETE', 'Loan Repayment Complete',
                   'Your loan has been fully repaid by the borrower', false
            FROM users WHERE id = $1
          `, [loan.lender_id]);
        } else {
          // Partial repayment
          await db.query(`
            INSERT INTO notifications (user_id, type, title, message, read)
            SELECT id, 'REPAYMENT', 'Loan Repayment Received',
                   $1 || ' received. Balance remaining: Ksh ' || $2, false
            FROM users WHERE phone = $3
          `, [
            `Ksh ${repaymentAmount}`,
            newBalance.toFixed(2),
            phoneNumber
          ]);
        }

        console.log(`[Safaricom] Repayment processed for loan ${loanId}:`, {
          amount: repaymentAmount,
          balance: newBalance,
          phone: phoneNumber,
          transactionId: transactionId
        });
      }
    }

  } catch (error) {
    console.error('Error processing repayment:', error);
  }
}

module.exports = router;
