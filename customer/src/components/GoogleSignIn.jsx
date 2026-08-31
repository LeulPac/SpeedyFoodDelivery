import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';

const getClientId = () => (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();

export default function GoogleSignIn({ onSuccess, onError }) {
  const clientId = getClientId();
  const [loading, setLoading] = useState(false);

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setLoading(true);
        await onSuccess(tokenResponse);
      } finally {
        setLoading(false);
      }
    },
    onError: (err) => {
      setLoading(false);
      if (onError) onError(err);
    },
  });

  if (!clientId) {
    return (
      <div className="text-center space-y-3">
        <p className="text-xs text-amber-200/90 py-3 px-3 bg-amber-900/30 rounded border border-amber-700/50">
          Google sign-in is not loaded. Add <code className="text-amber-100">VITE_GOOGLE_CLIENT_ID</code> to{' '}
          <code className="text-amber-100">customer/.env</code>, then <strong className="text-amber-100">stop and restart</strong>{' '}
          <code className="text-amber-100">npm run dev</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full">
      <button
        type="button"
        disabled={loading}
        onClick={() => login()}
        className="w-full max-w-[340px] flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-[#DDD9D0] dark:border-[#303945] bg-[#FFFFFF] dark:bg-[#1B222B] hover:bg-[#EFEBE3] dark:hover:bg-[#151A21] text-[#17191C] dark:text-[#F3F1EA] font-semibold text-sm shadow-sm transition active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>{loading ? 'Connecting…' : 'Continue with Google'}</span>
      </button>
    </div>
  );
}
