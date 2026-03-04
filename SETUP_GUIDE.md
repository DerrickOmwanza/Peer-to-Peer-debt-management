# Quick Setup Guide

## Step 1: Install Node Dependencies
```bash
npm install
```

## Step 2: Create PostgreSQL Database
```bash
# If PostgreSQL is running:
createdb mpesa_debt
```

## Step 3: Configure Environment Variables
```bash
# Copy and edit
cp .env.example .env

# Edit .env with your database credentials:
# DB_HOST=localhost (or your DB host)
# DB_USER=postgres (or your username)
# DB_PASSWORD=your_password
```

## Step 4: Initialize Database
```bash
npm run db:init
```

This will create all tables: users, loans, transactions, repayments, notifications

## Step 5: (Optional) Seed Sample Data
```bash
npm run db:seed
```

Creates 2 sample users, 1 loan, and 1 repayment for testing.

## Step 6: Start Server
```bash
npm run dev
```

Server starts on `http://localhost:5000`

## Testing

### Option A: Use Postman (Recommended)
Import the `postman-collection.json` file into Postman and follow the test flow.

### Option B: Use cURL
See examples in the README.md

## Common Issues

### Database Connection Error
- Make sure PostgreSQL is running
- Check credentials in .env
- Verify database exists: `psql -l`

### Port Already in Use
```bash
# Change PORT in .env or kill process using port 5000
```

### JWT Token Expired
JWT tokens expire after 24 hours. Login again to get a new token.

## Database Schema

**Users**: id, phone_number, full_name, email, password_hash, wallet_balance, status, created_at, updated_at

**Loans**: id, borrower_id, lender_id, principal_amount, remaining_balance, repayment_method, repayment_amount, repayment_start_date, repayment_frequency, status, created_at, updated_at

**Transactions**: id, user_id, amount, transaction_type, description, source_phone, created_at

**Repayments**: id, loan_id, amount_deducted, remaining_balance_after, transaction_id, status, created_at

**Notifications**: id, user_id, loan_id, repayment_id, notification_type, message, status, delivery_method, created_at

---

For detailed API documentation, see README.md
