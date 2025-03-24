import React from 'react';
import { useAuth } from '../../hooks/useAuth';

const Header: React.FC = () => {
  const { isAuthenticated, member, isAdmin, isVerified, logout, loading } = useAuth();

  return (
    <header>
      <h1>SWECC Dashboard</h1>
      <div id="auth-status">
        {loading && <p id="loading-message">Loading...</p>}
        
        {isAuthenticated && member && !loading && (
          <div id="logged-in-view">
            <p>Welcome, <span id="username">{member.username}</span>!</p>
            <div id="user-info">
              {isAdmin && <p id="admin-badge">Admin</p>}
              {isVerified && <p id="verified-badge">Verified</p>}
            </div>
            <button id="logout-btn" onClick={() => logout()}>Logout</button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;