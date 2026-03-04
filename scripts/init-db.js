const fs = require('fs');
const path = require('path');
const pool = require('../src/config/database');
require('dotenv').config();

async function initializeDatabase() {
  try {
    console.log('🔧 Initializing database...');
    
    // Test connection first
    try {
      await pool.query('SELECT NOW()');
      console.log('✓ Connected to database');
    } catch (connErr) {
      console.error('✗ Could not connect to database');
      console.error('Error:', connErr.message);
      console.error('\nSetup Instructions:');
      console.error('1. Make sure PostgreSQL is running');
      console.error('2. Create database: createdb -U postgres mpesa_debt');
      console.error('3. Update .env with correct DB_PASSWORD');
      console.error('4. Try again: npm run db:init');
      process.exit(1);
    }
    
    const schemaPath = path.join(__dirname, '../src/config/database-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split schema into individual statements and execute
    const statements = schema.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await pool.query(statement);
      }
    }
    
    console.log('✓ Database schema created successfully');
    console.log('✓ Tables created: users, loans, transactions, repayments, notifications');
    console.log('\nNext step: npm run db:seed (optional)');
    process.exit(0);
  } catch (err) {
    console.error('✗ Error initializing database:');
    console.error('Error:', err.message);
    if (err.detail) console.error('Detail:', err.detail);
    process.exit(1);
  }
}

initializeDatabase();
