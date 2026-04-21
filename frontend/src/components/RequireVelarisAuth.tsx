import { ReactNode } from 'react';
import { SignedIn, SignedOut, SignIn, useUser } from '@clerk/clerk-react';
import { ShieldAlert } from 'lucide-react';

const ALLOWED_DOMAIN = '@velaris.io';

interface RequireVelarisAuthProps {
  children: ReactNode;
}

export default function RequireVelarisAuth({ children }: RequireVelarisAuthProps) {
  return (
    <>
      <SignedOut>
        <div className="min-h-[70vh] flex items-center justify-center px-4">
          <div className="w-full max-w-md">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-white">Sign in to continue</h2>
              <p className="text-sm text-gray-400 mt-1">
                Access is restricted to <span className="text-blue-400">@velaris.io</span> accounts.
              </p>
            </div>
            <SignIn routing="hash" />
          </div>
        </div>
      </SignedOut>
      <SignedIn>
        <DomainGate>{children}</DomainGate>
      </SignedIn>
    </>
  );
}

function DomainGate({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-gray-500 text-sm">
        Loading…
      </div>
    );
  }

  const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase() ?? '';
  const allowed = email.endsWith(ALLOWED_DOMAIN);

  if (!allowed) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-md text-center bg-red-500/10 border border-red-500/30 rounded-lg p-6">
          <div className="flex justify-center mb-3">
            <ShieldAlert size={32} className="text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">Access denied</h2>
          <p className="text-sm text-gray-300 mt-2">
            This area is restricted to <span className="text-blue-400">@velaris.io</span> accounts.
            You're signed in as <span className="text-gray-100">{email || 'unknown'}</span>.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
