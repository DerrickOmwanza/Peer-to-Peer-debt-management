# 🗄️ PostgreSQL Quick Setup for Windows

PostgreSQL is not found on your system. Follow this guide to install it in 5 minutes.

---

## 📥 Step 1: Download PostgreSQL

Go to: **https://www.postgresql.org/download/windows/**

Click: **Download the installer**

**Latest Version**: PostgreSQL 16 (or 15, both work)

---

## ⚙️ Step 2: Install PostgreSQL

**Double-click the installer** (.exe file)

### Installation Dialog 1: License
- Click **I Agree**

### Installation Dialog 2: Installation Directory
- Default: `C:\Program Files\PostgreSQL\16`
- **Click Next** (don't change)

### Installation Dialog 3: Select Components
- ✅ PostgreSQL Server (CHECK)
- ✅ pgAdmin 4 (CHECK - optional, helps manage DB)
- ✅ Stack Builder (UNCHECK)
- **Click Next**

### Installation Dialog 4: Data Directory
- Default: `C:\Program Files\PostgreSQL\16\data`
- **Click Next**

### Installation Dialog 5: Password
- **Enter password twice**: `postgres` (simple, remember it!)
- **Click Next**

### Installation Dialog 6: Port
- Default: `5432`
- **Click Next** (don't change)

### Installation Dialog 7: Locale
- Default: (your system locale)
- **Click Next**

### Installation Dialog 8: Ready to Install
- **Click Next** → Installation starts (2-3 minutes)

### Installation Dialog 9: Finish
- **Uncheck "Stack Builder"**
- **Click Finish**

---

## ✅ Step 3: Verify Installation

Open **PowerShell** and test:

```powershell
psql --version
```

**Expected Output:**
```
psql (PostgreSQL) 16.2
```

If you see version number → ✅ PostgreSQL installed successfully!

If error → PostgreSQL is not in PATH, continue to Step 4

---

## 🔧 Step 4: Add PostgreSQL to PATH (If Needed)

If `psql --version` doesn't work:

### On Windows:
1. Right-click **This PC** or **My Computer**
2. Click **Properties**
3. Click **Advanced system settings**
4. Click **Environment Variables**
5. Under **System variables**, click **New**
6. Variable name: `Path` (if doesn't exist)
7. Variable value: `C:\Program Files\PostgreSQL\16\bin` (adjust version if needed)
8. Click **OK** three times
9. **Restart PowerShell** (close and reopen)
10. Test again: `psql --version`

---

## 🚀 Step 5: Start PostgreSQL Service

PostgreSQL should start automatically. To verify:

```powershell
# Windows Service check
Get-Service postgresql-x64-16
```

**Expected Output:**
```
Status   Name                DisplayName
------   ----                -----------
Running  postgresql-x64-16   postgresql-x64-16
```

If shows "Running" → ✅ PostgreSQL is active

---

## 🔑 Step 6: Connect to PostgreSQL

```powershell
psql -U postgres
```

You'll be prompted:
```
Password for user postgres: 
```

Enter: `postgres` (the password you set)

**Expected Output:**
```
psql (16.2)
Type "help" for help.

postgres=#
```

The `postgres=#` prompt means you're connected! ✅

---

## ✅ Step 7: Create Database

In the `postgres=#` prompt, run:

```sql
CREATE DATABASE mpesa_debt;
```

**Expected Output:**
```
CREATE DATABASE
```

Then list databases:
```sql
\l
```

You should see `mpesa_debt` in the list.

Exit:
```sql
\q
```

---

## 🎯 Now You're Ready for Testing

With PostgreSQL running, go back to testing:

```powershell
cd C:\PeerToPeerDebtManagement
npm run db:init
npm run dev
```

---

## ⏱️ Troubleshooting

### Issue: "psql: command not found" even after PATH setup

**Solution:**
1. Close PowerShell completely
2. Open new PowerShell window
3. Try again: `psql --version`

### Issue: "password authentication failed"

**Solution:**
- Password is case-sensitive
- Default password is `postgres`
- If you forgot, uninstall and reinstall PostgreSQL

### Issue: "could not connect to server"

**Solution:**
```powershell
# Restart PostgreSQL service
Restart-Service postgresql-x64-16
```

### Issue: Port 5432 already in use

**Solution:**
```powershell
# Find process using port 5432
netstat -ano | findstr :5432

# Kill the process (if needed)
taskkill /PID <PID> /F
```

---

## 📊 Verification Checklist

After installation, verify:

- [ ] `psql --version` works
- [ ] Can connect: `psql -U postgres`
- [ ] PostgreSQL service running
- [ ] Database `mpesa_debt` created
- [ ] Ready for backend testing

---

## 🚀 Ready to Test?

Once PostgreSQL is set up:

```powershell
cd C:\PeerToPeerDebtManagement

# Initialize database
npm run db:init

# Start backend
npm run dev
```

Then proceed with **STEP 1 of TESTING_CHECKLIST.md**

---

**Installation takes ~5 minutes. Let me know once PostgreSQL is running!** 🎉
