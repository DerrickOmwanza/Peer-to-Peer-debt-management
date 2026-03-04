# Database Setup Instructions for Windows

Your npm dependencies are installed! Now you need to set up PostgreSQL.

## Step 1: Open PostgreSQL Command Prompt

1. Press `WIN + R`
2. Type `cmd` and press Enter
3. Run as Administrator if prompted

## Step 2: Create the Database

Run this command:
```
"C:\Program Files\PostgreSQL\16\bin\createdb.exe" -U postgres mpesa_debt
```

**When prompted for a password**, enter your PostgreSQL password (the one you set during PostgreSQL installation).

### If the command doesn't work:
Try this instead:
```
cd "C:\Program Files\PostgreSQL\16\bin"
createdb -U postgres mpesa_debt
```

## Step 3: Verify Database Creation

Check if the database was created:
```
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -l
```

Look for `mpesa_debt` in the list.

## Step 4: Update .env with Your PostgreSQL Password

Open `.env` file in the project root and change:
```
DB_PASSWORD=password
```

to your actual PostgreSQL password:
```
DB_PASSWORD=your_actual_password
```

## Step 5: Initialize the Database Schema

From the project root directory, run:
```
npm run db:init
```

This will create all tables (users, loans, transactions, repayments, notifications).

## Step 6: (Optional) Seed Sample Data

Run:
```
npm run db:seed
```

This creates 2 sample users and 1 loan for testing.

## Step 7: Start the Server

Run:
```
npm run dev
```

You should see:
```
Server running on http://localhost:5000
✓ Database connected
```

## Troubleshooting

### "Connection refused" error
- Make sure PostgreSQL service is running
- In Windows Services, check "postgresql-x64-16" is Running

### "password authentication failed"
- Make sure you entered the correct PostgreSQL password in .env
- The password is what you set during PostgreSQL installation

### "database does not exist"
- Run the createdb command again
- Verify with psql -U postgres -l

### "psql: command not found"
- Add PostgreSQL to PATH:
  - Go to Environment Variables
  - Add `C:\Program Files\PostgreSQL\16\bin` to PATH
  - Restart command prompt

## Once Everything is Running

- API is at: http://localhost:5000
- Health check: http://localhost:5000/api/health
- Import `postman-collection.json` into Postman to test APIs
- Read README.md for API documentation
