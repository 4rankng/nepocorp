import React, { createContext, useContext, useState, useCallback } from 'react';
import { ROLES } from '../shared/config/roles';

// Mock user data - in a real app, this would come from your authentication service
const MOCK_USERS = {
  [ROLES.QUAN_LY]: { id: 1, name: 'Nguyễn Văn Phú', role: ROLES.QUAN_LY },
  [ROLES.KE_TOAN]: { id: 2, name: 'Tạ Thị Linh', role: ROLES.KE_TOAN },
  [ROLES.GIAO_NHAN]: { id: 3, name: 'Lưu Đức Cường', role: ROLES.GIAO_NHAN },
  [ROLES.LAI_XE]: { id: 4, name: 'Ngô Tử Đức', role: ROLES.LAI_XE },
};

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Login function - in a real app, this would call your auth API
  const login = useCallback((role) => {
    const user = MOCK_USERS[role];
    if (user) {
      setCurrentUser(user);
      setIsAuthenticated(true);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setIsAuthenticated(false);
  }, []);

  // Check if current user has a specific role
  const hasRole = useCallback((role) => {
    return currentUser?.role === role;
  }, [currentUser]);

  // Check if current user has any of the specified roles
  const hasAnyRole = useCallback((roles = []) => {
    return roles.includes(currentUser?.role);
  }, [currentUser]);

  const value = {
    currentUser,
    isAuthenticated,
    login,
    logout,
    hasRole,
    hasAnyRole,
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
