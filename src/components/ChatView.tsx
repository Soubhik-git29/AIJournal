import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, orderBy, getDocs } from 'firebase/firestore';
import { Chat, ChatMessage, UserProfile } from '../types';
import { Send, Phone, Video, Users, Plus, X } from 'lucide-react';
import { CallView } from './CallView';

export function ChatView() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [usersCache, setUsersCache] = useState<Record<string, UserProfile>>({});
  const [messageInput, setMessageInput] = useState('');
  const [activeCall, setActiveCall] = useState<{chatId: string, isVideo: boolean} | null>(null);
  
  // Group Chat State
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  
  const currentUser = auth.currentUser;
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'chats'), where('participants', 'array-contains', currentUser.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      setChats(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat)));
    });
    return () => unsub();
  }, [currentUser]);

  const activeSubs = useRef<Record<string, () => void>>({});

  useEffect(() => {
    return () => {
      Object.values(activeSubs.current).forEach(unsub => unsub());
    };
  }, []);

  useEffect(() => {
    const uids = new Set<string>();
    chats.forEach(c => c.participants.forEach(uid => uids.add(uid)));
    
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
  }, [chats, currentUser]);

  useEffect(() => {
    if (!selectedChat) return;
    const q = query(collection(db, `chats/${selectedChat.id}/messages`), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage)));
    });
    return () => unsub();
  }, [selectedChat]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const availableFriends = chats
    .filter(c => !c.isGroup)
    .map(c => {
      const otherUid = c.participants.find(p => p !== currentUser?.uid);
      return otherUid ? usersCache[otherUid] : null;
    })
    .filter(Boolean) as UserProfile[];

  const createGroupChat = async () => {
    if (!groupNameInput.trim() || selectedFriends.length === 0 || !currentUser) return;

    const participants = [currentUser.uid, ...selectedFriends];
    await addDoc(collection(db, 'chats'), {
      participants,
      isGroup: true,
      groupName: groupNameInput.trim(),
      updatedAt: Date.now()
    });

    setShowCreateGroup(false);
    setGroupNameInput('');
    setSelectedFriends([]);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedChat || !currentUser) return;
    
    const text = messageInput;
    setMessageInput('');
    
    await addDoc(collection(db, `chats/${selectedChat.id}/messages`), {
      senderId: currentUser.uid,
      text,
      createdAt: Date.now()
    });
    
    await updateDoc(doc(db, 'chats', selectedChat.id), {
      lastMessage: text,
      updatedAt: Date.now()
    });
  };

  if (activeCall && selectedChat) {
    return <CallView chatId={activeCall.chatId} participants={selectedChat.participants} isVideo={activeCall.isVideo} onEndCall={() => setActiveCall(null)} />;
  }

  return (
    <div className="flex h-full w-full bg-white dark:bg-neutral-950 relative">
      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-neutral-950 rounded-2xl shadow-xl max-w-md w-full overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-neutral-900">
              <h3 className="font-serif text-lg">Create Group Chat</h3>
              <button onClick={() => setShowCreateGroup(false)} className="p-1 hover:bg-neutral-200 rounded-lg text-neutral-500 dark:text-neutral-400">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 border-b border-neutral-100 dark:border-neutral-800">
              <input
                type="text"
                placeholder="Group Name"
                value={groupNameInput}
                onChange={e => setGroupNameInput(e.target.value)}
                className="w-full px-4 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:border-neutral-300"
              />
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-2">Select Friends ({selectedFriends.length} selected)</p>
              {availableFriends.length === 0 && (
                <p className="text-sm text-neutral-400 dark:text-neutral-500">You need to add friends first.</p>
              )}
              {availableFriends.map(friend => (
                <label key={friend.id} className="flex items-center gap-3 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 dark:bg-neutral-900 cursor-pointer transition-colors">
                  <input 
                    type="checkbox"
                    checked={selectedFriends.includes(friend.id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedFriends(prev => [...prev, friend.id]);
                      else setSelectedFriends(prev => prev.filter(id => id !== friend.id));
                    }}
                    className="w-4 h-4 rounded text-neutral-900 dark:text-white border-neutral-300 focus:ring-neutral-900"
                  />
                  <div className="w-8 h-8 bg-neutral-200 rounded-full flex items-center justify-center font-bold text-neutral-500 dark:text-neutral-400 text-xs">
                    {friend.displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-sm">{friend.displayName}</span>
                </label>
              ))}
            </div>
            
            <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
              <button 
                onClick={createGroupChat}
                disabled={!groupNameInput.trim() || selectedFriends.length === 0}
                className="w-full py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl font-medium disabled:opacity-50"
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat List Sidebar */}
      <div className="w-80 border-r border-neutral-100 dark:border-neutral-800 flex flex-col">
        <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
          <h2 className="text-xl font-serif">Chats</h2>
          <button onClick={() => setShowCreateGroup(true)} className="p-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white dark:text-white hover:bg-neutral-100 dark:bg-neutral-800 rounded-lg" title="Create Group Chat">
            <Plus size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chats.map(chat => {
            const otherUid = chat.participants.find(p => p !== currentUser?.uid);
            const otherUser = otherUid ? usersCache[otherUid] : null;
            const isOnline = otherUser && otherUser.lastActive && (Date.now() - otherUser.lastActive < 60000);
            return (
              <div 
                key={chat.id} 
                onClick={() => setSelectedChat(chat)}
                className={`p-4 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 dark:bg-neutral-900 transition-colors border-b border-neutral-100 dark:border-neutral-800 ${selectedChat?.id === chat.id ? 'bg-neutral-50 dark:bg-neutral-900' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 bg-neutral-200 rounded-full flex items-center justify-center font-bold text-neutral-500 dark:text-neutral-400">
                      {chat.isGroup ? <Users size={20} /> : (otherUser?.displayName?.charAt(0).toUpperCase() || '?')}
                    </div>
                    {!chat.isGroup && isOnline && (
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{chat.isGroup ? chat.groupName : (otherUser?.displayName || 'Unknown User')}</p>
                    {chat.lastMessage && (
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">{chat.lastMessage}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {chats.length === 0 && (
            <p className="p-4 text-sm text-neutral-500 dark:text-neutral-400 text-center">No active chats. Add friends to start chatting!</p>
          )}
        </div>
      </div>

      {/* Chat Area */}
      {selectedChat ? (
        <div className="flex-1 flex flex-col bg-neutral-50 dark:bg-neutral-900">
          {/* Chat Header */}
          <div className="p-4 bg-white dark:bg-neutral-950 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
            <div className="flex items-center gap-3">
              {(() => {
                if (selectedChat.isGroup) {
                  return (
                    <>
                      <div className="w-10 h-10 bg-neutral-200 rounded-full flex items-center justify-center text-neutral-500 dark:text-neutral-400">
                        <Users size={20} />
                      </div>
                      <div>
                        <p className="font-medium">{selectedChat.groupName}</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">{selectedChat.participants.length} members</p>
                      </div>
                    </>
                  );
                }
                
                const otherUid = selectedChat.participants.find(p => p !== currentUser?.uid);
                const otherUser = otherUid ? usersCache[otherUid] : null;
                const isOnline = otherUser && otherUser.lastActive && (Date.now() - otherUser.lastActive < 60000);
                
                return (
                  <>
                    <div className="relative">
                      <div className="w-10 h-10 bg-neutral-200 rounded-full flex items-center justify-center font-bold text-neutral-500 dark:text-neutral-400">
                        {otherUser?.displayName?.charAt(0).toUpperCase() || '?'}
                      </div>
                      {isOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{otherUser?.displayName || 'Unknown User'}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">{isOnline ? 'Active now' : 'Offline'}</p>
                    </div>
                  </>
                );
              })()}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setActiveCall({ chatId: selectedChat.id, isVideo: false })} className="p-2 text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-white dark:text-white bg-neutral-50 dark:bg-neutral-900 rounded-lg hover:bg-neutral-100 dark:bg-neutral-800">
                <Phone size={20} />
              </button>
              <button onClick={() => setActiveCall({ chatId: selectedChat.id, isVideo: true })} className="p-2 text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-white dark:text-white bg-neutral-50 dark:bg-neutral-900 rounded-lg hover:bg-neutral-100 dark:bg-neutral-800">
                <Video size={20} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => {
              const isMine = msg.senderId === currentUser?.uid;
              const sender = usersCache[msg.senderId];
              const showSender = selectedChat.isGroup && !isMine && (i === 0 || messages[i-1].senderId !== msg.senderId);
              
              const currentUserProfile = currentUser ? usersCache[currentUser.uid] : null;
              const chatTheme = currentUserProfile?.chatTheme || 'neutral';
              const themeClasses: Record<string, string> = {
                'neutral': 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900',
                'blue': 'bg-blue-600 text-white',
                'rose': 'bg-rose-500 text-white',
                'emerald': 'bg-emerald-600 text-white',
                'violet': 'bg-violet-600 text-white'
              };
              const bubbleClass = isMine ? `${themeClasses[chatTheme] || themeClasses['neutral']} rounded-tr-sm` : 'bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-tl-sm text-neutral-900 dark:text-white';

              return (
                <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                  {showSender && sender && (
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 ml-1">{sender.displayName}</span>
                  )}
                  <div className={`p-3 rounded-2xl max-w-[70%] ${bubbleClass}`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white dark:bg-neutral-950 border-t border-neutral-100 dark:border-neutral-800">
            <form onSubmit={sendMessage} className="flex gap-2">
              <input
                type="text"
                value={messageInput}
                onChange={e => setMessageInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:border-neutral-300"
              />
              <button type="submit" disabled={!messageInput.trim()} className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl disabled:opacity-50">
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-neutral-50 dark:bg-neutral-900">
          <p className="text-neutral-400 dark:text-neutral-500">Select a chat to start messaging</p>
        </div>
      )}
    </div>
  );
}
