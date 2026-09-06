import React from 'react';
import { signInWithGoogle } from '../lib/firebase';
import { LogIn } from 'lucide-react';

export function Auth() {
  const [loading, setLoading] = React.useState(false);

  const handleSignIn = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
    } catch (error) {
      console.error('Error signing in:', error);
      alert('Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-neutral-100 dark:border-neutral-800 p-8 text-center space-y-6">
        <div className="mx-auto w-12 h-12 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center rounded-xl">
          <LogIn size={24} />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-serif text-neutral-900 dark:text-white">Reflect</h1>
          <p className="text-neutral-500 dark:text-neutral-400">Your private, AI-powered journal.</p>
        </div>

        <button
          onClick={handleSignIn}
          disabled={loading}
          className="w-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl py-3 px-4 font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? 'Signing in...' : 'Sign in with Google'}
        </button>
      </div>
    </div>
  );
}
