/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial local theme application
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const unsubscribeDoc = onSnapshot(doc(db, 'users', user.uid), (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        if (data.theme) {
          localStorage.setItem('theme', data.theme);
          if (data.theme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      }
    });
    
    return () => unsubscribeDoc();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-neutral-900 dark:border-white border-t-transparent dark:border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return user ? <Dashboard /> : <Auth />;
}
