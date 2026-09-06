import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc } from 'firebase/firestore';
import { CounsellorMessage, JournalEntry } from '../types';
import { Send, Loader2, User, Sparkles } from 'lucide-react';
import Markdown from 'react-markdown';

export function CounsellorView({ journalEntries }: { journalEntries: JournalEntry[] }) {
  const [messages, setMessages] = useState<CounsellorMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    
    const messagesRef = collection(db, 'users', user.uid, 'counsellor_chats');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages: CounsellorMessage[] = [];
      snapshot.forEach((doc) => {
        fetchedMessages.push({ id: doc.id, ...doc.data() } as CounsellorMessage);
      });
      setMessages(fetchedMessages);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user || loading) return;

    const userPrompt = input.trim();
    setInput('');
    setLoading(true);

    try {
      // Format chat history for Gemini
      const chatHistory = messages.map(m => `${m.role === 'user' ? 'User' : 'Counsellor'}: ${m.content}`).join('\n\n');
      const promptWithHistory = chatHistory ? `${chatHistory}\n\nUser: ${userPrompt}` : userPrompt;

      // Extract recent journal context (last 5 entries)
      const recentJournals = [...journalEntries].reverse().slice(0, 5).map(e => `[${new Date(e.createdAt).toLocaleDateString()}] Mood: ${e.mood || 'Neutral'}\nEntry: ${e.prompt}\nAI Reflection: ${e.response}`).join('\n\n');

      const res = await fetch('/api/counsellor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: promptWithHistory,
          journalContext: recentJournals
        }),
      });

      if (!res.ok) throw new Error('Failed to fetch response');
      const data = await res.json();
      
      // Play the generated audio if available
      if (data.audio) {
        try {
          // Decode raw 16-bit PCM returned by the Gemini TTS model
          const binaryString = atob(data.audio);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          // Convert to Float32 for Web Audio API
          const float32Data = new Float32Array(bytes.length / 2);
          const dataView = new DataView(bytes.buffer);
          for (let i = 0; i < float32Data.length; i++) {
            float32Data[i] = dataView.getInt16(i * 2, true) / 32768.0; // true for little-endian
          }
          
          // Use 24kHz sample rate as specified in the SKILL.md
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
          const buffer = audioCtx.createBuffer(1, float32Data.length, 24000);
          buffer.copyToChannel(float32Data, 0);
          
          const source = audioCtx.createBufferSource();
          source.buffer = buffer;
          source.connect(audioCtx.destination);
          source.start(0);
        } catch (e) {
          console.error("Failed to play audio", e);
        }
      }
      
      const messagesRef = collection(db, 'users', user.uid, 'counsellor_chats');
      
      // Save User Message
      await addDoc(messagesRef, {
        userId: user.uid,
        role: 'user',
        content: userPrompt,
        createdAt: Date.now(),
      });

      // Save Counsellor Message
      await addDoc(messagesRef, {
        userId: user.uid,
        role: 'counsellor',
        content: data.text,
        createdAt: Date.now() + 1, // ensure order
      });

    } catch (error) {
      console.error("Error generating counsellor response:", error);
      alert("Something went wrong with the counsellor. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-w-0 bg-neutral-50 dark:bg-neutral-900">
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-3xl mx-auto space-y-8 pb-12">
          {messages.length === 0 && (
            <div className="text-center py-20">
              <div className="w-16 h-16 mx-auto bg-neutral-200 text-neutral-600 dark:text-neutral-400 rounded-full flex items-center justify-center mb-6">
                 <Sparkles size={24} />
              </div>
              <h2 className="text-2xl font-serif text-neutral-800 dark:text-neutral-200 mb-2">AI Counsellor</h2>
              <p className="text-neutral-500 dark:text-neutral-400 max-w-lg mx-auto">
                I've reviewed your journal entries and I'm here to offer realistic advice and help you set achievable goals. What would you like to discuss today?
              </p>
            </div>
          )}
          
          {messages.map((msg) => (
            <div key={msg.id} className="space-y-6">
              {msg.role === 'user' ? (
                <div className="flex justify-end">
                  <div className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 p-5 rounded-2xl rounded-tr-sm max-w-[85%] text-[15px] leading-relaxed shadow-sm">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 p-6 rounded-2xl rounded-tl-sm max-w-[90%] shadow-sm text-[15px] leading-relaxed">
                    <div className="markdown-body prose prose-sm max-w-none prose-neutral dark:prose-invert">
                      <Markdown>{msg.content}</Markdown>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start">
               <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 p-6 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-3">
                  <Loader2 size={16} className="animate-spin text-neutral-400 dark:text-neutral-500" />
                  <span className="text-neutral-500 dark:text-neutral-400 text-sm">Thinking...</span>
               </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 p-4 md:p-6">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="relative flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Ask for advice..."
              className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 pr-14 min-h-[60px] max-h-48 resize-y focus:outline-none focus:ring-2 focus:ring-neutral-900/5 transition-shadow text-[15px]"
              rows={1}
            />
            <button 
              type="submit"
              disabled={!input.trim() || loading}
              className="absolute right-2 bottom-2 p-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl hover:bg-neutral-800 disabled:opacity-50 transition-colors flex-shrink-0"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
