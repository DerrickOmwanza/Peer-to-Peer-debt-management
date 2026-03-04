/**
 * Performance & Load Testing
 * Tests system performance under load
 */

const { Pool } = require('pg');

class PerformanceTest {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
    });
    this.results = {
      tests: [],
      summary: {},
    };
  }

  async runTest(name, fn, iterations = 100) {
    console.log(`\n📊 Running: ${name}`);
    const startTime = Date.now();
    const times = [];

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      try {
        await fn(i);
        const duration = Date.now() - start;
        times.push(duration);
      } catch (err) {
        console.error(`❌ Iteration ${i} failed:`, err.message);
      }
    }

    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];

    const result = {
      name,
      iterations,
      totalDuration,
      avgTime: avgTime.toFixed(2),
      minTime,
      maxTime,
      p95,
      throughput: (iterations / (totalDuration / 1000)).toFixed(2),
    };

    this.results.tests.push(result);

    console.log(`✅ ${name}`);
    console.log(`   Total: ${totalDuration}ms`);
    console.log(`   Avg: ${avgTime.toFixed(2)}ms`);
    console.log(`   Min: ${minTime}ms, Max: ${maxTime}ms`);
    console.log(`   P95: ${p95}ms`);
    console.log(`   Throughput: ${result.throughput} ops/sec`);

    return result;
  }

  async testLoanCreation() {
    await this.runTest('Loan Creation', async (i) => {
      const query = `
        INSERT INTO loans (borrower_id, lender_id, amount, status)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `;

      await this.pool.query(query, [
        `borrower-perf-${i}`,
        `lender-perf-${i}`,
        1000 + i * 100,
        'pending',
      ]);
    }, 100);
  }

  async testRepaymentProcessing() {
    // Create a loan first
    const loanQuery = `
      INSERT INTO loans (borrower_id, lender_id, amount, status)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `;

    const loanRes = await this.pool.query(loanQuery, [
      'perf-borrower-main',
      'perf-lender-main',
      50000,
      'active',
    ]);

    const loanId = loanRes.rows[0].id;

    await this.runTest('Repayment Processing', async (i) => {
      const query = `
        INSERT INTO repayments (loan_id, amount, source)
        VALUES ($1, $2, $3)
        RETURNING id
      `;

      await this.pool.query(query, [loanId, 100 + i, 'online']);
    }, 100);
  }

  async testTransactionLogging() {
    await this.runTest('M-PESA Transaction Logging', async (i) => {
      const query = `
        INSERT INTO m_pesa_transactions (user_id, amount, reference, trans_id, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `;

      await this.pool.query(query, [
        `user-perf-${i}`,
        500 + i * 10,
        `LOAN-PERF-${i}`,
        `SAF-PERF-${i}-${Date.now()}`,
        'completed',
      ]);
    }, 200);
  }

  async testLoanRetrieval() {
    // Create loans first
    const insertQuery = `
      INSERT INTO loans (borrower_id, lender_id, amount, status)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `;

    const ids = [];
    for (let i = 0; i < 50; i++) {
      const res = await this.pool.query(insertQuery, [
        `borrower-get-${i}`,
        `lender-get-${i}`,
        1000,
        'active',
      ]);
      ids.push(res.rows[0].id);
    }

    await this.runTest('Loan Retrieval by ID', async (i) => {
      const loanId = ids[i % ids.length];
      const query = 'SELECT * FROM loans WHERE id = $1';
      await this.pool.query(query, [loanId]);
    }, 100);
  }

  async testBatchLoans() {
    await this.runTest('Batch Loan Insertion (10 at a time)', async (batch) => {
      const values = Array(10)
        .fill(null)
        .map((_, i) => [
          `borrower-batch-${batch}-${i}`,
          `lender-batch-${batch}-${i}`,
          500 + i * 100,
          'pending',
        ]);

      let query =
        'INSERT INTO loans (borrower_id, lender_id, amount, status) VALUES ';
      const placeholders = [];
      const flatValues = [];

      values.forEach((val, idx) => {
        const offset = idx * 4;
        placeholders.push(
          `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`
        );
        flatValues.push(...val);
      });

      query += placeholders.join(',') + ' RETURNING id';
      await this.pool.query(query, flatValues);
    }, 50);
  }

  async testComplexQuery() {
    // Create test data
    for (let i = 0; i < 10; i++) {
      await this.pool.query(
        `INSERT INTO loans (borrower_id, lender_id, amount, status)
         VALUES ($1, $2, $3, $4)`,
        [`borrower-complex-${i}`, `lender-complex-${i}`, 5000, 'active']
      );
    }

    await this.runTest(
      'Complex Join Query (loans + repayments)',
      async () => {
        const query = `
          SELECT 
            l.id,
            l.amount,
            l.status,
            COUNT(r.id) as repayment_count,
            COALESCE(SUM(r.amount), 0) as total_repaid
          FROM loans l
          LEFT JOIN repayments r ON l.id = r.loan_id
          GROUP BY l.id
          LIMIT 10
        `;
        await this.pool.query(query);
      },
      100
    );
  }

  async testConcurrentOperations() {
    console.log('\n📊 Testing Concurrent Operations');

    const concurrencyLevels = [5, 10, 20, 50];

    for (const level of concurrencyLevels) {
      const startTime = Date.now();
      const promises = [];

      for (let i = 0; i < level; i++) {
        promises.push(
          this.pool.query(
            `INSERT INTO loans (borrower_id, lender_id, amount, status)
             VALUES ($1, $2, $3, $4)`,
            [
              `borrower-concurrent-${i}`,
              `lender-concurrent-${i}`,
              1000,
              'pending',
            ]
          )
        );
      }

      await Promise.all(promises);
      const duration = Date.now() - startTime;

      const result = {
        name: `Concurrent Operations (${level})`,
        concurrency: level,
        duration,
        opsPerSec: (level / (duration / 1000)).toFixed(2),
      };

      this.results.tests.push(result);
      console.log(
        `✅ Concurrency ${level}: ${duration}ms (${result.opsPerSec} ops/sec)`
      );
    }
  }

  async testDatabaseIndexing() {
    console.log('\n📊 Testing Index Performance');

    // Test: Query with index
    const startIndexed = Date.now();
    for (let i = 0; i < 50; i++) {
      // Assuming index exists on (borrower_id)
      await this.pool.query(
        'SELECT * FROM loans WHERE borrower_id = $1',
        [`borrower-perf-${i}`]
      );
    }
    const indexedTime = Date.now() - startIndexed;

    console.log(`✅ Indexed Query (borrower_id): ${indexedTime}ms`);

    this.results.tests.push({
      name: 'Index Query Performance',
      duration: indexedTime,
      queries: 50,
      avgPerQuery: (indexedTime / 50).toFixed(2),
    });
  }

  async testConnectionPooling() {
    console.log('\n📊 Testing Connection Pooling');

    const poolSizes = [5, 10, 20];

    for (const size of poolSizes) {
      const testPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: size,
      });

      const startTime = Date.now();
      const promises = [];

      for (let i = 0; i < 100; i++) {
        promises.push(
          testPool.query('SELECT 1 as num').catch(err => {
            console.error('Pool error:', err.message);
          })
        );
      }

      await Promise.all(promises);
      const duration = Date.now() - startTime;

      console.log(
        `✅ Pool Size ${size}: ${duration}ms (${(100 / (duration / 1000)).toFixed(2)} ops/sec)`
      );

      this.results.tests.push({
        name: `Connection Pool (${size})`,
        poolSize: size,
        duration,
        opsPerSec: (100 / (duration / 1000)).toFixed(2),
      });

      await testPool.end();
    }
  }

  async testMemoryUsage() {
    console.log('\n📊 Testing Memory Usage');

    const initial = process.memoryUsage();

    // Create 1000 loans
    for (let batch = 0; batch < 100; batch++) {
      const values = Array(10)
        .fill(null)
        .map((_, i) => [
          `borrower-mem-${batch}-${i}`,
          `lender-mem-${batch}-${i}`,
          1000,
          'pending',
        ]);

      let query =
        'INSERT INTO loans (borrower_id, lender_id, amount, status) VALUES ';
      const placeholders = [];
      const flatValues = [];

      values.forEach((val, idx) => {
        const offset = idx * 4;
        placeholders.push(
          `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`
        );
        flatValues.push(...val);
      });

      query += placeholders.join(',');
      await this.pool.query(query, flatValues);
    }

    const final = process.memoryUsage();

    const heapUsed = (final.heapUsed - initial.heapUsed) / 1024 / 1024;
    console.log(`✅ Memory used: ${heapUsed.toFixed(2)}MB`);

    this.results.tests.push({
      name: 'Memory Usage (1000 inserts)',
      heapUsedMB: heapUsed.toFixed(2),
    });
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('PERFORMANCE TEST SUMMARY');
    console.log('='.repeat(60));

    this.results.tests.forEach(test => {
      console.log(`\n📈 ${test.name}`);
      Object.keys(test).forEach(key => {
        if (key !== 'name') {
          console.log(`   ${key}: ${test[key]}`);
        }
      });
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ All performance tests completed');
    console.log('='.repeat(60));

    return this.results;
  }

  async cleanup() {
    await this.pool.end();
  }
}

// Run tests if executed directly
if (require.main === module) {
  (async () => {
    const perf = new PerformanceTest();

    try {
      await perf.testLoanCreation();
      await perf.testRepaymentProcessing();
      await perf.testTransactionLogging();
      await perf.testLoanRetrieval();
      await perf.testBatchLoans();
      await perf.testComplexQuery();
      await perf.testConcurrentOperations();
      await perf.testDatabaseIndexing();
      await perf.testConnectionPooling();
      await perf.testMemoryUsage();

      perf.generateReport();
    } catch (err) {
      console.error('❌ Performance test failed:', err);
    } finally {
      await perf.cleanup();
    }
  })();
}

module.exports = PerformanceTest;
