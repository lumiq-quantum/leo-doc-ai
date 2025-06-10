
"use client";

import type { User } from '@/types';
import { useRouter } from 'next/navigation';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const HARDCODED_EMAIL = "demouser@lumiq.ai";
const HARDCODED_PASS = "lumiq123";
const AUTH_STORAGE_KEY = "documentiq_auth_user";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to load user from localStorage", error);
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, pass: string): Promise<boolean> => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    if (email === HARDCODED_EMAIL && pass === HARDCODED_PASS) {
      const userData: User = { email };
      setUser(userData);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
      setIsLoading(false);
      router.push('/');
      return true;
    }
    setIsLoading(false);
    return false;
  }, [router]);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    router.push('/login');
  }, [router]);

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
