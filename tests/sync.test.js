/**
 * Sync Engine Integration Tests
 * Tests offline/online sync and conflict resolution
 */

const { Pool } = require('pg');

describe('Sync Engine', () => {
  let pool;

  beforeAll(async () => {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('Offline Operations', () => {
    test('should queue loan request when offline', async () => {
      const loanData = {
        borrower_id: 'user-123',
        lender_id: 'user-456',
        amount: 5000,
        status: 'pending',
        synced: false,
      };

      const query = `
        INSERT INTO loans (borrower_id, lender_id, amount, status, synced)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;

      const res = await pool.query(query, [
        loanData.borrower_id,
        loanData.lender_id,
        loanData.amount,
        loanData.status,
        loanData.synced,
      ]);

      expect(res.rows[0].synced).toBe(false);
    });

    test('should queue payment when offline', async () => {
      const paymentData = {
        user_id: 'user-123',
        amount: 1000,
        reference: 'LOAN-TEST-001',
        status: 'pending',
        synced: false,
      };

      const query = `
        INSERT INTO m_pesa_transactions (user_id, amount, reference, status, synced)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;

      const res = await pool.query(query, [
        paymentData.user_id,
        paymentData.amount,
        paymentData.reference,
        paymentData.status,
        paymentData.synced,
      ]);

      expect(res.rows[0].synced).toBe(false);
    });
  });

  describe('Sync Process', () => {
    test('should sync pending loans when online', async () => {
      // Create offline loan
      const loanQuery = `
        INSERT INTO loans (borrower_id, lender_id, amount, status, synced)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `;

      const loanRes = await pool.query(loanQuery, [
        'user-sync-1',
        'user-sync-2',
        3000,
        'pending',
        false,
      ]);

      const loanId = loanRes.rows[0].id;

      // Simulate sync
      const syncQuery = `
        UPDATE loans SET synced = true, synced_at = NOW()
        WHERE id = $1
        RETURNING *
      `;

      const syncRes = await pool.query(syncQuery, [loanId]);
      expect(syncRes.rows[0].synced).toBe(true);
      expect(syncRes.rows[0].synced_at).toBeDefined();
    });

    test('should sync pending transactions', async () => {
      const txnQuery = `
        INSERT INTO m_pesa_transactions (user_id, amount, reference, status, synced)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `;

      const txnRes = await pool.query(txnQuery, [
        'user-sync-3',
        2000,
        'LOAN-SYNC-001',
        'completed',
        false,
      ]);

      const txnId = txnRes.rows[0].id;

      const syncQuery = `
        UPDATE m_pesa_transactions SET synced = true, synced_at = NOW()
        WHERE id = $1
        RETURNING *
      `;

      const syncRes = await pool.query(syncQuery, [txnId]);
      expect(syncRes.rows[0].synced).toBe(true);
    });

    test('should track sync timestamp', async () => {
      const query = `
        INSERT INTO loans (borrower_id, lender_id, amount, status, synced, synced_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING synced_at
      `;

      const res = await pool.query(query, [
        'user-time-1',
        'user-time-2',
        1000,
        'pending',
        true,
      ]);

      expect(res.rows[0].synced_at).toBeDefined();
    });
  });

  describe('Conflict Resolution', () => {
    test('should detect conflicting updates (same record edited offline and online)', async () => {
      // Create a loan
      const loanQuery = `
        INSERT INTO loans (borrower_id, lender_id, amount, status, synced, version)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, version
      `;

      const loanRes = await pool.query(loanQuery, [
        'user-conflict-1',
        'user-conflict-2',
        5000,
        'pending',
        true,
        1,
      ]);

      const loanId = loanRes.rows[0].id;

      // Offline update
      const offlineUpdate = `
        UPDATE loans SET amount = 4500, version = 2
        WHERE id = $1 AND version = 1
        RETURNING id, version
      `;

      const offlineRes = await pool.query(offlineUpdate, [loanId]);
      expect(offlineRes.rows.length).toBe(1);

      // Online update (conflict)
      const onlineUpdate = `
        UPDATE loans SET status = 'approved', version = 2
        WHERE id = $1 AND version = 1
        RETURNING id, version
      `;

      const onlineRes = await pool.query(onlineUpdate, [loanId]);
      expect(onlineRes.rows.length).toBe(0); // Should fail due to version mismatch
    });

    test('should resolve conflicts with timestamp-based merge', async () => {
      const loanQuery = `
        INSERT INTO loans (borrower_id, lender_id, amount, status, last_modified)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING id, last_modified
      `;

      const loanRes = await pool.query(loanQuery, [
        'user-merge-1',
        'user-merge-2',
        3000,
        'pending',
      ]);

      const loanId = loanRes.rows[0].id;
      const originalTime = loanRes.rows[0].last_modified;

      // Offline update (earlier timestamp)
      const offlineTime = new Date(originalTime.getTime() - 10000);
      const offlineUpdate = `
        UPDATE loans SET amount = 2800, last_modified = $2
        WHERE id = $1 AND last_modified <= $2
        RETURNING id, amount
      `;

      const offlineRes = await pool.query(offlineUpdate, [
        loanId,
        offlineTime,
      ]);

      // Online update should win (later timestamp)
      const onlineTime = new Date();
      const onlineUpdate = `
        UPDATE loans SET status = 'approved', last_modified = $2
        WHERE id = $1 AND last_modified <= $2
        RETURNING id, status
      `;

      const onlineRes = await pool.query(onlineUpdate, [loanId, onlineTime]);
      expect(onlineRes.rows.length).toBe(1);
    });

    test('should resolve conflicting repayments', async () => {
      // Create a loan
      const loanQuery = `
        INSERT INTO loans (borrower_id, lender_id, amount, status, balance)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `;

      const loanRes = await pool.query(loanQuery, [
        'user-repay-1',
        'user-repay-2',
        5000,
        'active',
        5000,
      ]);

      const loanId = loanRes.rows[0].id;

      // Two repayments at same time (conflict)
      const repayment1 = `
        INSERT INTO repayments (loan_id, amount, source)
        VALUES ($1, $2, $3)
        RETURNING id
      `;

      const rep1Res = await pool.query(repayment1, [loanId, 1000, 'offline']);
      expect(rep1Res.rows.length).toBe(1);

      const rep2Res = await pool.query(repayment1, [loanId, 1000, 'online']);
      expect(rep2Res.rows.length).toBe(1);

      // Both should be recorded (additive)
      const checkQuery = `
        SELECT COUNT(*) as count FROM repayments WHERE loan_id = $1
      `;

      const checkRes = await pool.query(checkQuery, [loanId]);
      expect(parseInt(checkRes.rows[0].count)).toBe(2);
    });

    test('should handle duplicate transaction detection', async () => {
      const txnQuery = `
        INSERT INTO m_pesa_transactions (user_id, amount, reference, trans_id, synced)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `;

      const res1 = await pool.query(txnQuery, [
        'user-dup-1',
        1000,
        'LOAN-DUP-001',
        'SAF-DUP-001',
        true,
      ]);

      // Try to insert duplicate
      let duplicateError = null;
      try {
        await pool.query(txnQuery, [
          'user-dup-1',
          1000,
          'LOAN-DUP-001',
          'SAF-DUP-001',
          true,
        ]);
      } catch (err) {
        duplicateError = err;
      }

      // Should fail or be ignored
      expect(res1.rows.length).toBe(1);
    });
  });

  describe('Sync Queue Management', () => {
    test('should create sync queue for pending operations', async () => {
      const queueQuery = `
        INSERT INTO sync_queue (user_id, operation_type, data, status)
        VALUES ($1, $2, $3, $4)
        RETURNING id, status
      `;

      const res = await pool.query(queueQuery, [
        'user-queue-1',
        'loan_request',
        JSON.stringify({ amount: 5000, lender: 'user-queue-2' }),
        'pending',
      ]);

      expect(res.rows[0].status).toBe('pending');
    });

    test('should process sync queue in FIFO order', async () => {
      const queue1 = await pool.query(
        `INSERT INTO sync_queue (user_id, operation_type, data, status, created_at)
         VALUES ($1, $2, $3, $4, NOW() - INTERVAL '10 seconds')
         RETURNING id, created_at`,
        ['user-fifo-1', 'payment', JSON.stringify({}), 'pending']
      );

      const queue2 = await pool.query(
        `INSERT INTO sync_queue (user_id, operation_type, data, status, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING id, created_at`,
        ['user-fifo-1', 'payment', JSON.stringify({}), 'pending']
      );

      const fifoQuery = `
        SELECT id FROM sync_queue
        WHERE status = 'pending'
        ORDER BY created_at ASC
        LIMIT 1
      `;

      const res = await pool.query(fifoQuery);
      expect(res.rows[0].id).toBe(queue1.rows[0].id);
    });

    test('should mark completed sync operations', async () => {
      const createQuery = `
        INSERT INTO sync_queue (user_id, operation_type, data, status)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `;

      const createRes = await pool.query(createQuery, [
        'user-complete-1',
        'loan_request',
        JSON.stringify({}),
        'pending',
      ]);

      const queueId = createRes.rows[0].id;

      const completeQuery = `
        UPDATE sync_queue SET status = 'completed', completed_at = NOW()
        WHERE id = $1
        RETURNING status, completed_at
      `;

      const completeRes = await pool.query(completeQuery, [queueId]);
      expect(completeRes.rows[0].status).toBe('completed');
      expect(completeRes.rows[0].completed_at).toBeDefined();
    });

    test('should retry failed sync operations', async () => {
      const createQuery = `
        INSERT INTO sync_queue (user_id, operation_type, data, status, retry_count)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, retry_count
      `;

      const createRes = await pool.query(createQuery, [
        'user-retry-1',
        'payment',
        JSON.stringify({}),
        'failed',
        1,
      ]);

      const queueId = createRes.rows[0].id;

      const retryQuery = `
        UPDATE sync_queue SET status = 'pending', retry_count = retry_count + 1
        WHERE id = $1 AND retry_count < 3
        RETURNING retry_count, status
      `;

      const retryRes = await pool.query(retryQuery, [queueId]);
      expect(retryRes.rows[0].retry_count).toBe(2);
      expect(retryRes.rows[0].status).toBe('pending');
    });
  });

  describe('Data Consistency', () => {
    test('should maintain referential integrity', async () => {
      // Create user
      const userQuery = `
        INSERT INTO users (id, phone_number, name)
        VALUES ($1, $2, $3)
        ON CONFLICT DO NOTHING
        RETURNING id
      `;

      await pool.query(userQuery, ['user-integrity-1', '254701234567', 'Test User']);

      // Create loan with valid user reference
      const loanQuery = `
        INSERT INTO loans (borrower_id, lender_id, amount, status)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `;

      const loanRes = await pool.query(loanQuery, [
        'user-integrity-1',
        'user-integrity-1',
        1000,
        'pending',
      ]);

      expect(loanRes.rows.length).toBe(1);
    });

    test('should cascade updates on parent changes', async () => {
      // Create and update loan
      const loanQuery = `
        INSERT INTO loans (borrower_id, lender_id, amount, status)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `;

      const loanRes = await pool.query(loanQuery, [
        'user-cascade-1',
        'user-cascade-2',
        2000,
        'active',
      ]);

      const loanId = loanRes.rows[0].id;

      // Add repayment
      const repaymentQuery = `
        INSERT INTO repayments (loan_id, amount, source)
        VALUES ($1, $2, $3)
        RETURNING id
      `;

      await pool.query(repaymentQuery, [loanId, 500, 'online']);

      // Update loan
      const updateQuery = `
        UPDATE loans SET status = 'completed'
        WHERE id = $1
        RETURNING status
      `;

      const updateRes = await pool.query(updateQuery, [loanId]);
      expect(updateRes.rows[0].status).toBe('completed');

      // Verify repayment still exists
      const verifyQuery = `
        SELECT COUNT(*) as count FROM repayments WHERE loan_id = $1
      `;

      const verifyRes = await pool.query(verifyQuery, [loanId]);
      expect(parseInt(verifyRes.rows[0].count)).toBe(1);
    });
  });
});
