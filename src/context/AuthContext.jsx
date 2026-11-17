import { createContext, useContext, useState, useCallback } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('pm_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (email, password, role) => {
    setLoading(true);
    try {
      const { user: userData, token } = await authService.login(email, password, role);
      localStorage.setItem('pm_user', JSON.stringify(userData));
      localStorage.setItem('pm_token', token);
      setUser(userData);
      return userData;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    localStorage.removeItem('pm_user');
    localStorage.removeItem('pm_token');
    setUser(null);
  }, []);

  const switchRole = useCallback(async (role) => {
    return login('', '', role);
  }, [login]);

  return (
    <AuthContext.Provider value={{ user, login, logout, switchRole, loading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export default AuthContext;
