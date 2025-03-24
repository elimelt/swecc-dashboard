import React, { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import Login from './auth/Login';
import AccessDenied from './auth/AccessDenied';
import Dashboard from './dashboard/Dashboard';
import Header from './ui/Header';
import { IS_DEV } from '../constants';
import { getCSRF } from '../services/api';

// Add dev mode indicator if needed
const DevIndicator = () => {
  if (!IS_DEV) return null;
  
  const apiHost = window.location.hostname === 'localhost' ? 'localhost' : 'api.swecc.org';
  
  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      padding: '5px 10px',
      background: '#f0f0f0',
      border: '1px solid #ccc',
      borderRadius: '4px',
      fontSize: '12px',
      zIndex: 1000,
    }}>
      Dev Mode (API: {apiHost})
    </div>
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated, isVerified, loading } = useAuth();
  
  // Initialize CSRF token on component mount
  useEffect(() => {
    getCSRF();
  }, []);

  if (loading) {
    return (
      <div className="container">
        <Header />
        <p id="loading-message">Loading...</p>
      </div>
    );
  }

  return (
    <div className="container">
      <Header />
      <DevIndicator />
      
      <main>
        {!isAuthenticated && <Login />}
        {isAuthenticated && !isVerified && <AccessDenied />}
        {isAuthenticated && isVerified && <Dashboard />}
      </main>
    </div>
  );
};

export default AppContent;