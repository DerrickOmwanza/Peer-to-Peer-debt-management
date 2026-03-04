import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { userAPI, loanAPI, notificationAPI } from '../services/api';
import Navbar from '../components/Navbar';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loans, setLoans] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [profileRes, loansRes, notifsRes] = await Promise.all([
        userAPI.getProfile(),
        loanAPI.getBorrowerLoans(),
        notificationAPI.getNotifications(),
      ]);
      setProfile(profileRes.data);
      setLoans(loansRes.data);
      setNotifications(notifsRes.data.slice(0, 5)); // Last 5
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <>
      <Navbar />
      <div className="dashboard">
        <h1>Dashboard</h1>

        {/* Profile Section */}
        <div className="card">
          <h2>Profile</h2>
          {profile && (
            <div className="profile-info">
              <p>
                <strong>Name:</strong> {profile.full_name}
              </p>
              <p>
                <strong>Phone:</strong> {profile.phone_number}
              </p>
              <p>
                <strong>Email:</strong> {profile.email}
              </p>
              <p className="wallet-balance">
                <strong>Wallet Balance:</strong> Ksh{' '}
                {parseFloat(profile.wallet_balance).toFixed(2)}
              </p>
            </div>
          )}
        </div>

        {/* Loans Section */}
        <div className="card">
          <h2>Your Loans</h2>
          {loans.length > 0 ? (
            <div className="loans-list">
              {loans.map((loan) => (
                <div key={loan.id} className="loan-item">
                  <div className="loan-header">
                    <h3>
                      {loan.lender_name} ({loan.lender_phone})
                    </h3>
                    <span className={`status ${loan.status}`}>{loan.status}</span>
                  </div>
                  <p>
                    <strong>Amount:</strong> Ksh {loan.principal_amount}
                  </p>
                  <p>
                    <strong>Balance:</strong> Ksh {loan.remaining_balance}
                  </p>
                  <p>
                    <strong>Repayment:</strong> Ksh {loan.repayment_amount} (
                    {loan.repayment_method})
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p>No loans yet</p>
          )}
        </div>

        {/* Notifications Section */}
        <div className="card">
          <h2>Recent Notifications</h2>
          {notifications.length > 0 ? (
            <div className="notifications-list">
              {notifications.map((notif) => (
                <div key={notif.id} className="notification-item">
                  <span className={`notif-type ${notif.notification_type}`}>
                    {notif.notification_type}
                  </span>
                  <p>{notif.message}</p>
                </div>
              ))}
            </div>
          ) : (
            <p>No notifications</p>
          )}
        </div>
      </div>
    </>
  );
}
