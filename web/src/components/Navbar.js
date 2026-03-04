import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          💳 M-PESA Debt
        </Link>
        <ul className="nav-menu">
          <li>
            <Link to="/dashboard">Dashboard</Link>
          </li>
          <li>
            <Link to="/loans">My Loans</Link>
          </li>
          <li>
            <Link to="/request-loan">Request Loan</Link>
          </li>
          <li>
            <Link to="/transactions">Transactions</Link>
          </li>
          <li>
            <Link to="/repayments">Repayments</Link>
          </li>
          <li>
            <Link to="/wallet">Wallet</Link>
          </li>
        </ul>
        <div className="nav-user">
          {user && <span className="user-name">{user.full_name}</span>}
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
