import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const getToken = () => sessionStorage.getItem('token') || localStorage.getItem('token');

  useEffect(() => {
    const checkUser = async () => {
      const token = getToken();
      if (token) {
        try {
          // Move old localStorage token to per-tab storage.
          sessionStorage.setItem('token', token);
          localStorage.removeItem('token');
          const res = await api.get('/auth/me');
          setUser(res.data);
        } catch (err) {
          console.error('Failed to authenticate token', err);
          sessionStorage.removeItem('token');
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    checkUser();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    sessionStorage.setItem('token', res.data.token);
    localStorage.removeItem('token');
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (name, email, password, role) => {
    await api.post('/auth/register', { name, email, password, role });
    // Auto-login after register
    return login(email, password);
  };

  const logout = () => {
    sessionStorage.removeItem('token');
    localStorage.removeItem('token');
    setUser(null);
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
