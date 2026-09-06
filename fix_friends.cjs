const fs = require('fs');
let content = fs.readFileSync('src/components/FriendsView.tsx', 'utf8');

const effectCode = `
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
        where('isPublic', '==', true),
        orderBy('createdAt', 'desc'),
        limit(5)
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
`;

content = content.replace("const pendingReceived = friendRequests.filter(r => r.toUserId === currentUser?.uid && r.status === 'pending');", effectCode + "\n\n  const pendingReceived = friendRequests.filter(r => r.toUserId === currentUser?.uid && r.status === 'pending');");

fs.writeFileSync('src/components/FriendsView.tsx', content);
