import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient, User } from './api';

interface AuthContextType {
  user: User | null;
  login: (email: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      apiClient.setToken(token);
      apiClient.getTodayOrders().then(() => {
        setUser({ id: 1, name: 'Admin', email: 'admin@example.com', seat_id: undefined, created_at: new Date().toISOString() });
        setIsLoading(false);
      }).catch((error) => {
        console.error('Token validation failed:', error);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        apiClient.clearToken();
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string) => {
    try {
      const response = await apiClient.login(email);
      apiClient.setToken(response.access_token);
      setUser(response.user);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = () => {
    apiClient.clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
