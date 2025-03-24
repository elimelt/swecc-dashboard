import React from 'react';

const AccessDenied: React.FC = () => {
  return (
    <div id="access-denied">
      <h2>Access Denied</h2>
      <p>You need to be a verified user to access this dashboard.</p>
    </div>
  );
};

export default AccessDenied;