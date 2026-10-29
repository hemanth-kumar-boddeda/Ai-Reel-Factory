import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem('accessToken');
    if (token) {
      // Fetch user data from /auth/me
      api.get('/auth/me')
        .then(response => {
          if (!cancelled) {
            setUser(response.data);
            setLoading(false);
          }
        })
        .catch(err => {
          if (!cancelled) {
            console.error('Failed to fetch user:', err);
            // If fetching user fails, we assume the token is invalid
            localStorage.removeItem('accessToken');
            setUser(null);
            setLoading(false);
          }
        });
    } else {
      if (!cancelled) {
        setLoading(false);
      }
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', new URLSearchParams({
        username: email,
        password
      }).toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      const { access_token } = response.data;
      localStorage.setItem('accessToken', access_token);
      // Fetch user data
      const userResponse = await api.get('/auth/me');
      setUser(userResponse.data);
      setLoading(false);
      return userResponse.data;
    } catch (err) {
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    setUser(null);
    setLoading(false);
  };

  const value = {
    user,
    loading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};