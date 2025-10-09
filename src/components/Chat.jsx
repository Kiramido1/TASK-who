import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { MessageCircle, Send, X } from 'lucide-react';
import { database } from '../firebase';
import { ref, push, onValue, serverTimestamp } from 'firebase/database';

export function Chat({ segmentId, userName, userId, isOpen, onToggle }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (segmentId && isOpen) {
      const messagesRef = ref(database, `chats/${segmentId}`);
      const unsubscribe = onValue(messagesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const messagesList = Object.entries(data).map(([id, message]) => ({
            id,
            ...message
          })).sort((a, b) => a.timestamp - b.timestamp);
          setMessages(messagesList);
        } else {
          setMessages([]);
        }
      });

      return () => unsubscribe();
    }
  }, [segmentId, isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const messagesRef = ref(database, `chats/${segmentId}`);
      await push(messagesRef, {
        text: newMessage.trim(),
        userId,
        userName,
        timestamp: Date.now()
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) {
    return (
      <Button
        onClick={onToggle}
        className="fixed bottom-4 right-4 w-14 h-14 rounded-full gold-gradient text-black shadow-lg hover-lift animate-pulse-gold z-50"
      >
        <MessageCircle className="w-6 h-6" />
      </Button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-80 h-96 z-50">
      <Card className="h-full glass-effect border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <MessageCircle className="w-4 h-4 text-primary" />
              دردشة المجموعة
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="h-6 w-6 p-0 hover:bg-destructive/20"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="flex flex-col h-full p-3 pt-0">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto space-y-2 mb-3 pr-2">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>لا توجد رسائل بعد</p>
                <p className="text-xs mt-1">ابدأ المحادثة!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.userId === userId ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-2 text-sm ${
                      message.userId === userId
                        ? 'gold-gradient text-black'
                        : 'luxury-gradient text-white'
                    }`}
                  >
                    {message.userId !== userId && (
                      <div className="text-xs opacity-70 mb-1">
                        {message.userName}
                      </div>
                    )}
                    <div className="break-words">{message.text}</div>
                    <div className={`text-xs mt-1 ${
                      message.userId === userId ? 'text-black/70' : 'text-white/70'
                    }`}>
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="اكتب رسالة..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              className="flex-1 text-sm glass-effect border-primary/20 focus:border-primary"
              disabled={isLoading}
            />
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim() || isLoading}
              className="gold-gradient text-black hover-lift px-3"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

