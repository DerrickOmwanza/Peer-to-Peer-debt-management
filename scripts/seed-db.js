const pool = require('../src/config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function seedDatabase() {
  try {
    console.log('Seeding database with sample data...');
    
    // Create sample users
    const user1Phone = '+254701234567';
    const user2Phone = '+254702345678';
    const password = await bcrypt.hash('password123', 10);
    
    const user1 = await pool.query(
      `INSERT INTO users (id, phone_number, full_name, email, password_hash, wallet_balance)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, phone_number, full_name`,
      [uuidv4(), user1Phone, 'John Borrower', 'john@example.com', password, 5000]
    );
    
    const user2 = await pool.query(
      `INSERT INTO users (id, phone_number, full_name, email, password_hash, wallet_balance)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, phone_number, full_name`,
      [uuidv4(), user2Phone, 'Jane Lender', 'jane@example.com', password, 10000]
    );
    
    const borrowerId = user1.rows[0].id;
    const lenderId = user2.rows[0].id;
    
    // Create sample loan
    const loan = await pool.query(
      `INSERT INTO loans (id, borrower_id, lender_id, principal_amount, remaining_balance, repayment_method, repayment_amount, repayment_start_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [uuidv4(), borrowerId, lenderId, 5000, 4500, 'fixed', 500, new Date('2025-12-01'), 'active']
    );
    
    // Create sample transaction
    const transaction = await pool.query(
      `INSERT INTO transactions (id, user_id, amount, transaction_type, description, source_phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [uuidv4(), borrowerId, 1000, 'incoming', 'Payment from client', 'unknown']
    );
    
    // Create sample repayment
    const repayment = await pool.query(
      `INSERT INTO repayments (id, loan_id, amount_deducted, remaining_balance_after, transaction_id, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [uuidv4(), loan.rows[0].id, 500, 4500, transaction.rows[0].id, 'completed']
    );
    
    console.log('✓ Sample data seeded successfully');
    console.log(`  - User 1: ${user1Phone}`);
    console.log(`  - User 2: ${user2Phone}`);
    console.log(`  - Loan created with ID: ${loan.rows[0].id}`);
    console.log(`  - Repayment recorded with ID: ${repayment.rows[0].id}`);
    
    process.exit(0);
  } catch (err) {
    console.error('✗ Error seeding database:', err.message);
    process.exit(1);
  }
}

seedDatabase();
