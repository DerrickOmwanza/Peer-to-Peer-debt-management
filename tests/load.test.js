/**
 * Load Testing
 * Sustained high-load testing to identify bottlenecks
 */

const http = require('http');

class LoadTest {
  constructor(baseUrl = 'http://localhost:5000') {
    this.baseUrl = baseUrl;
    this.results = {
      requests: 0,
      successes: 0,
      failures: 0,
      totalTime: 0,
      responseTimes: [],
      errors: [],
    };
  }

  async makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const startTime = Date.now();

      const options = {
        hostname: url.hostname,
        port: url.port || 5000,
        path: url.pathname + url.search,
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      const req = http.request(options, (res) => {
        let body = '';

        res.on('data', (chunk) => {
          body += chunk;
        });

        res.on('end', () => {
          const duration = Date.now() - startTime;
          resolve({
            statusCode: res.statusCode,
            duration,
            body: body ? JSON.parse(body) : null,
          });
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  async runLoadTest(
    name,
    method,
    path,
    data,
    concurrency = 10,
    duration = 30000
  ) {
    console.log(
      `\n🔥 Load Test: ${name} (${concurrency} concurrent, ${duration / 1000}s)`
    );

    const startTime = Date.now();
    let isRunning = true;

    const worker = async () => {
      while (isRunning) {
        try {
          const res = await this.makeRequest(method, path, data);
          this.results.requests++;

          if (res.statusCode >= 200 && res.statusCode < 300) {
            this.results.successes++;
          } else {
            this.results.failures++;
          }

          this.results.responseTimes.push(res.duration);
        } catch (err) {
          this.results.failures++;
          this.results.errors.push(err.message);
        }
      }
    };

    // Start workers
    const workers = Array(concurrency)
      .fill(null)
      .map(() => worker());

    // Wait for duration
    await new Promise(resolve => setTimeout(resolve, duration));
    isRunning = false;

    // Wait for workers to finish
    await Promise.allSettled(workers);

    const testDuration = Date.now() - startTime;
    const rps = (this.results.requests / (testDuration / 1000)).toFixed(2);
    const avgResponseTime = (
      this.results.responseTimes.reduce((a, b) => a + b, 0) /
      this.results.responseTimes.length
    ).toFixed(2);

    const responseTimes = this.results.responseTimes.sort((a, b) => a - b);
    const p50 = responseTimes[Math.floor(responseTimes.length * 0.5)];
    const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)];
    const p99 = responseTimes[Math.floor(responseTimes.length * 0.99)];

    const result = {
      name,
      duration: testDuration,
      requests: this.results.requests,
      successes: this.results.successes,
      failures: this.results.failures,
      successRate: (
        (this.results.successes / this.results.requests) *
        100
      ).toFixed(2),
      rps,
      avgResponseTime,
      p50,
      p95,
      p99,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      errors: this.results.errors.slice(0, 5), // First 5 errors
    };

    console.log(`✅ ${name}`);
    console.log(`   Requests: ${result.requests}`);
    console.log(`   Success: ${result.successes} (${result.successRate}%)`);
    console.log(`   Failures: ${result.failures}`);
    console.log(`   RPS: ${result.rps}`);
    console.log(`   Avg Response: ${result.avgResponseTime}ms`);
    console.log(`   P50: ${result.p50}ms, P95: ${result.p95}ms, P99: ${result.p99}ms`);

    return result;
  }

  async testLoanCreationLoad() {
    await this.runLoadTest(
      'Create Loan',
      'POST',
      '/api/loans/request',
      {
        borrowerId: 'load-borrower-' + Date.now(),
        lenderId: 'load-lender-' + Date.now(),
        amount: 1000,
      },
      20,
      30000
    );
  }

  async testSTKPushLoad() {
    await this.runLoadTest(
      'STK Push',
      'POST',
      '/api/safaricom/stk-push',
      {
        phoneNumber: '254708374149',
        amount: 500,
        loanId: 'load-loan-' + Date.now(),
        borrowerId: 'load-borrower-' + Date.now(),
      },
      15,
      30000
    );
  }

  async testC2BCallbackLoad() {
    await this.runLoadTest(
      'C2B Callback',
      'POST',
      '/api/safaricom/c2b/confirmation',
      {
        MSISDN: '254708374149',
        Amount: '500',
        TransID: 'SAF-LOAD-' + Date.now(),
        BillRefNumber: 'LOAN-load-' + Date.now(),
        ReceiptNo: 'REC-LOAD',
        TransTime: new Date().toISOString(),
      },
      25,
      30000
    );
  }

  async testLoanRetrievalLoad() {
    await this.runLoadTest(
      'Loan Retrieval',
      'GET',
      '/api/loans/borrower',
      null,
      20,
      30000
    );
  }

  async testAccountBalanceLoad() {
    await this.runLoadTest(
      'Account Balance',
      'GET',
      '/api/safaricom/account-balance',
      null,
      10,
      30000
    );
  }

  async testRampUpTest() {
    console.log('\n📈 Ramp-Up Test (increasing load)');

    const concurrencyLevels = [5, 10, 20, 30, 40, 50];
    const rampUpResults = [];

    for (const concurrency of concurrencyLevels) {
      const result = await this.runLoadTest(
        `Ramp-Up (${concurrency} concurrent)`,
        'POST',
        '/api/loans/request',
        {
          borrowerId: `ramp-borrower-${concurrency}-${Date.now()}`,
          lenderId: `ramp-lender-${concurrency}-${Date.now()}`,
          amount: 1000,
        },
        concurrency,
        15000 // 15 seconds per level
      );

      rampUpResults.push(result);

      // Cool down
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    return rampUpResults;
  }

  async testStressTest() {
    console.log('\n💥 Stress Test (maximum load)');

    const result = await this.runLoadTest(
      'Maximum Load',
      'POST',
      '/api/safaricom/c2b/confirmation',
      {
        MSISDN: '254708374149',
        Amount: '100',
        TransID: 'SAF-STRESS-' + Date.now(),
        BillRefNumber: 'LOAN-stress-' + Date.now(),
        ReceiptNo: 'REC-STRESS',
        TransTime: new Date().toISOString(),
      },
      100, // 100 concurrent
      60000 // 60 seconds
    );

    return result;
  }

  async testSpikeTest() {
    console.log('\n⚡ Spike Test (sudden load increase)');

    // Normal load
    console.log('  Normal: 10 concurrent for 15s');
    await this.runLoadTest(
      'Spike - Normal Load',
      'POST',
      '/api/loans/request',
      {
        borrowerId: 'spike-normal-' + Date.now(),
        lenderId: 'spike-normal-' + Date.now(),
        amount: 1000,
      },
      10,
      15000
    );

    // Sudden spike
    console.log('  Spike: 50 concurrent for 30s');
    const spikeResult = await this.runLoadTest(
      'Spike - Peak Load',
      'POST',
      '/api/loans/request',
      {
        borrowerId: 'spike-peak-' + Date.now(),
        lenderId: 'spike-peak-' + Date.now(),
        amount: 1000,
      },
      50,
      30000
    );

    // Back to normal
    console.log('  Recovery: 10 concurrent for 15s');
    await this.runLoadTest(
      'Spike - Recovery Load',
      'POST',
      '/api/loans/request',
      {
        borrowerId: 'spike-recovery-' + Date.now(),
        lenderId: 'spike-recovery-' + Date.now(),
        amount: 1000,
      },
      10,
      15000
    );

    return spikeResult;
  }

  async testErrorHandling() {
    console.log('\n❌ Error Handling Test');

    // Test with invalid data
    const result = await this.runLoadTest(
      'Invalid Request Handling',
      'POST',
      '/api/loans/request',
      {
        borrowerId: '', // Invalid
        lenderId: '',
        amount: -1000, // Invalid
      },
      10,
      15000
    );

    return result;
  }

  generateReport(allResults) {
    console.log('\n' + '='.repeat(80));
    console.log('LOAD TEST SUMMARY');
    console.log('='.repeat(80));

    allResults.forEach(result => {
      console.log(`\n📊 ${result.name}`);
      Object.keys(result).forEach(key => {
        if (key !== 'name' && key !== 'errors') {
          console.log(`   ${key}: ${result[key]}`);
        }
      });

      if (result.errors && result.errors.length > 0) {
        console.log(`   Sample errors: ${result.errors[0]}`);
      }
    });

    console.log('\n' + '='.repeat(80));
    console.log('✅ Load testing completed');
    console.log('='.repeat(80));
  }
}

// Run tests if executed directly
if (require.main === module) {
  (async () => {
    const load = new LoadTest();

    try {
      console.log('⏳ Starting load tests...');
      console.log('⚠️  Ensure server is running on http://localhost:5000');

      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for user to start server

      const allResults = [];

      // Individual endpoint tests
      await load.testLoanCreationLoad();
      await load.testSTKPushLoad();
      await load.testC2BCallbackLoad();
      await load.testLoanRetrievalLoad();
      await load.testAccountBalanceLoad();

      // Complex tests
      const rampUp = await load.testRampUpTest();
      allResults.push(...rampUp);

      const stress = await load.testStressTest();
      allResults.push(stress);

      const spike = await load.testSpikeTest();
      allResults.push(spike);

      const errors = await load.testErrorHandling();
      allResults.push(errors);

      load.generateReport(allResults);
    } catch (err) {
      console.error('❌ Load test failed:', err);
    }
  })();
}

module.exports = LoadTest;
