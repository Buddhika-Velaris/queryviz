import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { setAuthTokenGetter } from '../services/api';

export default function AuthTokenSync() {
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    setAuthTokenGetter(isSignedIn ? () => getToken() : null);
  }, [getToken, isSignedIn]);

  return null;
}
