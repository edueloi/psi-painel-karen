
import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

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
  isProfissional: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const decodeToken = (token: string | null): AuthUser | null => {
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("Erro ao decodificar token:", e);
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('psi_token'));
  const [user, setUser] = useState<AuthUser | null>(null);

  // Busca perfil completo do usuário
  const fetchUserProfile = async (decoded: AuthUser) => {
    try {
      const data = await api.get(`/users/${decoded.user_id}`);
      setUser({ ...decoded, name: data.name, email: data.email });
    } catch (e) {
      setUser(decoded); // fallback só com id/role
    }
  };

  useEffect(() => {
    if (token) {
      const decoded = decodeToken(token);
      if (decoded) {
        fetchUserProfile(decoded);
      } else {
        logout();
      }
    } else {
      setUser(null);
    }
    // eslint-disable-next-line
  }, [token]);

  const login = (newToken: string) => {
    localStorage.setItem('psi_token', newToken);
    setToken(newToken);
    const decoded = decodeToken(newToken);
    if (decoded) fetchUserProfile(decoded);
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
      isAdmin: user?.role === 'admin',
      isProfissional: user?.role === 'profissional'
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
