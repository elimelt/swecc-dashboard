import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './hooks/useAuth';
import AppContent from './components/AppContent';
import ThemeToggle from './components/ui/ThemeToggle';
import './styles/index.css';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ThemeToggle />
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;