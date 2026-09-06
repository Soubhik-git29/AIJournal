import React, { useState, useEffect } from 'react';
import { JournalEntry } from '../types';
import { Sparkles, Calendar, Loader2 } from 'lucide-react';
import Markdown from 'react-markdown';

interface WeeklyReflectionViewProps {
  entries: JournalEntry[];
}

export function WeeklyReflectionView({ entries }: WeeklyReflectionViewProps) {
  const [reflection, setReflection] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchReflection = async () => {
      setLoading(true);
      setError('');
      try {
        // Filter entries for the last 7 days
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const recentEntries = entries.filter(e => e.createdAt >= sevenDaysAgo);

        if (recentEntries.length === 0) {
          setReflection("You don't have any journal entries from the past 7 days to analyze. Try writing a few thoughts down to get a weekly reflection!");
          setLoading(false);
          return;
        }

        // Format for context
        const entriesContext = recentEntries.map(e => 
          `Date: ${new Date(e.createdAt).toLocaleDateString()}\nPrompt: ${e.prompt}\nResponse: ${e.response}\nMood: ${e.mood || 'N/A'}`
        ).join('\n\n---\n\n');

        const res = await fetch('/api/weekly-reflection', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ entriesContext })
        });

        if (!res.ok) {
          throw new Error('Failed to generate reflection');
        }

        const data = await res.json();
        setReflection(data.reflection);
      } catch (err) {
        console.error('Error in weekly reflection:', err);
        setError('Failed to generate your weekly reflection. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchReflection();
  }, [entries]);

  return (
    <div className="flex-1 bg-white dark:bg-neutral-950 p-8 overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-8 pb-12">
        <div className="flex flex-col gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-6">
          <h2 className="text-3xl font-serif text-neutral-900 dark:text-white flex items-center gap-3">
            <Calendar size={28} className="text-neutral-500 dark:text-neutral-400" /> 
            Weekly Reflection
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400">A high-level synthesis of your thoughts, emotions, and patterns from the last 7 days.</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-500 dark:text-neutral-400 space-y-4">
            <Loader2 size={32} className="animate-spin" />
            <p>Analyzing your week...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100">
            {error}
          </div>
        ) : (
          <div className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-6 text-neutral-900 dark:text-white">
              <Sparkles size={20} className="text-neutral-500 dark:text-neutral-400" />
              <h3 className="text-xl font-medium">Your Weekly Insights</h3>
            </div>
            <div className="markdown-body prose prose-neutral dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-serif">
              <Markdown>{reflection}</Markdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
