
import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthUser {
  user_id: number;
  tenant_id: number | null;
  role: 'super_admin' | 'admin' | 'profissional' | 'secretario';
  name?: string;
  email?: string;
}

interface AuthContextType {
  token: string | null;
  user: AuthUser | null;
  login: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('psi_token'));
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser(payload);
      } catch (e) {
        logout();
      }
    }
  }, [token]);

  const login = (newToken: string) => {
    localStorage.setItem('psi_token', newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('psi_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      token, 
      user, 
      login, 
      logout, 
      isAuthenticated: !!token,
      isSuperAdmin: user?.role === 'super_admin',
      isAdmin: user?.role === 'admin'
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
