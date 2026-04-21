import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App';
import AuthTokenSync from './components/AuthTokenSync';
import './index.css';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in environment');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      appearance={{
        variables: {
          colorPrimary: '#2563eb',
          colorBackground: '#0f172a',
          colorText: '#f1f5f9',
          colorInputBackground: '#1e293b',
          colorInputText: '#f1f5f9',
        },
        elements: {
          socialButtonsBlockButton: {
            color: '#f1f5f9',
          },
          socialButtonsBlockButtonText: {
            color: '#f1f5f9',
          },
        },
      }}
    >
      <BrowserRouter>
        <AuthTokenSync />
        <App />
      </BrowserRouter>
    </ClerkProvider>
  </React.StrictMode>
);
