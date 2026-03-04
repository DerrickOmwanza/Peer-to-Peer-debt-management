# PostgreSQL Installation Guide for Windows 11

## Step 1: Download PostgreSQL

1. Go to https://www.postgresql.org/download/windows/
2. Click **"Download the installer"** button
3. Choose **PostgreSQL 16** (or latest version)
4. Select the installer for Windows (64-bit recommended for Windows 11)
5. Save the installer (usually `postgresql-16.x-x-windows-x64.exe`)

## Step 2: Run the Installer

1. Double-click the downloaded installer
2. Click **"Next"** through the welcome screen
3. Choose installation folder (default `C:\Program Files\PostgreSQL\16` is fine)
4. Click **"Next"**

## Step 3: Select Components

Make sure these are checked:
- ✅ PostgreSQL Server
- ✅ pgAdmin 4 (helpful GUI tool)
- ✅ Command Line Tools
- ✅ Development Libraries

Click **"Next"**

## Step 4: Data Directory

- Use default: `C:\Program Files\PostgreSQL\16\data`
- Click **"Next"**

## Step 5: Set PostgreSQL Password ⚠️ IMPORTANT

1. Enter a password for the `postgres` user (the admin account)
   - Example: `postgres123` (remember this!)
2. Confirm the password
3. **Click "Next"**

**⚠️ IMPORTANT: Write down this password!** You'll need it for `.env`

## Step 6: Port Configuration

- Default port: **5432** (don't change this)
- Click **"Next"**

## Step 7: Locale

- Select your locale (default is usually fine)
- Click **"Next"**

## Step 8: Review and Install

1. Review all settings
2. Click **"Next"** to start installation
3. Wait for installation to complete (2-5 minutes)
4. **Uncheck** "Stack Builder" if it appears at the end
5. Click **"Finish"**

## Step 9: Verify Installation

Open Command Prompt and run:
```
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "SELECT version();"
```

You should see PostgreSQL version information.

If prompted for password, enter the password you created in Step 5.

## Step 10: Create the Database

Run this command:
```
"C:\Program Files\PostgreSQL\16\bin\createdb.exe" -U postgres mpesa_debt
```

When prompted, enter your PostgreSQL password.

## Step 11: Update .env File

1. Go back to the project folder
2. Open `.env`
3. Update this line with YOUR password:
   ```
   DB_PASSWORD=your_password_from_step_5
   ```

For example:
```
DB_PASSWORD=postgres123
```

## Step 12: Test Connection

Run:
```
node test-connection.js
```

You should see:
```
✓ Connected successfully!
  Server time: 2025-11-28 ...
```

## Step 13: Initialize Database

Run:
```
npm run db:init
```

You should see:
```
✓ Connected to database
✓ Database schema created successfully
✓ Tables created: users, loans, transactions, repayments, notifications
```

## Step 14: Start the Server

Run:
```
npm run dev
```

You should see:
```
Server running on http://localhost:5000
✓ Database connected
```

## Done! 🎉

Your backend is now running. You can test it at:
- Health check: http://localhost:5000/api/health
- Import `postman-collection.json` into Postman to test APIs

---

## Troubleshooting

### "command not found" when running psql
PostgreSQL might not be in PATH. Try the full path:
```
cd "C:\Program Files\PostgreSQL\16\bin"
psql -U postgres
```

### "password authentication failed"
You entered the wrong password. Either:
1. Try the password you created during installation again
2. Or follow the reset steps in POSTGRES_PASSWORD_HELP.md

### Port 5432 already in use
Another program is using port 5432. Change in `.env`:
```
DB_PORT=5433
```

### "database does not exist"
Run the createdb command again:
```
"C:\Program Files\PostgreSQL\16\bin\createdb.exe" -U postgres mpesa_debt
```

### PostgreSQL service not running
1. Press `WIN + R`
2. Type `services.msc`
3. Find "postgresql-x64-16"
4. Right-click → Start

---

Need help? Check:
- DB_SETUP_INSTRUCTIONS.md
- POSTGRES_PASSWORD_HELP.md
