import React, { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import Login from './auth/Login';
import AccessDenied from './auth/AccessDenied';
import Dashboard from './dashboard/Dashboard';
import Header from './ui/Header';
import { IS_DEV } from '../constants';
import { getCSRF } from '../services/api';

interface DevIndicatorProps {
  apiHost: string;
}

const DevIndicator: React.FC<DevIndicatorProps> = ({ apiHost }) => {
  if (!IS_DEV) return null;
  
  return (
    <div className="dev-indicator">
      Dev Mode (API: {apiHost})
    </div>
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated, isVerified, loading } = useAuth();
  
  useEffect(() => {
    getCSRF().catch(err => {
      console.error('Failed to initialize CSRF token:', err);
    });
  }, []);

  const apiHost = window.location.hostname === 'localhost' ? 'localhost' : 'api.swecc.org';

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
      <DevIndicator apiHost={apiHost} />
      
      <main>
        {!isAuthenticated && <Login />}
        {isAuthenticated && !isVerified && <AccessDenied />}
        {isAuthenticated && isVerified && <Dashboard />}
      </main>
    </div>
  );
};

export default AppContent;