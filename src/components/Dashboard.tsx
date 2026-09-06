import React, { useState, useEffect, useRef } from 'react';
import { auth, db, logOut } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { JournalEntry } from '../types';
import { LogOut, Send, Loader2, Book, Clock, Sparkles, Mic, MicOff, Search, Download, Users, MessageSquare, Settings, Calendar, Globe, Lock } from 'lucide-react';
import { format } from 'date-fns';
import Markdown from 'react-markdown';
import { CounsellorView } from './CounsellorView';
import { FriendsView } from './FriendsView';
import { ChatView } from './ChatView';
import { SettingsView } from './SettingsView';
import { WeeklyReflectionView } from './WeeklyReflectionView';

export function Dashboard() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'journal' | 'reflection' | 'counsellor' | 'friends' | 'chat' | 'settings'>('journal');
  const [isRecording, setIsRecording] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  
  const user = auth.currentUser;

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      
      recognition.onstart = () => setIsRecording(true);
      recognition.onend = () => setIsRecording(false);
      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
      };
      
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setInput(prev => {
            const space = prev.length > 0 && !prev.endsWith(' ') ? ' ' : '';
            return prev + space + finalTranscript;
          });
        }
      };
      
      recognitionRef.current = recognition;
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.error("Failed to start recording:", e);
      }
    }
  };

  const prevEntriesLength = useRef(0);

  useEffect(() => {
    if (!user) return;
    
    // Update presence
    const updatePresence = async () => {
      try {
        await setDoc(doc(db, 'users', user.uid), { lastActive: Date.now() }, { merge: true });
      } catch (e) {
        console.error('Error updating presence', e);
      }
    };
    
    updatePresence(); // initial call
    const intervalId = setInterval(updatePresence, 30000); // update every 30s
    
    return () => clearInterval(intervalId);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    
    const entriesRef = collection(db, 'users', user.uid, 'entries');
    const q = query(entriesRef, orderBy('createdAt', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedEntries: JournalEntry[] = [];
      snapshot.forEach((doc) => {
        fetchedEntries.push({ id: doc.id, ...doc.data() } as JournalEntry);
      });
      setEntries(fetchedEntries);
    });

    return () => unsubscribe();
  }, [user]);

  // Update auto-scroll logic to scroll to the first matching entry when searching, 
  // or the newest entry when not searching
  useEffect(() => {
    if (searchQuery && filteredEntries.length > 0) {
      // Find the first matching entry in the view
      const firstMatchId = filteredEntries[0].id;
      const container = document.getElementById('journal-scroll-container');
      const el = document.getElementById(`entry-${firstMatchId}`);
      
      if (container && el) {
        const containerTop = container.getBoundingClientRect().top;
        const elTop = el.getBoundingClientRect().top;
        
        container.scrollTo({
          top: container.scrollTop + (elTop - containerTop) - 40,
          behavior: 'smooth'
        });
      }
    } else if (!searchQuery && bottomRef.current && entries.length > prevEntriesLength.current) {
      // Auto-scroll to newest entry ONLY when not searching and a new entry was added
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    prevEntriesLength.current = entries.length;
  }, [entries, searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user || loading) return;

    const userPrompt = input.trim();
    setInput('');
    setLoading(true);

    try {
      // Create temporary entries for Gemini context
      const historyContext = entries.map(entry => `User: ${entry.prompt}\nGemini: ${entry.response}`).join('\n\n');
      const promptWithHistory = historyContext ? `${historyContext}\n\nUser: ${userPrompt}` : userPrompt;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: promptWithHistory,
          systemInstruction: "You are a thoughtful journaling assistant. The user is writing journal entries or reflections. Provide helpful summaries, empathetic thoughts, or brainstorming ideas based on their input. Keep your tone supportive, calm, and encouraging. If appropriate, gently ask one follow-up question to prompt deeper reflection."
        }),
      });

      if (!res.ok) throw new Error('Failed to fetch response');
      const data = await res.json();
      
      const entriesRef = collection(db, 'users', user.uid, 'entries');
      await addDoc(entriesRef, {
        userId: user.uid,
        prompt: userPrompt,
        response: data.text,
        mood: data.mood || "Neutral",
        createdAt: Date.now(),
        isPublic: isPublic,
      });

    } catch (error) {
      console.error("Error generating reflection:", error);
      alert("Something went wrong saving your reflection. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = entries.filter(entry => {
    const q = searchQuery.toLowerCase();
    return (
      entry.prompt.toLowerCase().includes(q) ||
      entry.response.toLowerCase().includes(q) ||
      (entry.mood && entry.mood.toLowerCase().includes(q)) ||
      format(entry.createdAt, 'MMM d, yyyy h:mm a').toLowerCase().includes(q)
    );
  });

  const exportEntries = () => {
    const dataStr = JSON.stringify(entries, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `journal_export_${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const scrollToEntry = (id: string) => {
    setActiveTab('journal');
    setTimeout(() => {
      const container = document.getElementById('journal-scroll-container');
      const el = document.getElementById(`entry-${id}`);
      
      if (container && el) {
        const containerTop = container.getBoundingClientRect().top;
        const elTop = el.getBoundingClientRect().top;
        
        container.scrollTo({
          top: container.scrollTop + (elTop - containerTop) - 40,
          behavior: 'smooth'
        });
        
        el.classList.add('bg-neutral-100 dark:bg-neutral-800', 'transition-colors', 'duration-500');
        setTimeout(() => el.classList.remove('bg-neutral-100 dark:bg-neutral-800'), 2000);
      } else if (el) {
         // Fallback if container not found
         el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  return (
    <div className="flex h-screen bg-neutral-50 dark:bg-neutral-900 overflow-hidden text-neutral-900 dark:text-white">
      {/* Sidebar - History */}
      <div className="w-80 bg-white dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2 font-serif text-xl">
            <Book size={20} />
            Reflect
          </div>
        </div>

        <div className="p-4 space-y-1 border-b border-neutral-100 dark:border-neutral-800">
          <button 
            onClick={() => setActiveTab('journal')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === 'journal' ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 dark:bg-neutral-900'}`}
          >
            <Book size={16} />
            Journal
          </button>
          <button 
            onClick={() => setActiveTab('reflection')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === 'reflection' ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 dark:bg-neutral-900'}`}
          >
            <Calendar size={16} />
            Reflection
          </button>
          <button 
            onClick={() => setActiveTab('counsellor')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === 'counsellor' ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 dark:bg-neutral-900'}`}
          >
            <Sparkles size={16} />
            AI Counsellor
          </button>
          <button 
            onClick={() => setActiveTab('friends')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === 'friends' ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 dark:bg-neutral-900'}`}
          >
            <Users size={16} />
            Friends
          </button>
          <button 
            onClick={() => setActiveTab('chat')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === 'chat' ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 dark:bg-neutral-900'}`}
          >
            <MessageSquare size={16} />
            Chat
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 dark:bg-neutral-900'}`}
          >
            <Settings size={16} />
            Settings
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Past Entries</h2>
            <button onClick={exportEntries} title="Export entries" className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 dark:text-neutral-400 transition-colors">
              <Download size={16} />
            </button>
          </div>
          
          <div className="relative mb-4">
             <Search className="absolute left-2.5 top-2 text-neutral-400 dark:text-neutral-500" size={14} />
             <input
               type="text"
               placeholder="Search entries..."
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full pl-8 pr-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 border border-transparent rounded-lg text-sm focus:bg-white dark:bg-neutral-950 focus:border-neutral-200 dark:border-neutral-800 focus:ring-2 focus:ring-neutral-900/5 outline-none transition-all"
             />
          </div>

          {filteredEntries.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400 italic">{searchQuery ? 'No matching entries found.' : 'No entries yet. Start writing!'}</p>
          ) : (
            filteredEntries.slice().reverse().map((entry) => (
              <div key={entry.id} onClick={() => scrollToEntry(entry.id)} className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900 hover:bg-neutral-100 dark:bg-neutral-800 transition-colors cursor-pointer border border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center justify-between text-xs text-neutral-400 dark:text-neutral-500 mb-2">
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} />
                    {format(entry.createdAt, 'MMM d, h:mm a')}
                  </div>
                  {entry.mood && (
                    <span className="bg-neutral-200/50 text-neutral-600 dark:text-neutral-400 px-2 py-0.5 rounded-full font-medium">
                      {entry.mood}
                    </span>
                  )}
                </div>
                <p className="text-sm line-clamp-2">{entry.prompt}</p>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-neutral-100 dark:border-neutral-800">
          <button 
            onClick={logOut}
            className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white dark:text-white w-full p-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 dark:bg-neutral-900 transition-colors"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content - Chat/Journal Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 p-4 flex items-center justify-between">
          <div className="font-serif text-lg flex items-center gap-2">
             <Book size={18} /> Reflect
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setActiveTab('journal')}
              className={`p-2 rounded-lg ${activeTab === 'journal' ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400'}`}
            >
              <Book size={18} />
            </button>
            <button 
              onClick={() => setActiveTab('reflection')}
              className={`p-2 rounded-lg ${activeTab === 'reflection' ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400'}`}
            >
              <Calendar size={18} />
            </button>
            <button 
              onClick={() => setActiveTab('counsellor')}
              className={`p-2 rounded-lg ${activeTab === 'counsellor' ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400'}`}
            >
              <Sparkles size={18} />
            </button>
            <button 
              onClick={() => setActiveTab('friends')}
              className={`p-2 rounded-lg ${activeTab === 'friends' ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400'}`}
            >
              <Users size={18} />
            </button>
            <button 
              onClick={() => setActiveTab('chat')}
              className={`p-2 rounded-lg ${activeTab === 'chat' ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400'}`}
            >
              <MessageSquare size={18} />
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`p-2 rounded-lg ${activeTab === 'settings' ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400'}`}
            >
              <Settings size={18} />
            </button>
            <button onClick={logOut} className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white dark:text-white p-2">
               <LogOut size={18} />
            </button>
          </div>
        </header>

        {activeTab === 'settings' ? (
          <SettingsView />
        ) : activeTab === 'reflection' ? (
          <WeeklyReflectionView entries={entries} />
        ) : activeTab === 'friends' ? (
          <FriendsView />
        ) : activeTab === 'chat' ? (
          <ChatView />
        ) : activeTab === 'journal' ? (
          <>
            <div id="journal-scroll-container" className="flex-1 overflow-y-auto p-4 md:p-8">
              <div className="max-w-3xl mx-auto space-y-8 pb-12">
                {filteredEntries.length === 0 ? (
                  <div className="text-center py-20">
                    <h2 className="text-2xl font-serif text-neutral-800 dark:text-neutral-200 mb-2">
                      {searchQuery ? "No matching entries found." : "Welcome to your private journal."}
                    </h2>
                    <p className="text-neutral-500 dark:text-neutral-400">
                      {searchQuery ? "Try searching for a different keyword." : "Write your thoughts, and AI will reflect with you."}
                    </p>
                  </div>
                ) : (
                  filteredEntries.map((entry) => (
                    <div key={entry.id} id={`entry-${entry.id}`} className="space-y-6 rounded-2xl p-2 -mx-2">
                      {/* User Input */}
                      <div className="flex justify-end">
                        <div className="flex flex-col items-end gap-1 max-w-[85%]">
                          <div className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 p-5 rounded-2xl rounded-tr-sm text-[15px] leading-relaxed shadow-sm">
                            {entry.prompt}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-neutral-400">
                            {entry.isPublic ? (
                              <><Globe size={10} /> Public</>
                            ) : (
                              <><Lock size={10} /> Private</>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* AI Response */}
                      <div className="flex justify-start">
                        <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 p-6 rounded-2xl rounded-tl-sm max-w-[90%] shadow-sm text-[15px] leading-relaxed">
                          <div className="markdown-body prose prose-sm max-w-none prose-neutral dark:prose-invert">
                            <Markdown>{entry.response}</Markdown>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                
                {loading && (
                  <div className="flex justify-start">
                     <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 p-6 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-3">
                        <Loader2 size={16} className="animate-spin text-neutral-400 dark:text-neutral-500" />
                        <span className="text-neutral-500 dark:text-neutral-400 text-sm">Reflecting on your thoughts...</span>
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
                    placeholder="What's on your mind today?"
                    className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 pr-24 min-h-[60px] max-h-48 resize-y focus:outline-none focus:ring-2 focus:ring-neutral-900/5 transition-shadow text-[15px]"
                    rows={1}
                  />
                  <div className="absolute right-2 bottom-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setIsPublic(!isPublic)}
                      className={`p-2.5 rounded-xl transition-colors flex-shrink-0 flex items-center gap-2 text-xs font-medium ${isPublic ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'}`}
                      title={isPublic ? "Public Entry (Visible to friends)" : "Private Entry"}
                    >
                      {isPublic ? <Globe size={14} /> : <Lock size={14} />}
                      {isPublic ? <span className="hidden sm:inline">Public</span> : <span className="hidden sm:inline">Private</span>}
                    </button>
                    <button
                      type="button"
                      onClick={toggleRecording}
                      className={`p-2.5 rounded-xl transition-colors flex-shrink-0 ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'}`}
                      title={isRecording ? "Stop recording" : "Start recording"}
                    >
                      {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                    </button>
                    <button 
                      type="submit"
                      disabled={!input.trim() || loading}
                      className="p-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl hover:bg-neutral-800 disabled:opacity-50 transition-colors flex-shrink-0"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </form>
                <p className="text-center mt-3 text-xs text-neutral-400 dark:text-neutral-500">
                  Shift+Enter for a new line. Your entries are private and securely stored.
                </p>
              </div>
            </div>
          </>
        ) : (
          <CounsellorView journalEntries={entries} />
        )}
      </div>
    </div>
  );
}
