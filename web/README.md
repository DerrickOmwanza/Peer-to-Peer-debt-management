# M-PESA Debt Allocation Frontend

React-based frontend for the M-PESA Debt Allocation system.

## Features

- User authentication (login/register)
- Dashboard with profile, loans, and notifications
- Request loan functionality
- Real-time loan status tracking
- Responsive design

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm start
```

Server runs on http://localhost:3000

### 3. Build for Production
```bash
npm run build
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Navbar.js
│   ├── ProtectedRoute.js
│   └── ...
├── pages/              # Page components
│   ├── Login.js
│   ├── Register.js
│   ├── Dashboard.js
│   └── ...
├── context/            # React Context (authentication)
│   └── AuthContext.js
├── services/           # API service layer
│   └── api.js
├── App.js              # Main app component
└── index.js            # Entry point
```

## Features Implemented

- ✅ User registration and login
- ✅ JWT token management
- ✅ Protected routes
- ✅ Dashboard with profile info
- ✅ Loan request form
- ✅ Notifications display
- ✅ Automatic API calls
- ✅ Responsive design

## API Integration

Frontend connects to backend at `http://localhost:5000/api`

All requests automatically include JWT token in Authorization header.

## Testing

1. Go to http://localhost:3000
2. Login with:
   - Email: john@example.com
   - Password: password123
3. View dashboard
4. Create a loan request
5. Check notifications

## Next Steps

- [ ] Add "My Loans" page
- [ ] Add "Transactions" page
- [ ] Add "Repayments" history page
- [ ] Add wallet top-up form
- [ ] Add notifications management
- [ ] Add search and filters
- [ ] Mobile app version (React Native)

## Notes

- Make sure backend is running on port 5000
- Frontend uses React Router for navigation
- Axios for API calls
- Context API for state management
