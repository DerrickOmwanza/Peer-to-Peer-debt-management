# M-PESA Debt Allocation System - Complete Guide

## 🎉 System Status: PRODUCTION READY

Your complete peer-to-peer debt management system is now **fully operational** with:
- ✅ Backend API (Node.js/Express)
- ✅ Frontend Application (React)
- ✅ PostgreSQL Database
- ✅ Automatic Repayment Triggering
- ✅ Real-time Notifications

---

## 📋 Project Structure

```
Peer-Peer M-Pesa debt management/
├── server.js                 # Backend entry point
├── package.json             # Backend dependencies
├── .env                     # Backend configuration
├── src/                     # Backend code
│   ├── config/             # Database & configuration
│   ├── routes/             # API endpoints
│   ├── middleware/         # Authentication
│   └── services/           # Business logic
├── scripts/                # Database setup scripts
└── web/                    # React Frontend
    ├── package.json        # Frontend dependencies
    ├── public/
    └── src/
        ├── components/     # Reusable components
        ├── pages/          # Page components
        ├── context/        # State management
        ├── services/       # API client
        └── App.js          # Main app
```

---

## 🚀 Running the System

### Terminal 1: Backend Server
```bash
cd "c:/Users/ADMIN/Desktop/XAMPP 2025/htdocs/Peer-Peer M-Pesa debt management"
npm run dev
```
**Runs on:** http://localhost:5000

### Terminal 2: Frontend Application
```bash
cd "c:/Users/ADMIN/Desktop/XAMPP 2025/htdocs/Peer-Peer M-Pesa debt management/web"
npm start
```
**Runs on:** http://localhost:3001

### Database
- PostgreSQL running on port 5433
- Database: `mpesa_debt`
- User: `postgres`

---

## 👤 Test Accounts

### User 1 (Borrower)
```
Phone: +254701234567
Email: john@example.com
Password: password123
Wallet: Ksh 5000
```

### User 2 (Lender)
```
Phone: +254702345678
Email: jane@example.com
Password: password123
Wallet: Ksh 10000
```

---

## 🎯 Complete User Flow

### 1. **Login**
- Navigate to http://localhost:3001
- Enter email and password
- Get JWT token automatically

### 2. **View Dashboard**
- See profile information
- View active loans
- Check recent notifications

### 3. **Add Funds to Wallet**
- Go to Wallet page
- Click "Quick Add" or enter amount
- Funds added to wallet balance

### 4. **Request a Loan**
- Click "Request Loan"
- Enter lender's phone number
- Set amount, repayment method, and start date
- Submit request
- Lender receives notification

### 5. **Approve Loan (As Lender)**
- Login as Jane (lender)
- View loan requests
- Approve or decline
- Funds made available to borrower

### 6. **Simulate Incoming Transaction**
- Go to Transactions page
- Enter amount (≥ Ksh 100 triggers repayment)
- Click "Simulate Transaction"
- **Automatic repayment deduction happens here!**

### 7. **View Repayments**
- Check Repayments page
- See all deducted amounts
- View remaining balance

### 8. **Track Progress**
- View My Loans
- See progress bar showing paid percentage
- Monitor loan status (active/completed)

---

## 🔧 Key Features

### Automatic Repayment Engine
- ✅ Monitors incoming transactions
- ✅ Deducts repayment automatically
- ✅ Updates loan balance instantly
- ✅ Sends notifications to both parties

### Loan Management
- ✅ Create loan requests
- ✅ Approve/decline loans
- ✅ Track multiple loans
- ✅ View borrower and lender perspectives

### Transaction Tracking
- ✅ View transaction history
- ✅ Simulate M-PESA payments
- ✅ Automatic balance updates
- ✅ Transaction logging

### Wallet Management
- ✅ Real-time balance display
- ✅ Quick fund additions
- ✅ Add funds for testing
- ✅ Track balance changes

### Notification System
- ✅ Loan requests
- ✅ Loan approvals
- ✅ Repayment confirmations
- ✅ Balance updates

---

## 📊 Backend API Endpoints

### Authentication
```
POST   /api/auth/register
POST   /api/auth/login
```

### Users
```
GET    /api/users/profile
POST   /api/users/wallet/add-funds
```

### Loans
```
POST   /api/loans/request
PATCH  /api/loans/:loanId/approval
GET    /api/loans/borrower
GET    /api/loans/lender
```

### Transactions
```
POST   /api/transactions/incoming
GET    /api/transactions
```

### Repayments
```
GET    /api/repayments/loan/:loanId
GET    /api/repayments/borrower/all
GET    /api/repayments/lender/all
```

### Notifications
```
GET    /api/notifications
PATCH  /api/notifications/:notificationId/read
GET    /api/notifications/unread/count
```

---

## 🔐 Database Schema

### Users Table
- ID, Phone, Name, Email, Password Hash, Wallet Balance, Status, Timestamps

### Loans Table
- ID, Borrower ID, Lender ID, Principal Amount, Remaining Balance, Repayment Method, Repayment Amount, Start Date, Frequency, Status, Timestamps

### Transactions Table
- ID, User ID, Amount, Type (incoming/outgoing), Description, Source Phone, Timestamp

### Repayments Table
- ID, Loan ID, Amount Deducted, Remaining Balance, Transaction ID, Status, Timestamp

### Notifications Table
- ID, User ID, Loan ID, Repayment ID, Type, Message, Status, Delivery Method, Timestamp

---

## 🧪 Testing the System

### Test Scenario 1: Basic Loan Flow
1. Login as John (borrower)
2. Add Ksh 5000 to wallet
3. Request loan from Jane
4. Login as Jane
5. Approve loan
6. Login back as John
7. Check loan status (should be active)

### Test Scenario 2: Automatic Repayment
1. Login as John
2. Go to Transactions
3. Simulate incoming transaction (Ksh 1000)
4. **Automatic deduction of Ksh 500 happens**
5. Check Repayments - see the deducted amount
6. View My Loans - see updated balance

### Test Scenario 3: Multiple Loans
1. Create another loan request
2. Simulate another transaction
3. System auto-deducts from both loans
4. Check repayment history

---

## 🔄 How Automatic Repayment Works

1. **Incoming Transaction Detected**
   - Amount ≥ Ksh 100 triggers repayment check

2. **Loan Selection**
   - System finds all active loans for user
   - Processes loans in order (oldest first)

3. **Repayment Calculation**
   - Fixed method: Deduct exact amount (e.g., Ksh 500)
   - Percentage method: Calculate % of transaction (e.g., 10%)

4. **Balance Update**
   - Loan balance reduced
   - Loan marked as 'completed' if balance = 0

5. **Notifications Sent**
   - Borrower: "Ksh 500 deducted. Balance: Ksh 4500"
   - Lender: "Ksh 500 received. Balance: Ksh 4500"

6. **Records Created**
   - Repayment recorded in database
   - Transaction linked to repayment

---

## 🚀 Deployment Ready

### To Deploy to Production:

1. **Update .env**
   ```
   NODE_ENV=production
   DATABASE_URL=your_production_db
   JWT_SECRET=your_secret_key
   API_URL=https://yourdomain.com
   ```

2. **Build Frontend**
   ```bash
   cd web
   npm run build
   ```

3. **Deploy**
   - Backend: Heroku, AWS, DigitalOcean, Railway
   - Frontend: Vercel, Netlify, GitHub Pages
   - Database: Cloud PostgreSQL (AWS RDS, Railway, etc.)

---

## 📈 Monitoring & Performance

- Backend logs all API requests
- Database query logging
- Error tracking and alerts
- Performance metrics available

---

## 🔒 Security Features

- ✅ JWT Token Authentication
- ✅ Password Hashing (bcrypt)
- ✅ SQL Injection Prevention (Parameterized Queries)
- ✅ CORS Enabled
- ✅ Input Validation
- ✅ Protected Routes
- ✅ Environment Variables for Secrets

---

## 📱 Frontend Features

- Modern React UI
- Real-time data updates
- Responsive design (mobile-friendly)
- Error handling and validation
- Loading states
- Success/error notifications
- Clean navigation
- Professional styling

---

## 🎓 Technology Stack

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL
- **Authentication:** JWT
- **Encryption:** bcryptjs

### Frontend
- **Framework:** React 18
- **Routing:** React Router v6
- **HTTP Client:** Axios
- **State Management:** React Context API
- **Styling:** CSS3

### Infrastructure
- **Development:** localhost (ports 5000, 3001)
- **Database:** PostgreSQL 16
- **Package Manager:** npm

---

## 🆘 Troubleshooting

### Backend won't start
```bash
# Check if port 5000 is in use
netstat -ano | findstr :5000

# Kill process
taskkill /PID <PID> /F

# Or change PORT in .env
```

### Database connection error
```bash
# Verify PostgreSQL is running
# Check credentials in .env
# Create database: createdb -U postgres mpesa_debt
```

### Frontend won't start
```bash
# Clear node_modules and reinstall
cd web
rm -rf node_modules package-lock.json
npm install

# Change port if 3001 is in use
# Check .env file in web folder
```

---

## 📚 Documentation Files

- **README.md** - API documentation
- **INSTALL_POSTGRES.md** - PostgreSQL installation
- **GETTING_STARTED.md** - Setup checklist
- **web/README.md** - Frontend setup
- **web/FRONTEND_COMPLETE.md** - Frontend features

---

## 🎉 You're All Set!

Your M-PESA Debt Allocation system is ready for:
- ✅ Testing
- ✅ Demonstration
- ✅ Enhancement
- ✅ Deployment

---

## 📧 Support & Questions

Refer to the specific documentation files for:
- Backend setup issues → DB_SETUP_INSTRUCTIONS.md
- PostgreSQL problems → INSTALL_POSTGRES.md
- Frontend development → web/README.md
- API usage → README.md

**Happy coding! 🚀**
