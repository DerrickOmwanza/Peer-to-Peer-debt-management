/**
 * Safaricom API Integration Tests
 * Tests all M-PESA operations and webhook handling
 */

const SafaricomAPI = require('../src/services/safaricom-api');
const { Pool } = require('pg');

describe('Safaricom API Integration', () => {
  let safaricom;
  let pool;

  beforeAll(async () => {
    safaricom = new SafaricomAPI();
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('Token Management', () => {
    test('should get access token', async () => {
      const token = await safaricom.getAccessToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    test('should cache token', async () => {
      const token1 = await safaricom.getAccessToken();
      const token2 = await safaricom.getAccessToken();
      expect(token1).toBe(token2);
    });

    test('should refresh expired token', async () => {
      safaricom.tokenExpiry = Date.now() - 1000; // Expire token
      const token = await safaricom.getAccessToken();
      expect(token).toBeDefined();
      expect(safaricom.tokenExpiry).toBeGreaterThan(Date.now());
    });
  });

  describe('Phone Number Formatting', () => {
    test('should format 254xxxxxxxxx correctly', () => {
      const result = safaricom.formatPhoneNumber('254701234567');
      expect(result).toBe('254701234567');
    });

    test('should convert 07xxxxxxxx to 254701234567', () => {
      const result = safaricom.formatPhoneNumber('0701234567');
      expect(result).toBe('254701234567');
    });

    test('should convert +254xxxxxxxxx to 254xxxxxxxxx', () => {
      const result = safaricom.formatPhoneNumber('+254701234567');
      expect(result).toBe('254701234567');
    });

    test('should reject invalid formats', () => {
      expect(() => safaricom.formatPhoneNumber('invalid')).toThrow();
      expect(() => safaricom.formatPhoneNumber('123')).toThrow();
    });
  });

  describe('STK Push Operations', () => {
    test('should initiate STK push with valid parameters', async () => {
      const result = await safaricom.stkPush(
        '254708374149',
        100,
        'Test payment',
        'LOAN-TEST-001'
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.checkoutRequestId).toBeDefined();
      expect(result.responseCode).toBe('0');
    });

    test('should reject STK push with invalid phone', async () => {
      await expect(
        safaricom.stkPush('invalid', 100, 'Test', 'LOAN-001')
      ).rejects.toThrow();
    });

    test('should reject STK push with invalid amount', async () => {
      await expect(
        safaricom.stkPush('254701234567', -100, 'Test', 'LOAN-001')
      ).rejects.toThrow();

      await expect(
        safaricom.stkPush('254701234567', 0, 'Test', 'LOAN-001')
      ).rejects.toThrow();
    });

    test('should query STK status', async () => {
      // First create an STK push
      const push = await safaricom.stkPush(
        '254708374149',
        100,
        'Test',
        'LOAN-TEST-002'
      );

      // Then query status
      const status = await safaricom.querySTKStatus(
        push.merchantRequestId,
        push.checkoutRequestId
      );

      expect(status).toBeDefined();
      expect(status.ResultCode).toBeDefined();
    });
  });

  describe('B2C Disbursement', () => {
    test('should disburse loan to borrower', async () => {
      const result = await safaricom.b2cPayment(
        '254708374149',
        5000,
        'Loan disbursement',
        'SalaryPayment'
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.conversationId).toBeDefined();
      expect(result.responseCode).toBe('0');
    });

    test('should reject B2C with invalid parameters', async () => {
      await expect(
        safaricom.b2cPayment('invalid', 5000, 'Test', 'SalaryPayment')
      ).rejects.toThrow();

      await expect(
        safaricom.b2cPayment('254701234567', -1000, 'Test', 'SalaryPayment')
      ).rejects.toThrow();
    });

    test('should handle B2C result callback', async () => {
      const callbackData = {
        Result: {
          ResultCode: 0,
          ResultDesc: 'Success',
          ConversationID: 'TEST-CONV-001',
          OriginatorConversationID: 'TEST-ORIG-001',
          TransactionReceipt: [
            {
              transactionID: 'SAF-123456',
              amount: '5000',
              recipientPublicName: '254708374149',
            },
          ],
        },
      };

      const result = await safaricom.handleB2CResult(callbackData);
      expect(result.success).toBe(true);
    });
  });

  describe('C2B Callback Handling', () => {
    test('should validate C2B payment', async () => {
      const paymentData = {
        MSISDN: '254708374149',
        Amount: '500',
        TransID: 'SAF-123456',
        BillRefNumber: 'LOAN-TEST-001',
        ReceiptNo: 'SAF-789456',
        TransTime: new Date().toISOString(),
      };

      const result = safaricom.validatePayment(paymentData);
      expect(result).toBe(true);
    });

    test('should reject invalid C2B payment', async () => {
      const paymentData = {
        MSISDN: 'invalid',
        Amount: '-500',
        TransID: '',
        BillRefNumber: '',
      };

      expect(() => safaricom.validatePayment(paymentData)).toThrow();
    });

    test('should process C2B confirmation', async () => {
      const paymentData = {
        MSISDN: '254708374149',
        Amount: '1000',
        TransID: 'SAF-987654',
        BillRefNumber: 'LOAN-TEST-001',
        ReceiptNo: 'SAF-654321',
        TransTime: new Date().toISOString(),
      };

      const result = await safaricom.handleConfirmation(paymentData);
      expect(result.success).toBe(true);
      expect(result.transactionSaved).toBe(true);
    });
  });

  describe('Account Balance', () => {
    test('should get account balance', async () => {
      const result = await safaricom.getAccountBalance();
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    test('should store balance history', async () => {
      await safaricom.getAccountBalance();
      
      const query = 'SELECT * FROM safaricom_account_balance ORDER BY checked_at DESC LIMIT 1';
      const res = await pool.query(query);
      
      expect(res.rows.length).toBeGreaterThan(0);
      expect(res.rows[0]).toHaveProperty('balance');
      expect(res.rows[0]).toHaveProperty('checked_at');
    });
  });

  describe('Transaction Reversal', () => {
    test('should reverse transaction', async () => {
      const result = await safaricom.reverseTransaction(
        'SAF-123456',
        500,
        'Customer request'
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    test('should reject reversal with invalid data', async () => {
      await expect(
        safaricom.reverseTransaction('', -500, '')
      ).rejects.toThrow();
    });
  });

  describe('Signature Verification', () => {
    test('should verify valid signature', () => {
      const data = 'test-data';
      const signature = safaricom.generateSignature(data);
      const isValid = safaricom.verifySignature(signature, data);
      
      expect(isValid).toBe(true);
    });

    test('should reject invalid signature', () => {
      const isValid = safaricom.verifySignature('invalid-signature', 'data');
      expect(isValid).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should log errors', async () => {
      const errorData = {
        operation: 'stk_push',
        phoneNumber: '254708374149',
        amount: 100,
        error: 'Network error',
        timestamp: new Date(),
      };

      await safaricom.logError(errorData);

      const query = 'SELECT * FROM safaricom_error_logs ORDER BY logged_at DESC LIMIT 1';
      const res = await pool.query(query);

      expect(res.rows.length).toBeGreaterThan(0);
      expect(res.rows[0].operation).toBe('stk_push');
    });

    test('should handle token expiry gracefully', async () => {
      safaricom.tokenExpiry = Date.now() - 5000;
      const token = await safaricom.getAccessToken();
      expect(token).toBeDefined();
    });
  });

  describe('Webhook Registration', () => {
    test('should register C2B URLs', async () => {
      const result = await safaricom.registerC2BUrls(
        'http://localhost:5000/api/safaricom/c2b/validation',
        'http://localhost:5000/api/safaricom/c2b/confirmation'
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limits', async () => {
      // Make multiple rapid requests
      const requests = Array(11).fill(null).map(() =>
        safaricom.stkPush('254708374149', 100, 'Test', 'LOAN-001')
      );

      // Should fail after rate limit
      const results = await Promise.allSettled(requests);
      const failures = results.filter(r => r.status === 'rejected');

      expect(failures.length).toBeGreaterThan(0);
    });
  });
});
