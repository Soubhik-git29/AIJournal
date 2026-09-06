import React, { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Check, Settings, Palette, Moon, Sun } from 'lucide-react';
import { UserProfile } from '../types';

export function SettingsView() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) return;
    
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, 'users', currentUser.uid);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          setProfile(snapshot.data() as UserProfile);
        }
      } catch (error) {
        console.error('Error fetching profile', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [currentUser]);

  const updateChatTheme = async (theme: 'neutral' | 'blue' | 'rose' | 'emerald' | 'violet') => {
    if (!currentUser) return;
    try {
      setProfile(prev => prev ? { ...prev, chatTheme: theme } : null);
      await updateDoc(doc(db, 'users', currentUser.uid), { chatTheme: theme });
    } catch (error) {
      console.error('Error updating chat theme', error);
    }
  };

  const updateAppTheme = async (theme: 'light' | 'dark') => {
    if (!currentUser) return;
    try {
      setProfile(prev => prev ? { ...prev, theme } : null);
      await updateDoc(doc(db, 'users', currentUser.uid), { theme });
      
      // Also apply it locally immediately for responsive feedback
      localStorage.setItem('theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (error) {
      console.error('Error updating app theme', error);
    }
  };

  const currentChatTheme = profile?.chatTheme || 'neutral';
  const currentAppTheme = profile?.theme || 'light';

  const themes = [
    { id: 'neutral', name: 'Classic Dark (Neutral)', color: 'bg-neutral-900', bubble: 'bg-neutral-900' },
    { id: 'blue', name: 'Ocean Blue', color: 'bg-blue-600', bubble: 'bg-blue-600' },
    { id: 'rose', name: 'Rose Petal', color: 'bg-rose-500', bubble: 'bg-rose-500' },
    { id: 'emerald', name: 'Emerald Green', color: 'bg-emerald-600', bubble: 'bg-emerald-600' },
    { id: 'violet', name: 'Deep Violet', color: 'bg-violet-600', bubble: 'bg-violet-600' },
  ] as const;

  if (loading) {
    return (
      <div className="flex-1 bg-white p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white dark:bg-neutral-950 p-8 overflow-y-auto">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h2 className="text-2xl font-serif mb-6 flex items-center gap-2 dark:text-white">
            <Settings size={24} /> Settings
          </h2>
          
          <div className="bg-neutral-50 dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-100 dark:border-neutral-800 mb-8">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2 dark:text-white">
              <Sun size={20} className="text-neutral-500" /> App Theme
            </h3>
            <p className="text-sm text-neutral-500 mb-6">Switch between Light and Dark mode for the entire application.</p>
            
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => updateAppTheme('light')}
                className={`flex flex-col items-center justify-center p-6 rounded-xl border transition-all ${
                  currentAppTheme === 'light' 
                    ? 'border-neutral-900 dark:border-white bg-white dark:bg-neutral-800 shadow-sm' 
                    : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                }`}
              >
                <Sun size={28} className={currentAppTheme === 'light' ? 'text-neutral-900 dark:text-white' : 'text-neutral-500'} />
                <span className={`mt-3 font-medium ${currentAppTheme === 'light' ? 'text-neutral-900 dark:text-white' : 'text-neutral-500'}`}>Light Mode</span>
              </button>
              <button
                onClick={() => updateAppTheme('dark')}
                className={`flex flex-col items-center justify-center p-6 rounded-xl border transition-all ${
                  currentAppTheme === 'dark' 
                    ? 'border-neutral-900 dark:border-white bg-white dark:bg-neutral-800 shadow-sm' 
                    : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                }`}
              >
                <Moon size={28} className={currentAppTheme === 'dark' ? 'text-neutral-900 dark:text-white' : 'text-neutral-500'} />
                <span className={`mt-3 font-medium ${currentAppTheme === 'dark' ? 'text-neutral-900 dark:text-white' : 'text-neutral-500'}`}>Dark Mode</span>
              </button>
            </div>
          </div>
          
          <div className="bg-neutral-50 dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-100 dark:border-neutral-800">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2 dark:text-white">
              <Palette size={20} className="text-neutral-500" /> Chat Theme
            </h3>
            <p className="text-sm text-neutral-500 mb-6">Choose the color style for your outgoing chat messages.</p>
            
            <div className="space-y-3">
              {themes.map(theme => (
                <button
                  key={theme.id}
                  onClick={() => updateChatTheme(theme.id)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                    currentChatTheme === theme.id 
                      ? 'border-neutral-900 dark:border-neutral-500 bg-white dark:bg-neutral-800 shadow-sm' 
                      : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 dark:hover:bg-neutral-800/50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full ${theme.color} shadow-inner`}></div>
                    <span className="font-medium text-neutral-900 dark:text-white">{theme.name}</span>
                  </div>
                  {currentChatTheme === theme.id && (
                    <Check size={20} className="text-neutral-900 dark:text-white" />
                  )}
                </button>
              ))}
            </div>
            
            <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-800">
              <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-400 mb-4">Preview</h4>
              <div className="flex flex-col gap-3">
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-3 rounded-2xl rounded-tl-sm max-w-[70%]">
                    <p className="text-sm text-neutral-800 dark:text-neutral-200">Hey, how's it going?</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className={`p-3 rounded-2xl rounded-tr-sm max-w-[70%] text-white ${themes.find(t => t.id === currentChatTheme)?.bubble}`}>
                    <p className="text-sm">Pretty good! Loving this new theme.</p>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
