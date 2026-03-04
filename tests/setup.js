// Global test setup
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://postgres:password@localhost:5432/mpesa_debt_test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.SAFARICOM_CONSUMER_KEY = 'test-key';
process.env.SAFARICOM_CONSUMER_SECRET = 'test-secret';
process.env.SAFARICOM_SHORT_CODE = '174379';
process.env.SAFARICOM_PASSKEY = 'bfb279f9aa9bdbcf158e97dd1a503f90';

// Mock timers if needed
jest.useFakeTimers();
