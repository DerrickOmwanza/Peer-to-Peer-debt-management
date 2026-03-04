require('dotenv').config();
const { Pool } = require('pg');

console.log('🔍 Testing database connection...\n');
console.log('Configuration:');
console.log(`  Host: ${process.env.DB_HOST}`);
console.log(`  Port: ${process.env.DB_PORT}`);
console.log(`  Database: ${process.env.DB_NAME}`);
console.log(`  User: ${process.env.DB_USER}`);
console.log('');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'mpesa_debt',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

pool.query('SELECT NOW()', (err, result) => {
  if (err) {
    console.error('✗ Connection failed:');
    console.error(`  Error: ${err.message}`);
    console.error('\n📋 Troubleshooting:');
    console.error('1. Verify PostgreSQL is running');
    console.error('2. Check DB credentials in .env');
    console.error('3. Ensure database "mpesa_debt" exists');
    console.error('4. Run: createdb -U postgres mpesa_debt');
  } else {
    console.log('✓ Connected successfully!');
    console.log(`  Server time: ${result.rows[0].now}`);
  }
  pool.end();
});
