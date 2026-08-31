import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App.jsx';
import './index.css';

const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();

if (!googleClientId) {
  console.warn(
    '[SpeedyDelivery] Missing VITE_GOOGLE_CLIENT_ID in customer/.env — Google sign-in will not work until you restart the dev server.'
  );
}

const app = <App />;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {googleClientId ? (
      <GoogleOAuthProvider clientId={googleClientId}>{app}</GoogleOAuthProvider>
    ) : (
      app
    )}
  </React.StrictMode>
);
