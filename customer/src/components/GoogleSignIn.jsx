import { GoogleLogin } from '@react-oauth/google';

const getClientId = () => (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();

export default function GoogleSignIn({ onSuccess, onError }) {
  const clientId = getClientId();

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
    <div className="flex flex-col items-center w-full gap-2">
      <GoogleLogin
        onSuccess={onSuccess}
        onError={onError}
        useOneTap={false}
        theme="filled_blue"
        size="large"
        text="continue_with"
        shape="rectangular"
        width="320"
      />
    </div>
  );
}
