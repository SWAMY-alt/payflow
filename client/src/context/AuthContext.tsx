import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';
import type { User, Business, BusinessSetupInput } from '../../../shared/types';

interface AuthContextType {
  user: User | null;
  business: Business | null;
  hasBusiness: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  setupBusiness: (data: BusinessSetupInput) => Promise<void>;
  updateBusiness: (data: BusinessSetupInput) => Promise<void>;
  seedDemoAccount: () => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkAuth = async () => {
    try {
      setIsLoading(true);
      const res = await api.auth.me();
      setUser(res.user);
      setBusiness(res.business);
    } catch {
      setUser(null);
      setBusiness(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.auth.login({ email, password });
    setUser(res.user);
    setBusiness(res.business);
  };

  const register = async (email: string, password: string, fullName: string) => {
    const res = await api.auth.register({ email, password, fullName });
    setUser(res.user);
    setBusiness(null);
  };

  const setupBusiness = async (data: BusinessSetupInput) => {
    const newBiz = await api.business.setup(data);
    setBusiness(newBiz);
  };

  const updateBusiness = async (data: BusinessSetupInput) => {
    const updated = await api.business.updateSettings(data);
    setBusiness(updated);
  };

  const seedDemoAccount = async () => {
    setIsLoading(true);
    try {
      const res = await api.demo.seed();
      setUser(res.user);
      setBusiness(res.business);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } finally {
      setUser(null);
      setBusiness(null);
    }
  };

  const refresh = async () => {
    await checkAuth();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        business,
        hasBusiness: !!business,
        isLoading,
        login,
        register,
        setupBusiness,
        updateBusiness,
        seedDemoAccount,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
