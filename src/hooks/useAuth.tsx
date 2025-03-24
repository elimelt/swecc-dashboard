import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import api, { getCSRF } from '../services/api';
import { log } from '../utils/utils';

export interface User {
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
  [key: string]: unknown;
}

interface ApiUser {
  username: string;
  first_name?: string;
  last_name?: string;
  discord_username?: string;
  resume_url?: string;
  discord_id?: string;
  profile_picture_url?: string;
  created?: string;
  grad_date?: string;
  groups?: { name: string }[];
  [key: string]: unknown;
}

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  isAdmin: boolean;
  isVerified: boolean;
  member?: User;
  error?: string;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

interface AuthProviderProps {
  children: ReactNode;
}

interface LoginErrorResponse {
  detail?: string;
  username?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [member, setMember] = useState<User | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    getSession();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      getCurrentUser()
        .then((mem) => {
          setMember(mem);
          const groups = mem.groups?.map((value) => value.name);
          setIsAdmin(groups?.includes('is_admin') ?? false);
          setIsVerified(groups?.includes('is_verified') ?? false);
          setLoading(false);
        })
        .catch((err) => {
          log('Failed to get current user:', err);
          setMember(undefined);
          setLoading(false);
        });
    } else {
      setMember(undefined);
      setLoading(false);
    }
  }, [isAuthenticated]);

  const getCurrentUser = async (): Promise<User> => {
    try {
      const res = await api.get<ApiUser>('/members/profile/');
      if (res.status === 200) {
        return deserializeUser(res.data);
      }
      throw new Error('Failed to get user data');
    } catch (error) {
      log('Failed to get user data:', error);
      throw error;
    }
  };

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
  }: ApiUser): User => {
    return {
      ...rest,
      firstName,
      lastName,
      discordUsername,
      resumeUrl,
      discordId,
      profilePictureUrl,
      created: created ? new Date(created) : undefined,
      gradDate: gradDate ? new Date(gradDate) : undefined
    };
  };

  const getSession = async (): Promise<void> => {
    try {
      await api.get('/auth/session/');
      setIsAuthenticated(true);
    } catch {
      setIsAuthenticated(false);
      setLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<void> => {
    try {
      const res = await api.post('/auth/login/', { username, password });

      if (res.status === 200) {
        await getCSRF();
        setIsAuthenticated(true);
        setError(undefined);
      } else {
        handleLoginError(res.data as LoginErrorResponse);
      }
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err && err.response) {
        const response = err.response as {data?: LoginErrorResponse};
        handleLoginError(response.data || {});
      } else {
        setError('An unknown error occurred. Please try again.');
        setIsAuthenticated(false);
      }
    }
  };

  const handleLoginError = (errorData: LoginErrorResponse) => {
    if (
      errorData?.detail ===
      'Your account does not have a Discord ID associated with it.'
    ) {
      setError(
        `Your discord is not verified. Please type /verify in the server and enter ${errorData.username}`
      );
    } else {
      setError('Invalid credentials. Please try again.');
      setIsAuthenticated(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      const res = await api.post('/auth/logout/');

      if (res.status === 200) {
        log('Logout successful');
        await getCSRF();
        setIsAuthenticated(false);
      } else {
        log('Logout failed');
      }
    } catch (err) {
      log('Logout failed:', err);
    }
  };

  const clearError = (): void => {
    setError(undefined);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        error,
        loading,
        member,
        isAdmin,
        isVerified,
        login,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};