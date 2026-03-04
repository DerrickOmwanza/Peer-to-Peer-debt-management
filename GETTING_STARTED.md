# Getting Started - M-PESA Debt Allocation System

Follow this checklist to get the project running.

## ✅ Completed

- [x] Project structure created
- [x] Node.js dependencies installed (`npm install`)
- [x] All backend code written
- [x] Database schema designed
- [x] Documentation created

## 📋 Your TODO (In Order)

### 1. Install PostgreSQL (5-10 minutes)
- [ ] Read **INSTALL_POSTGRES.md**
- [ ] Download PostgreSQL from https://www.postgresql.org/download/windows/
- [ ] Run the installer
- [ ] **IMPORTANT: Remember your postgres password!**
- [ ] Verify installation by running in Command Prompt:
  ```
  "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres
  ```

### 2. Create Database
- [ ] Run this command:
  ```
  "C:\Program Files\PostgreSQL\16\bin\createdb.exe" -U postgres mpesa_debt
  ```

### 3. Configure Environment
- [ ] Open `.env` file
- [ ] Change `DB_PASSWORD=password` to your actual password:
  ```
  DB_PASSWORD=your_postgres_password_here
  ```

### 4. Test Connection
- [ ] Run: `node test-connection.js`
- [ ] You should see: `✓ Connected successfully!`
- [ ] If it fails, check **POSTGRES_PASSWORD_HELP.md**

### 5. Initialize Database
- [ ] Run: `npm run db:init`
- [ ] You should see: `✓ Database schema created successfully`

### 6. (Optional) Add Sample Data
- [ ] Run: `npm run db:seed`
- [ ] Creates 2 test users and 1 loan

### 7. Start the Server
- [ ] Run: `npm run dev`
- [ ] You should see:
  ```
  Server running on http://localhost:5000
  ✓ Database connected
  ```

## ✨ You're Done!

The API is now running. Test it:

### Option A: Postman (Recommended)
1. Download Postman from https://www.postman.com/
2. Import `postman-collection.json`
3. Follow the test flow in the collection

### Option B: Browser
- Health check: http://localhost:5000/api/health
- Should return: `{"status":"Server is running"}`

### Option C: cURL
```bash
curl http://localhost:5000/api/health
```

## 📚 Documentation

- **README.md** - Full API documentation
- **INSTALL_POSTGRES.md** - PostgreSQL installation
- **POSTGRES_PASSWORD_HELP.md** - Password troubleshooting
- **DB_SETUP_INSTRUCTIONS.md** - Database setup
- **SETUP_GUIDE.md** - Quick reference
- **postman-collection.json** - API testing

## 🚀 Next Steps (After Server is Running)

1. **Test API endpoints** using Postman collection:
   - Register users
   - Create loans
   - Simulate transactions
   - Check automatic repayment triggers
   - View notifications

2. **Frontend Development** (not started yet):
   - React/Vue web app
   - User dashboard
   - Loan request form
   - Transaction history

3. **Advanced Features** (MVP+):
   - SMS notifications
   - Email service
   - Advanced scheduling
   - Analytics

## ❓ Issues?

- **Connection failed?** → See POSTGRES_PASSWORD_HELP.md
- **Can't find psql?** → Add to PATH or use full path
- **Server won't start?** → Check if port 5000 is available
- **Database errors?** → Run `npm run db:init` again

## Quick Commands Reference

```bash
# Test connection
node test-connection.js

# Initialize database
npm run db:init

# Seed sample data
npm run db:seed

# Start development server (auto-reload)
npm run dev

# Start production server
npm start
```

---

**Questions?** Check the relevant .md file or the README.md for full API documentation.
