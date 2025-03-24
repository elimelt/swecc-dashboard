import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api, { getCsrfToken, withCsrf, log } from '../services/api';
import { parseDate } from '../utils/utils';

interface User {
  username: string;
  firstName?: string;
  lastName?: string;
  discordUsername?: string;
  resumeUrl?: string;
  discordId?: string;
  profilePictureUrl?: string;
  created?: Date;
  gradDate?: Date;
  groups?: { name: string }[];
  [key: string]: any;
}

interface AuthState {
  isAuthenticated: boolean;
  loading: boolean;
  isAdmin: boolean;
  isVerified: boolean;
  user: User | null;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<boolean>;
  clearError: () => void;
  subscribe: (listener: (state: Omit<AuthState, 'error'> & { member: User | null, error: string | null }) => void) => () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    loading: true,
    isAdmin: false,
    isVerified: false,
    user: null,
    error: null
  });

  // Use useRef instead of useState to avoid re-renders
  const listenersRef = useRef<Array<(state: any) => void>>([]);

  const notifySubscribers = (state: AuthState) => {
    const notifyState = {
      isAuthenticated: state.isAuthenticated,
      loading: state.loading,
      isAdmin: state.isAdmin,
      isVerified: state.isVerified,
      member: state.user,
      error: state.error
    };

    listenersRef.current.forEach(listener => listener(notifyState));
  };

  // Use useCallback to ensure the function reference remains stable
  const subscribe = useCallback((listener: (state: any) => void) => {
    listenersRef.current.push(listener);

    // Immediately notify with current state
    const currentState = {
      isAuthenticated: authState.isAuthenticated,
      loading: authState.loading,
      isAdmin: authState.isAdmin,
      isVerified: authState.isVerified,
      member: authState.user,
      error: authState.error
    };
    listener(currentState);

    // Return unsubscribe function
    return () => {
      listenersRef.current = listenersRef.current.filter(l => l !== listener);
    };
  }, []);

  const deserializeUser = ({
    first_name: firstName,
    last_name: lastName,
    grad_date: gradDate,
    discord_username: discordUsername,
    resume_url: resumeUrl,
    discord_id: discordId,
    profile_picture_url: profilePictureUrl,
    created,
    ...rest
  }: any): User => {
    return {
      ...rest,
      firstName,
      lastName,
      discordUsername,
      resumeUrl,
      discordId,
      profilePictureUrl,
      created: created ? parseDate(created) : undefined,
      gradDate: gradDate ? parseDate(gradDate) : undefined
    };
  };

  const fetchUserData = async (): Promise<void> => {
    if (authState.isAuthenticated) {
      try {
        const response = await withCsrf(() => api.get('/members/profile/'));

        if (response.status === 200) {
          const userData = deserializeUser(response.data);
          
          const groups = userData.groups?.map(group => group.name) || [];
          const newState = {
            ...authState,
            user: userData,
            isAdmin: groups.includes('is_admin'),
            isVerified: groups.includes('is_verified'),
            loading: false
          };

          setAuthState(newState);
          notifySubscribers(newState);
        }
      } catch (error) {
        log('Failed to get user data:', error);
        const newState = {
          ...authState,
          user: null,
          loading: false
        };
        setAuthState(newState);
        notifySubscribers(newState);
      }
    } else {
      const newState = {
        ...authState,
        user: null,
        loading: false
      };
      setAuthState(newState);
      notifySubscribers(newState);
    }
  };

  const checkSession = async (): Promise<void> => {
    try {
      await api.get('/auth/session/');
      const newState = {
        ...authState,
        isAuthenticated: true
      };
      setAuthState(newState);
      notifySubscribers(newState);
      await fetchUserData();
    } catch (error) {
      log('Session check failed:', error);
      const newState = {
        ...authState,
        isAuthenticated: false,
        loading: false
      };
      setAuthState(newState);
      notifySubscribers(newState);
    }
  };

  const initialize = async (): Promise<void> => {
    try {
      await getCsrfToken();

      try {
        await checkSession();
      } catch (error) {
        log('Session check failed, continuing in unauthenticated state:', error);
        const newState = {
          ...authState,
          isAuthenticated: false,
          loading: false
        };
        setAuthState(newState);
        notifySubscribers(newState);
      }
    } catch (error) {
      log('Failed to initialize auth:', error);
      const newState = {
        ...authState,
        isAuthenticated: false,
        loading: false
      };
      setAuthState(newState);
      notifySubscribers(newState);
    }
  };

  const handleLoginError = (errorData: any): void => {
    let newState;
    if (
      errorData?.detail ===
      'Your account does not have a Discord ID associated with it.'
    ) {
      newState = {
        ...authState,
        error: `Your discord is not verified. Please type /verify in the server and enter ${errorData.username}`
      };
    } else {
      newState = {
        ...authState,
        error: 'Invalid credentials. Please try again.',
        isAuthenticated: false
      };
    }
    setAuthState(newState);
    notifySubscribers(newState);
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await api.post('/auth/login/', { username, password });

      if (res.status === 200) {
        await getCsrfToken();
        const newState = {
          ...authState,
          isAuthenticated: true,
          error: null
        };
        setAuthState(newState);
        notifySubscribers(newState);
        await fetchUserData();
        return true;
      } else {
        handleLoginError(res.data);
        return false;
      }
    } catch (err: any) {
      handleLoginError(err.response?.data);
      return false;
    }
  };

  const logout = async (): Promise<boolean> => {
    try {
      const res = await api.post('/auth/logout/', {});

      if (res.status === 200) {
        await getCsrfToken();
        const newState = {
          isAuthenticated: false,
          user: null,
          isAdmin: false,
          isVerified: false,
          loading: false,
          error: null
        };
        setAuthState(newState);
        notifySubscribers(newState);
        return true;
      }
      return false;
    } catch (err) {
      log('Logout failed:', err);
      return false;
    }
  };

  const clearError = (): void => {
    const newState = {
      ...authState,
      error: null
    };
    setAuthState(newState);
    notifySubscribers(newState);
  };

  useEffect(() => {
    initialize();
  }, []);

  const value: AuthContextType = {
    ...authState,
    login,
    logout,
    clearError,
    subscribe
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};