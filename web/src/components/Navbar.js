import React, { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [openDropdown, setOpenDropdown] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleDropdown = (dropdown) => {
    setOpenDropdown(openDropdown === dropdown ? null : dropdown);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    setOpenDropdown(null);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
    setOpenDropdown(null);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo-container" onClick={closeMenu}>
          <img src="/logo.png" alt="P2P Debt Management" className="navbar-logo-img" />
          <span className="navbar-logo-text">M-PESA Debt</span>
        </Link>
        
        <button className="menu-toggle" onClick={toggleMenu} aria-label="Toggle menu">
          <span className={`hamburger ${isMenuOpen ? 'open' : ''}`}></span>
        </button>

        <ul className={`nav-menu ${isMenuOpen ? 'active' : ''}`}>
          <li>
            <Link to="/dashboard" onClick={closeMenu}>Dashboard</Link>
          </li>

          {/* Loans Dropdown */}
          <li className="nav-dropdown">
            <button 
              className="dropdown-toggle"
              onClick={() => toggleDropdown('loans')}
            >
              Loans
              <span className={`dropdown-arrow ${openDropdown === 'loans' ? 'open' : ''}`}>▼</span>
            </button>
            {openDropdown === 'loans' && (
              <ul className="dropdown-menu">
                <li><Link to="/loans" onClick={closeMenu}>My Loans</Link></li>
                <li><Link to="/request-loan" onClick={closeMenu}>Request Loan</Link></li>
              </ul>
            )}
          </li>

          {/* Finance Dropdown */}
          <li className="nav-dropdown">
            <button 
              className="dropdown-toggle"
              onClick={() => toggleDropdown('finance')}
            >
              Finance
              <span className={`dropdown-arrow ${openDropdown === 'finance' ? 'open' : ''}`}>▼</span>
            </button>
            {openDropdown === 'finance' && (
              <ul className="dropdown-menu">
                <li><Link to="/wallet" onClick={closeMenu}>Wallet</Link></li>
                <li><Link to="/transactions" onClick={closeMenu}>Transactions</Link></li>
                <li><Link to="/repayments" onClick={closeMenu}>Repayments</Link></li>
              </ul>
            )}
          </li>

          {/* Risk & Disputes Dropdown */}
          <li className="nav-dropdown">
            <button 
              className="dropdown-toggle"
              onClick={() => toggleDropdown('risk')}
            >
              Assessment
              <span className={`dropdown-arrow ${openDropdown === 'risk' ? 'open' : ''}`}>▼</span>
            </button>
            {openDropdown === 'risk' && (
              <ul className="dropdown-menu">
                <li><Link to="/risk-score" onClick={closeMenu}>Risk Score</Link></li>
                <li><Link to="/disputes" onClick={closeMenu}>Disputes</Link></li>
              </ul>
            )}
          </li>

          <li className="mobile-user-info">
            {user && <span className="user-name">{user.full_name}</span>}
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </li>
        </ul>

        <div className="nav-user desktop-only">
          {user && <span className="user-name">{user.full_name}</span>}
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
