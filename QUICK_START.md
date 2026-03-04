# Quick Start Guide - M-PESA Debt Allocation System

## ⚡ Get Running in 2 Steps

### Step 1: Start Backend (Terminal 1)
```bash
cd "c:\Users\ADMIN\Desktop\XAMPP 2025\htdocs\Peer-Peer M-Pesa debt management"
npm run dev
```
✅ Backend ready on http://localhost:5000

### Step 2: Start Frontend (Terminal 2)
```bash
cd "c:\Users\ADMIN\Desktop\XAMPP 2025\htdocs\Peer-Peer M-Pesa debt management\web"
npm start
```
✅ Frontend ready on http://localhost:3001

---

## 🔓 Login

**Email:** john@example.com  
**Password:** password123

---

## 🎯 5-Minute Demo

### 1. View Dashboard
- Profile info
- Loans summary
- Recent notifications

### 2. Add Funds
- Click "Wallet" in menu
- Click "Quick Add +Ksh 5000"
- Balance updated

### 3. Request Loan
- Click "Request Loan"
- Lender Phone: +254702345678
- Amount: 5000
- Submit

### 4. Simulate Transaction
- Click "Transactions"
- Amount: 1000
- Click "Simulate Transaction"
- **Auto-repayment triggers!**

### 5. View Results
- Click "Repayments"
- See Ksh 500 deducted
- Click "My Loans"
- See balance reduced

---

## 📱 Pages Overview

| Page | What It Does |
|------|-------------|
| **Dashboard** | Overview of everything |
| **My Loans** | View all your loans |
| **Request Loan** | Create new loan |
| **Transactions** | View & simulate payments |
| **Repayments** | Track repayment history |
| **Wallet** | Manage your balance |

---

## 🔑 Test Accounts

### Account 1 (Borrower)
```
Email: john@example.com
Password: password123
Phone: +254701234567
```

### Account 2 (Lender)
```
Email: jane@example.com
Password: password123
Phone: +254702345678
```

---

## 🧪 What to Try

### Try This Flow:
1. ✅ Login & add funds
2. ✅ Request loan from other user
3. ✅ Switch account & approve
4. ✅ Switch back & simulate transaction
5. ✅ Watch auto-repayment happen
6. ✅ Check repayment history

### Or Just Explore:
- View dashboard
- Add funds to wallet
- Create loan requests
- Check notifications
- Browse transaction history

---

## 🐛 Troubleshooting

### Backend won't start?
- Make sure PostgreSQL is running
- Check .env has correct password
- Try: npm run db:init

### Frontend won't start?
- Kill any process on port 3001
- Delete node_modules & reinstall
- Try: npm install

### Database error?
- Check PostgreSQL service is running
- Verify .env credentials
- Run: npm run db:init

---

## 📊 Key Features

✅ **Automatic Repayment** - Deducts from incoming transactions  
✅ **Loan Tracking** - See all loans and progress  
✅ **Transactions** - View payment history  
✅ **Notifications** - Get alerts for all actions  
✅ **Wallet** - Manage your balance  
✅ **Repayments** - Track all payments made  

---

## 📚 Documentation

For more details, see:
- **COMPLETE_SYSTEM_GUIDE.md** - Full overview
- **PROJECT_SUMMARY.md** - What's included
- **README.md** - API documentation
- **web/README.md** - Frontend info

---

## ✨ The Main Feature

When a borrower gets money (≥ Ksh 100):
1. Transaction detected
2. System finds active loans
3. **Automatically deducts repayment** ← This is the magic!
4. Updates balance
5. Sends notifications

---

## 🎉 You're Ready!

Everything is set up and working. Just:
1. Start backend (npm run dev)
2. Start frontend (npm start)
3. Login and explore

That's it! The system is ready to use.

---

## 💡 Pro Tips

- Use "Quick Add" buttons on Wallet page for fast testing
- Create multiple loans to see auto-repayment work on both
- Check Repayments page to see detailed history
- Try different transaction amounts to see repayment logic
- Switch between accounts (John/Jane) to see both perspectives

---

**Happy testing! 🚀**
