import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, getDocs, orderBy, limit } from 'firebase/firestore';
import { UserProfile, FriendRequest, Chat, JournalEntry } from '../types';
import { UserPlus, UserCheck, Search, Clock, Check, X, Globe, Calendar } from 'lucide-react';
import Markdown from 'react-markdown';

export function FriendsView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [usersCache, setUsersCache] = useState<Record<string, UserProfile>>({});
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [friendEntries, setFriendEntries] = useState<(JournalEntry & { userDisplayName: string, userInitial: string })[]>([]);

  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) return;
    
    // Listen to friend requests where user is sender or receiver
    const q = query(collection(db, 'friendRequests'), where('fromUserId', '==', currentUser.uid));
    const q2 = query(collection(db, 'friendRequests'), where('toUserId', '==', currentUser.uid));
    
    const unsub1 = onSnapshot(q, (snapshot) => {
      const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FriendRequest));
      setFriendRequests(prev => {
        const other = prev.filter(p => p.fromUserId !== currentUser.uid);
        return [...other, ...reqs];
      });
    });
    
    const unsub2 = onSnapshot(q2, (snapshot) => {
      const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FriendRequest));
      setFriendRequests(prev => {
        const other = prev.filter(p => p.toUserId !== currentUser.uid);
        return [...other, ...reqs];
      });
    });
    
    return () => { unsub1(); unsub2(); };
  }, [currentUser]);
  
  const activeSubs = useRef<Record<string, () => void>>({});

  useEffect(() => {
    return () => {
      Object.values(activeSubs.current).forEach(unsub => unsub());
    };
  }, []);

  useEffect(() => {
    const uids = new Set<string>();
    friendRequests.forEach(req => {
      if (req.fromUserId !== currentUser?.uid) uids.add(req.fromUserId);
      if (req.toUserId !== currentUser?.uid) uids.add(req.toUserId);
    });
    
    uids.forEach(uid => {
      if (!activeSubs.current[uid]) {
        const q = query(collection(db, 'users'), where('id', '==', uid));
        activeSubs.current[uid] = onSnapshot(q, (snapshot) => {
          if (!snapshot.empty) {
            setUsersCache(prev => ({
              ...prev,
              [uid]: snapshot.docs[0].data() as UserProfile
            }));
          }
        });
      }
    });
  }, [friendRequests, currentUser]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !currentUser) return;
    
    const q = query(collection(db, 'users')); // In a real app we'd use algolia/typesense or limit
    const qSnapshot = await getDocs(q);
    const results = qSnapshot.docs
      .map(doc => doc.data() as UserProfile)
      .filter(u => {
        if (u.id === currentUser.uid) return false;
        const q = searchQuery.toLowerCase();
        const matchName = u.displayName ? u.displayName.toLowerCase().includes(q) : false;
        const matchEmail = u.email ? u.email.toLowerCase().includes(q) : false;
        return matchName || matchEmail;
      });
      
    setSearchResults(results);
  };

  const sendRequest = async (toUserId: string) => {
    if (!currentUser) return;
    await addDoc(collection(db, 'friendRequests'), {
      fromUserId: currentUser.uid,
      toUserId,
      status: 'pending',
      createdAt: Date.now()
    });
  };

  const acceptRequest = async (request: FriendRequest) => {
    if (!currentUser) return;
    await updateDoc(doc(db, 'friendRequests', request.id), {
      status: 'accepted'
    });
    // Create a chat room for them
    const chatRef = collection(db, 'chats');
    await addDoc(chatRef, {
      participants: [request.fromUserId, request.toUserId],
      updatedAt: Date.now()
    });
  };

  
  useEffect(() => {
    if (!currentUser) return;
    const accepted = friendRequests.filter(r => r.status === 'accepted');
    if (accepted.length === 0) {
      setFriendEntries([]);
      return;
    }

    const unsubs = accepted.map(req => {
      const friendId = req.fromUserId === currentUser.uid ? req.toUserId : req.fromUserId;
      const q = query(
        collection(db, 'users', friendId, 'entries'),
        where('isPublic', '==', true)
      );
      return onSnapshot(q, (snapshot) => {
        const entries = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          userDisplayName: usersCache[friendId]?.displayName || 'Unknown Friend',
          userInitial: (usersCache[friendId]?.displayName || 'U').charAt(0).toUpperCase()
        }) as JournalEntry & { userDisplayName: string, userInitial: string });
        
        setFriendEntries(prev => {
          const filtered = prev.filter(e => e.userId !== friendId);
          return [...filtered, ...entries].sort((a, b) => b.createdAt - a.createdAt).slice(0, 20);
        });
      });
    });

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [friendRequests, usersCache, currentUser]);


  const pendingReceived = friendRequests.filter(r => r.toUserId === currentUser?.uid && r.status === 'pending');
  const pendingSent = friendRequests.filter(r => r.fromUserId === currentUser?.uid && r.status === 'pending');
  const acceptedFriends = friendRequests.filter(r => r.status === 'accepted');

  return (
    <div className="flex-1 bg-white dark:bg-neutral-950 p-8 overflow-y-auto">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h2 className="text-2xl font-serif mb-4">Find Friends</h2>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 text-neutral-400 dark:text-neutral-500" size={18} />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:border-neutral-300"
              />
            </div>
            <button type="submit" className="px-6 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl">Search</button>
          </form>
          
          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              {searchResults.map(user => {
                const existingReq = friendRequests.find(r => (r.fromUserId === user.id && r.toUserId === currentUser?.uid) || (r.toUserId === user.id && r.fromUserId === currentUser?.uid));
                return (
                  <div key={user.id} className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-neutral-200 rounded-full flex items-center justify-center font-bold text-neutral-500 dark:text-neutral-400">
                        {user.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{user.displayName}</p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">{user.email}</p>
                      </div>
                    </div>
                    <div>
                      {!existingReq ? (
                        <button onClick={() => sendRequest(user.id)} className="flex items-center gap-2 px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm rounded-lg hover:bg-neutral-800">
                          <UserPlus size={16} /> Add Friend
                        </button>
                      ) : existingReq.status === 'accepted' ? (
                        <span className="flex items-center gap-1 text-sm text-green-600 font-medium"><UserCheck size={16} /> Friends</span>
                      ) : existingReq.fromUserId === currentUser?.uid ? (
                        <span className="flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400"><Clock size={16} /> Request Sent</span>
                      ) : (
                        <button onClick={() => acceptRequest(existingReq)} className="flex items-center gap-2 px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm rounded-lg hover:bg-neutral-800">
                          <Check size={16} /> Accept Request
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {pendingReceived.length > 0 && (
          <div>
            <h2 className="text-xl font-serif mb-4">Friend Requests</h2>
            <div className="space-y-2">
              {pendingReceived.map(req => {
                const user = usersCache[req.fromUserId];
                if (!user) return null;
                return (
                  <div key={req.id} className="flex items-center justify-between p-4 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 shadow-sm rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-neutral-200 rounded-full flex items-center justify-center font-bold text-neutral-500 dark:text-neutral-400">
                        {user.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{user.displayName}</p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">wants to be friends</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => acceptRequest(req)} className="p-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800" title="Accept"><Check size={18} /></button>
                      <button onClick={() => updateDoc(doc(db, 'friendRequests', req.id), { status: 'rejected' })} className="p-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-lg hover:bg-neutral-200" title="Reject"><X size={18} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {pendingSent.length > 0 && (
          <div>
            <h2 className="text-xl font-serif mb-4 text-neutral-500 dark:text-neutral-400">Sent Requests</h2>
            <div className="space-y-2 opacity-70">
              {pendingSent.map(req => {
                const user = usersCache[req.toUserId];
                if (!user) return null;
                return (
                  <div key={req.id} className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-neutral-200 rounded-full flex items-center justify-center font-bold text-neutral-500 dark:text-neutral-400">
                        {user.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{user.displayName}</p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Request Sent</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => updateDoc(doc(db, 'friendRequests', req.id), { status: 'rejected' })} className="p-2 bg-neutral-200 text-neutral-600 dark:text-neutral-400 rounded-lg hover:bg-neutral-300" title="Cancel Request"><X size={18} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {acceptedFriends.length > 0 && (
          <div>
            <h2 className="text-xl font-serif mb-4">My Friends</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {acceptedFriends.map(req => {
                const friendId = req.fromUserId === currentUser?.uid ? req.toUserId : req.fromUserId;
                const user = usersCache[friendId];
                if (!user) return null;
                const isOnline = user.lastActive && (Date.now() - user.lastActive < 60000);
                
                return (
                  <div key={req.id} className="flex items-center gap-3 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-100 dark:border-neutral-800">
                    <div className="relative">
                      <div className="w-12 h-12 bg-neutral-200 rounded-full flex items-center justify-center font-bold text-neutral-500 dark:text-neutral-400">
                        {user.displayName.charAt(0).toUpperCase()}
                      </div>
                      {isOnline && (
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-neutral-50 rounded-full"></div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{user.displayName}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">{isOnline ? 'Online' : user.email}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {friendEntries.length > 0 && (
          <div className="pt-8 border-t border-neutral-100 dark:border-neutral-800">
            <h2 className="text-xl font-serif mb-6 flex items-center gap-2">
              <Globe size={20} className="text-neutral-400" />
              Friends' Public Journals
            </h2>
            <div className="space-y-6">
              {friendEntries.map(entry => (
                <div key={entry.id} className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl p-6 border border-neutral-100 dark:border-neutral-800 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-white dark:bg-neutral-800 rounded-full flex items-center justify-center font-bold text-neutral-500 shadow-sm">
                      {entry.userInitial}
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-white">{entry.userDisplayName}</p>
                      <p className="text-xs text-neutral-500 flex items-center gap-1">
                        <Clock size={12} /> {new Date(entry.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 p-4 rounded-xl shadow-sm text-sm border border-neutral-100 dark:border-neutral-800">
                      <span className="text-neutral-400 font-medium mr-2">Prompt:</span> 
                      {entry.prompt}
                    </div>
                    <div className="markdown-body prose prose-sm max-w-none prose-neutral dark:prose-invert pl-2 border-l-2 border-neutral-200 dark:border-neutral-700">
                      <Markdown>{entry.response}</Markdown>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
