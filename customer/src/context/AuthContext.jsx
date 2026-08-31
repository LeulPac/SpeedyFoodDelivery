import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

const applySession = (setUser, data) => {
  if (data.user.role !== 'customer') {
    const err = new Error('wrong_role');
    err.role = data.user.role;
    throw err;
  }
  sessionStorage.setItem('token', data.token);
  localStorage.removeItem('token');
  setUser(data.user);
  return data.user;
};

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
          if (res.data.role === 'customer') {
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

  const loginWithGoogle = async (credentialOrToken) => {
    const payload =
      typeof credentialOrToken === 'string'
        ? { credential: credentialOrToken }
        : credentialOrToken;
    const res = await api.post('/auth/google', payload);
    return applySession(setUser, res.data);
  };

  const loginWithEmail = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    return applySession(setUser, res.data);
  };

  const registerWithEmail = async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password });
    return applySession(setUser, res.data);
  };

  const logout = () => {
    sessionStorage.removeItem('token');
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
