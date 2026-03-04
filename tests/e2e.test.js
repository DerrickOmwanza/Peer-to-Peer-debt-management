/**
 * End-to-End Integration Tests
 * Tests complete loan lifecycle from creation to repayment
 */

const request = require('supertest');
const { Pool } = require('pg');

describe('End-to-End Loan Lifecycle', () => {
  let app;
  let pool;
  let borrowerId;
  let lenderId;
  let loanId;

  beforeAll(async () => {
    app = require('../server');
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Setup test users
    const userQuery = `
      INSERT INTO users (id, phone_number, name, email)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    `;

    borrowerId = 'test-borrower-e2e-' + Date.now();
    lenderId = 'test-lender-e2e-' + Date.now();

    await pool.query(userQuery, [
      borrowerId,
      '254708374149',
      'Test Borrower',
      'borrower@test.com',
    ]);

    await pool.query(userQuery, [
      lenderId,
      '254701234567',
      'Test Lender',
      'lender@test.com',
    ]);
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('Complete Loan Flow', () => {
    test('Step 1: Borrower requests loan', async () => {
      const res = await request(app)
        .post('/api/loans/request')
        .send({
          borrowerId,
          lenderId,
          amount: 5000,
          description: 'Personal loan',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.loan).toBeDefined();
      expect(res.body.loan.status).toBe('pending');

      loanId = res.body.loan.id;
    });

    test('Step 2: Lender approves loan', async () => {
      const res = await request(app)
        .put(`/api/loans/${loanId}/approve`)
        .send({
          lenderId,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.loan.status).toBe('approved');
    });

    test('Step 3: System disburses loan (B2C)', async () => {
      const res = await request(app)
        .post('/api/safaricom/disburse-loan')
        .send({
          loanId,
          borrowerPhone: '254708374149',
          amount: 5000,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify loan status changed to active
      const loanRes = await request(app).get(`/api/loans/${loanId}`);
      expect(loanRes.body.loan.status).toBe('active');
    });

    test('Step 4: Borrower sends partial repayment', async () => {
      const res = await request(app)
        .post('/api/safaricom/c2b/confirmation')
        .send({
          MSISDN: '254708374149',
          Amount: '1000',
          TransID: 'SAF-TEST-001',
          BillRefNumber: `LOAN-${loanId}`,
          ReceiptNo: 'REC-001',
          TransTime: new Date().toISOString(),
        });

      expect(res.statusCode).toBe(200);

      // Verify repayment recorded
      const loansRes = await request(app).get(`/api/loans/${loanId}`);
      expect(loansRes.body.loan.balance).toBe(4000);
    });

    test('Step 5: Borrower sends another repayment', async () => {
      const res = await request(app)
        .post('/api/safaricom/c2b/confirmation')
        .send({
          MSISDN: '254708374149',
          Amount: '2000',
          TransID: 'SAF-TEST-002',
          BillRefNumber: `LOAN-${loanId}`,
          ReceiptNo: 'REC-002',
          TransTime: new Date().toISOString(),
        });

      expect(res.statusCode).toBe(200);

      // Verify balance updated
      const loansRes = await request(app).get(`/api/loans/${loanId}`);
      expect(loansRes.body.loan.balance).toBe(2000);
    });

    test('Step 6: Borrower completes loan repayment', async () => {
      const res = await request(app)
        .post('/api/safaricom/c2b/confirmation')
        .send({
          MSISDN: '254708374149',
          Amount: '2000',
          TransID: 'SAF-TEST-003',
          BillRefNumber: `LOAN-${loanId}`,
          ReceiptNo: 'REC-003',
          TransTime: new Date().toISOString(),
        });

      expect(res.statusCode).toBe(200);

      // Verify loan completed
      const loansRes = await request(app).get(`/api/loans/${loanId}`);
      expect(loansRes.body.loan.status).toBe('completed');
      expect(loansRes.body.loan.balance).toBe(0);
    });

    test('Step 7: View complete loan history', async () => {
      const res = await request(app).get(`/api/loans/${loanId}/history`);

      expect(res.statusCode).toBe(200);
      expect(res.body.loan).toBeDefined();
      expect(res.body.repayments).toBeDefined();
      expect(res.body.repayments.length).toBe(3);
    });
  });

  describe('STK Push Flow', () => {
    let stkLoanId;

    test('should create loan for STK push', async () => {
      const res = await request(app)
        .post('/api/loans/request')
        .send({
          borrowerId,
          lenderId,
          amount: 2500,
          description: 'STK test loan',
        });

      expect(res.statusCode).toBe(201);
      stkLoanId = res.body.loan.id;

      // Approve
      await request(app)
        .put(`/api/loans/${stkLoanId}/approve`)
        .send({ lenderId });
    });

    test('should trigger STK push for repayment', async () => {
      const res = await request(app)
        .post('/api/safaricom/stk-push')
        .send({
          phoneNumber: '254708374149',
          amount: 500,
          loanId: stkLoanId,
          borrowerId,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.checkoutRequestId).toBeDefined();
    });

    test('should query STK status', async () => {
      const pushRes = await request(app)
        .post('/api/safaricom/stk-push')
        .send({
          phoneNumber: '254708374149',
          amount: 500,
          loanId: stkLoanId,
          borrowerId,
        });

      const statusRes = await request(app)
        .get(
          `/api/safaricom/stk-status/${pushRes.body.checkoutRequestId}`
        );

      expect(statusRes.statusCode).toBe(200);
      expect(statusRes.body.ResultCode).toBeDefined();
    });
  });

  describe('Error Scenarios', () => {
    test('should reject loan request with missing fields', async () => {
      const res = await request(app)
        .post('/api/loans/request')
        .send({
          borrowerId,
          // Missing lenderId and amount
        });

      expect(res.statusCode).toBe(400);
    });

    test('should reject loan request with invalid amount', async () => {
      const res = await request(app)
        .post('/api/loans/request')
        .send({
          borrowerId,
          lenderId,
          amount: -1000,
        });

      expect(res.statusCode).toBe(400);
    });

    test('should reject approval by non-lender', async () => {
      const res = await request(app)
        .post('/api/loans/request')
        .send({
          borrowerId,
          lenderId,
          amount: 1000,
        });

      const newLoanId = res.body.loan.id;

      const approveRes = await request(app)
        .put(`/api/loans/${newLoanId}/approve`)
        .send({
          lenderId: 'different-user-id',
        });

      expect(approveRes.statusCode).toBe(403);
    });

    test('should handle duplicate C2B callback', async () => {
      const loanRes = await request(app)
        .post('/api/loans/request')
        .send({
          borrowerId,
          lenderId,
          amount: 1000,
        });

      const dupLoanId = loanRes.body.loan.id;

      const callbackData = {
        MSISDN: '254708374149',
        Amount: '500',
        TransID: 'SAF-DUP-001',
        BillRefNumber: `LOAN-${dupLoanId}`,
        ReceiptNo: 'REC-DUP',
        TransTime: new Date().toISOString(),
      };

      const res1 = await request(app)
        .post('/api/safaricom/c2b/confirmation')
        .send(callbackData);

      const res2 = await request(app)
        .post('/api/safaricom/c2b/confirmation')
        .send(callbackData);

      expect(res1.statusCode).toBe(200);
      // Second should be idempotent
      expect(res2.statusCode).toBe(200);
    });

    test('should reject payment to non-existent loan', async () => {
      const res = await request(app)
        .post('/api/safaricom/c2b/confirmation')
        .send({
          MSISDN: '254708374149',
          Amount: '500',
          TransID: 'SAF-NONE-001',
          BillRefNumber: 'LOAN-NONEXISTENT',
          ReceiptNo: 'REC-NONE',
          TransTime: new Date().toISOString(),
        });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('Concurrent Operations', () => {
    test('should handle multiple loans simultaneously', async () => {
      const promises = Array(5)
        .fill(null)
        .map((_, i) =>
          request(app)
            .post('/api/loans/request')
            .send({
              borrowerId: `borrower-concurrent-${i}`,
              lenderId: `lender-concurrent-${i}`,
              amount: 1000 * (i + 1),
            })
        );

      const results = await Promise.all(promises);

      expect(results.length).toBe(5);
      results.forEach(res => {
        expect(res.statusCode).toBe(201);
        expect(res.body.loan).toBeDefined();
      });
    });

    test('should handle concurrent repayments on same loan', async () => {
      const loanRes = await request(app)
        .post('/api/loans/request')
        .send({
          borrowerId,
          lenderId,
          amount: 5000,
        });

      const concurrentLoanId = loanRes.body.loan.id;

      const promises = Array(3)
        .fill(null)
        .map((_, i) =>
          request(app)
            .post('/api/safaricom/c2b/confirmation')
            .send({
              MSISDN: '254708374149',
              Amount: '1000',
              TransID: `SAF-CONCURRENT-${i}-${Date.now()}`,
              BillRefNumber: `LOAN-${concurrentLoanId}`,
              ReceiptNo: `REC-CONCURRENT-${i}`,
              TransTime: new Date().toISOString(),
            })
        );

      const results = await Promise.all(promises);

      expect(results.length).toBe(3);
      results.forEach(res => {
        expect(res.statusCode).toBe(200);
      });
    });
  });

  describe('Data Integrity', () => {
    test('should maintain consistent balance', async () => {
      const loanRes = await request(app)
        .post('/api/loans/request')
        .send({
          borrowerId,
          lenderId,
          amount: 3000,
        });

      const balanceLoanId = loanRes.body.loan.id;

      // Approve and disburse
      await request(app)
        .put(`/api/loans/${balanceLoanId}/approve`)
        .send({ lenderId });

      // Get initial balance
      const initialRes = await request(app).get(
        `/api/loans/${balanceLoanId}`
      );
      let balance = initialRes.body.loan.balance;

      // Make 3 repayments
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/safaricom/c2b/confirmation')
          .send({
            MSISDN: '254708374149',
            Amount: '500',
            TransID: `SAF-BALANCE-${i}-${Date.now()}`,
            BillRefNumber: `LOAN-${balanceLoanId}`,
            ReceiptNo: `REC-BALANCE-${i}`,
            TransTime: new Date().toISOString(),
          });

        balance -= 500;
      }

      // Verify final balance
      const finalRes = await request(app).get(
        `/api/loans/${balanceLoanId}`
      );
      expect(finalRes.body.loan.balance).toBe(balance);
    });
  });
});
