import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api.config';

interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  last_login?: string;
  created_at?: string;
  is_admin?: boolean;
  is_reviewer?: boolean;
  is_image_contributor?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isReviewer: boolean;
  isImageContributor: boolean;
  updateProfile: (userData: Partial<User>) => Promise<void>;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Set up axios interceptor to include token in requests
  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid, logout user
          logout();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [token]);

  // Load token from localStorage on app start
  useEffect(() => {
    const loadStoredAuth = async () => {
      const storedToken = localStorage.getItem('authToken');
      const storedUser = localStorage.getItem('authUser');

      if (storedToken && storedUser) {
        try {
          // Verify token is still valid
          const response = await axios.get(`${API_BASE_URL}/auth/verify`, {
            headers: { Authorization: `Bearer ${storedToken}` }
          });

          if (response.data.valid && response.data.user) {
            setToken(storedToken);
            // Use fresh user data from server instead of localStorage
            const freshUser = response.data.user;
            setUser(freshUser);
            // Update localStorage with fresh user data
            localStorage.setItem('authUser', JSON.stringify(freshUser));
          } else {
            // Invalid token, clear storage
            localStorage.removeItem('authToken');
            localStorage.removeItem('authUser');
          }
        } catch (error) {
          // Token verification failed, clear storage
          localStorage.removeItem('authToken');
          localStorage.removeItem('authUser');
        }
      }
      setIsLoading(false);
    };

    loadStoredAuth();
  }, []);

  const login = async (username: string, password: string): Promise<void> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        username,
        password
      });

      const { user: userData, token: userToken } = response.data;
      
      setUser(userData);
      setToken(userToken);
      
      // Store in localStorage
      localStorage.setItem('authToken', userToken);
      localStorage.setItem('authUser', JSON.stringify(userData));
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Login failed';
      throw new Error(errorMessage);
    }
  };

  const register = async (userData: RegisterData): Promise<void> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, userData);

      const { user: newUser, token: userToken } = response.data;
      
      setUser(newUser);
      setToken(userToken);
      
      // Store in localStorage
      localStorage.setItem('authToken', userToken);
      localStorage.setItem('authUser', JSON.stringify(newUser));
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Registration failed';
      throw new Error(errorMessage);
    }
  };

  const logout = (): void => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
  };

  const updateProfile = async (userData: Partial<User>): Promise<void> => {
    try {
      const response = await axios.put(`${API_BASE_URL}/auth/profile`, userData);
      const updatedUser = response.data.user;
      
      setUser(updatedUser);
      localStorage.setItem('authUser', JSON.stringify(updatedUser));
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Profile update failed';
      throw new Error(errorMessage);
    }
  };

  // Check if user is admin (has is_admin flag)
  const isAdmin = !!user && user.is_admin === true;
  
  // Check if user is reviewer (has is_reviewer flag) OR is admin (admins have all privileges)
  const isReviewer = !!user && (user.is_reviewer === true || user.is_admin === true);
  
  // Check if user is image contributor (has is_image_contributor flag) OR is admin
  const isImageContributor = !!user && (user.is_image_contributor === true || user.is_admin === true);

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    isLoading,
    isAuthenticated: !!user,
    isAdmin,
    isReviewer,
    isImageContributor,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};