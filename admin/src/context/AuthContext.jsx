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
          sessionStorage.setItem('token', token);
          localStorage.removeItem('token');
          const res = await api.get('/auth/me');
          if (res.data.role === 'owner' || res.data.role === 'admin') {
            setUser(res.data);
          } else {
            sessionStorage.removeItem('token');
            localStorage.removeItem('token');
          }
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

  const login = async (email, password, requiredRole = null) => {
    const res = await api.post('/auth/login', { email, password });
    const authUser = res.data.user;

    // Strict role validation based on the login portal:
    // If logging into the Owner portal, reject 'admin', 'driver', 'customer'
    if (requiredRole && authUser.role !== requiredRole) {
      const err = new Error('wrong_role');
      err.role = authUser.role;
      throw err;
    }

    if (authUser.role !== 'owner' && authUser.role !== 'admin') {
      const err = new Error('wrong_role');
      err.role = authUser.role;
      throw err;
    }

    sessionStorage.setItem('token', res.data.token);
    localStorage.removeItem('token');
    setUser(authUser);
    return authUser;
  };

  const logout = () => {
    sessionStorage.removeItem('token');
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
