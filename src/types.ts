export interface JournalEntry {
  id: string;
  userId: string;
  prompt: string;
  response: string;
  mood?: string;
  createdAt: number;
  isPublic?: boolean;
}

export interface CounsellorMessage {
  id: string;
  userId: string;
  role: 'user' | 'counsellor';
  content: string;
  createdAt: number;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  lastActive?: number;
  chatTheme?: 'neutral' | 'blue' | 'rose' | 'emerald' | 'violet';
  theme?: 'light' | 'dark';
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: number;
}

export interface Chat {
  id: string;
  participants: string[];
  lastMessage?: string;
  updatedAt: number;
  isGroup?: boolean;
  groupName?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt: number;
}

