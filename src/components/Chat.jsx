import React, { useState, useEffect, useRef } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { MessageCircle, X, Send } from 'lucide-react';

// --- LOCAL IMPORTS ---
import { db, auth } from '../firebase';
import { playNotificationSound } from '../utils';

export const ChatWindow = ({ orderId, closeChat }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  // --- HYBRID AUTH STATE ---
  const [user, setUser] = useState(() => {
    // 1. Try getting Firebase Auth user immediately
    if (auth.currentUser) return auth.currentUser;

    // 2. If null, check Local Storage (for Phone/PIN users)
    const local = localStorage.getItem('smart_menu_user');
    if (local) {
      const parsed = JSON.parse(local);
      // Create a compatible user object for Phone users
      return {
        uid: parsed.phone, // Use phone as ID
        displayName: parsed.name,
      };
    }
    return null;
  });

  // Listen for Firebase Auth changes (e.g. Google Login loading late)
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      if (u) {
        setUser(u);
      } else {
        // If Firebase says "no user", double check local storage before giving up
        const local = localStorage.getItem('smart_menu_user');
        if (local) {
          const parsed = JSON.parse(local);
          setUser({
            uid: parsed.phone,
            displayName: parsed.name,
          });
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Helper to auto-scroll to the newest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. Listen for messages in real-time
  useEffect(() => {
    if (!orderId) return;
    const messagesRef = collection(db, 'chats', orderId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // SOUND LOGIC:
      if (msgs.length > 0) {
        const lastMsg = msgs[msgs.length - 1];

        // Safety check if user is loaded yet
        if (user) {
          const isFromMe = lastMsg.senderId === user.uid;

          if (!isFromMe) {
            const now = new Date();
            const msgTime = lastMsg.createdAt?.toDate
              ? lastMsg.createdAt.toDate()
              : new Date();

            // Only play sound if message is less than 5 seconds old
            if (now - msgTime < 5000) {
              playNotificationSound('chat');
            }
          }
        }
      }

      setMessages(msgs);
      setTimeout(scrollToBottom, 100);
    });
    return () => unsubscribe();
  }, [orderId, user]); // Re-run if user identity resolves

  // 2. Send a message
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    if (!user) {
      console.error('No user identity found.');
      return;
    }

    try {
      await addDoc(collection(db, 'chats', orderId, 'messages'), {
        text: newMessage,
        senderId: user.uid,
        senderName: user.displayName || 'Customer',
        createdAt: serverTimestamp(),
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div
      className="fixed bottom-4 right-4 z-[9999] w-80 bg-[#F4F3F2] rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col animate-slideUp"
      style={{ height: '450px' }}
    >
      {/* Header */}
      <div className="bg-[#013E37] p-4 flex justify-between items-center text-white">
        <div className="flex items-center gap-2">
          <MessageCircle size={20} />
          <div>
            <h3 className="font-bold text-sm">Chat with Rider</h3>
            <p className="text-[10px] opacity-80">
              Order #{String(orderId).slice(-4)}
            </p>
          </div>
        </div>
        <button
          onClick={closeChat}
          className="p-1 hover:bg-white/10 rounded-full transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-xs text-gray-400 mt-10">
            No messages yet. Say hi!
          </p>
        )}
        {messages.map((msg) => {
          // Robust check for "Me"
          const isMe = user && msg.senderId === user.uid;
          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                  isMe
                    ? 'bg-[#013E37] text-white rounded-tr-none'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
                }`}
              >
                <p>{msg.text}</p>
                <span
                  className={`text-[10px] block mt-1 ${
                    isMe ? 'text-[#F4F3F2]/70' : 'text-gray-400'
                  }`}
                >
                  {msg.senderName}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form
        onSubmit={sendMessage}
        className="p-3 bg-[#F4F3F2] border-t border-gray-100 flex gap-2"
      >
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={user ? 'Type a message...' : 'Connecting...'}
          disabled={!user}
          className="flex-1 bg-white rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#013E37] disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || !user}
          className="bg-[#013E37] text-white p-2 rounded-full hover:bg-[#013E37]/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};
