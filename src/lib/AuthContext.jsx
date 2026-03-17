import React, { createContext, useState, useContext, useEffect } from 'react';
import { localClient } from '@/api/localClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings] = useState({});

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      return;
    }
    try {
      const currentUser = await localClient.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthError(null);
    } catch {
      localStorage.removeItem('auth_token');
      setIsAuthenticated(false);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
    setIsAuthenticated(false);
    window.location.href = '/select';
  };

  const navigateToLogin = () => {
    window.location.href = '/select';
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
