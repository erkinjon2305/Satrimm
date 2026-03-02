import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, addDoc, onSnapshot, orderBy, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { UserProfile, Message } from '../types';
import { Link } from 'react-router-dom';
import { Search, Send } from 'lucide-react';
import { format } from 'date-fns';

export default function Messages() {
  const { user, profile } = useAuth();
  const [followingUsers, setFollowingUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchFollowing = async () => {
      if (!profile?.following || profile.following.length === 0) {
        setLoading(false);
        return;
      }
      try {
        const users: UserProfile[] = [];
        for (const uid of profile.following) {
          const docRef = doc(db, 'users', uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            users.push(docSnap.data() as UserProfile);
          }
        }
        setFollowingUsers(users);
      } catch (error) {
        console.error('Error fetching following users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFollowing();
  }, [profile]);

  useEffect(() => {
    if (!user || !selectedUser) return;

    const chatId = [user.uid, selectedUser.uid].sort().join('_');
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(fetchedMessages);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return () => unsubscribe();
  }, [user, selectedUser]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !selectedUser) return;

    const chatId = [user.uid, selectedUser.uid].sort().join('_');
    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        chatId,
        senderId: user.uid,
        text: messageText,
        timestamp: new Date().toISOString(),
        read: false
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full border-x border-gray-200 dark:border-gray-800 min-h-screen flex">
      {/* Sidebar: List of users */}
      <div className={`w-full sm:w-80 border-r border-gray-200 dark:border-gray-800 flex flex-col ${selectedUser ? 'hidden sm:flex' : 'flex'}`}>
        <div className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-4 py-3">
          <h1 className="text-xl font-bold">Messages</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center">Loading...</div>
          ) : followingUsers.length > 0 ? (
            followingUsers.map(u => (
              <button
                key={u.uid}
                onClick={() => setSelectedUser(u)}
                className={`w-full flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left ${selectedUser?.uid === u.uid ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
              >
                <img
                  src={u.avatarUrl || `https://ui-avatars.com/api/?name=${u.displayName}&background=random`}
                  alt={u.displayName}
                  className="w-12 h-12 rounded-full object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 truncate">{u.displayName}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">@{u.username}</p>
                </div>
              </button>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              Follow people to start messaging them.
            </div>
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className={`flex-1 flex flex-col h-screen sm:h-auto ${!selectedUser ? 'hidden sm:flex' : 'flex'}`}>
        {selectedUser ? (
          <>
            <div className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-3">
              <button 
                onClick={() => setSelectedUser(null)}
                className="sm:hidden p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <Link to={`/profile/${selectedUser.username}`}>
                <img
                  src={selectedUser.avatarUrl || `https://ui-avatars.com/api/?name=${selectedUser.displayName}&background=random`}
                  alt={selectedUser.displayName}
                  className="w-8 h-8 rounded-full object-cover"
                />
              </Link>
              <h2 className="font-bold text-lg">{selectedUser.displayName}</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, idx) => {
                const isMe = msg.senderId === user?.uid;
                const showTime = idx === 0 || new Date(msg.timestamp).getTime() - new Date(messages[idx-1].timestamp).getTime() > 5 * 60 * 1000;
                
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    {showTime && (
                      <span className="text-xs text-gray-500 mb-2">{format(new Date(msg.timestamp), 'MMM d, h:mm a')}</span>
                    )}
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${isMe ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm'}`}>
                      {msg.text}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Start a new message"
                  className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full transition-colors disabled:opacity-50"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
            Select a message
          </div>
        )}
      </div>
    </div>
  );
}
