import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authApi } from '@services/api/authApi';

const AuthContext = createContext();

// Helper function to get stored auth data
const getStoredAuthData = () => {
  if (typeof window === 'undefined') return null;
  const storedData = localStorage.getItem('auth');
  return storedData ? JSON.parse(storedData) : null;
};

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => {
    const storedData = getStoredAuthData();
    return storedData?.currentUser || null;
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const storedData = getStoredAuthData();
    return storedData?.isAuthenticated || false;
  });

  // Login function using real API
  const login = useCallback(
    async (username, password) => {
      setLoading(true);
      try {
        const response = await authApi.login(username, password);
        
        if (response.status === 'success' && response.data) {
          const user = response.data.user || {
            username,
            id: response.data.id,
            name: response.data.name || username,
            email: response.data.email,
            role: response.data.role
          };
          
          const authData = {
            currentUser: user,
            isAuthenticated: true,
            timestamp: new Date().toISOString(),
          };
          
          setCurrentUser(user);
          setIsAuthenticated(true);
          localStorage.setItem('auth', JSON.stringify(authData));
          
          // Navigate to default page after login
          navigate('/lich-van-chuyen', { replace: true });
          
          return true;
        }
        return false;
      } catch (error) {
        console.error('Login failed:', error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [navigate]
  );

  // Get user profile on mount if token exists
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('authToken');
      const storedData = getStoredAuthData();
      
      if (token && storedData) {
        try {
          // Verify token by getting profile
          const response = await authApi.getProfile();
          if (response.status === 'success' && response.data) {
            const user = response.data;
            const authData = {
              currentUser: user,
              isAuthenticated: true,
              timestamp: new Date().toISOString(),
            };
            
            setCurrentUser(user);
            setIsAuthenticated(true);
            localStorage.setItem('auth', JSON.stringify(authData));
          }
        } catch (error) {
          // Token is invalid, clear auth
          console.error('Auth check failed:', error);
          logout();
        }
      }
    };
    
    checkAuth();
  }, []);

  // Redirect authenticated users from root
  useEffect(() => {
    if (isAuthenticated && currentUser && location.pathname === '/') {
      navigate('/lich-van-chuyen', { replace: true });
    }
  }, [isAuthenticated, currentUser, location.pathname, navigate]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    setCurrentUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('auth');
    navigate('/', { replace: true });
  }, [navigate]);

  const value = {
    currentUser,
    isAuthenticated,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;