import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Users, Clock, Play, X, UserCheck, MessageCircle, Shield } from 'lucide-react';
import { database } from './firebase';
import { ref, set, onValue, remove } from 'firebase/database';
import { useNotification } from './hooks/useNotification';
import { Chat } from './components/Chat';
import { AdminPanel } from './components/AdminPanel';
import { ScreenShareRequest } from './components/ScreenShareRequest';
import { ResourcesMenu } from './components/ResourcesMenu';
import './App.css';

function App() {
  const [userName, setUserName] = useState('');
  const [segmentId, setSegmentId] = useState('');
  const [currentSegment, setCurrentSegment] = useState('');
  const [participants, setParticipants] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [showNameInput, setShowNameInput] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [userId] = useState(() => 'user_' + Math.random().toString(36).substr(2, 9));

  // Check if there are other participants (excluding current user)
  const hasOtherParticipants = participants.filter(p => p.id !== userId).length > 0;
  
  // Use notification hook to manage favicon
  useNotification(hasOtherParticipants && isConnected);

  useEffect(() => {
    const savedName = localStorage.getItem('userName');
    if (savedName) {
      setUserName(savedName);
      setShowNameInput(false);
    }
  }, []);

  useEffect(() => {
    if (currentSegment) {
      const segmentRef = ref(database, `segments/${currentSegment}`);
      const unsubscribe = onValue(segmentRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const participantsList = Object.entries(data).map(([id, info]) => ({
            id,
            ...info,
            duration: info.joinTime ? Math.floor((Date.now() - info.joinTime) / 1000) : 0
          }));
          setParticipants(participantsList);
        } else {
          setParticipants([]);
        }
      });

      return () => unsubscribe();
    }
  }, [currentSegment]);

  useEffect(() => {
    let interval;
    if (isConnected && participants.length > 0) {
      // Update participant durations every second
      interval = setInterval(() => {
        setParticipants(prev => 
          prev.map(p => ({
            ...p,
            duration: p.joinTime ? Math.floor((Date.now() - p.joinTime) / 1000) : 0
          }))
        );
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isConnected, participants.length]);

  const handleNameSubmit = () => {
    if (userName.trim()) {
      localStorage.setItem('userName', userName.trim());
      setShowNameInput(false);
    }
  };

  const handleJoinSegment = async () => {
    if (!segmentId.trim() || !userName.trim()) return;

    try {
      const userRef = ref(database, `segments/${segmentId}/${userId}`);
      await set(userRef, {
        name: userName,
        joinTime: Date.now(),
        status: 'active'
      });

      setCurrentSegment(segmentId);
      setIsConnected(true);
    } catch (error) {
      console.error('Error joining segment:', error);
    }
  };

  const handleLeaveSegment = async () => {
    if (currentSegment && userId) {
      try {
        const userRef = ref(database, `segments/${currentSegment}/${userId}`);
        await remove(userRef);
        
        setCurrentSegment('');
        setIsConnected(false);
        setParticipants([]);
        setSegmentId('');
      } catch (error) {
        console.error('Error leaving segment:', error);
      }
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatJoinTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (showNameInput) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-secondary opacity-50"></div>
        <Card className="w-full max-w-md glass-effect animate-fade-in-up relative z-10">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-primary">
              مرحباً بك
            </CardTitle>
            <p className="text-white">أدخل اسمك للمتابعة</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="text"
              placeholder="اسمك..."
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="text-center text-lg glass-effect border-primary/20 focus:border-primary"
              onKeyPress={(e) => e.key === 'Enter' && handleNameSubmit()}
            />
            <Button 
              onClick={handleNameSubmit}
              className="w-full gold-gradient text-black font-semibold hover-lift animate-pulse-gold"
              disabled={!userName.trim()}
            >
              <UserCheck className="w-4 h-4 mr-2" />
              تأكيد الاسم
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-secondary opacity-50"></div>
      
      {/* Admin Panel Toggle */}
      <Button
        onClick={() => setShowAdminPanel(true)}
        className="fixed top-4 left-4 z-40 glass-effect"
        variant="outline"
        size="sm"
      >
        <Shield className="w-4 h-4 mr-2" />
        وضع الإدارة
      </Button>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in-up relative z-20">
          <h1 className="text-4xl font-bold mb-2" style={{
            background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: '0 0 30px rgba(255, 215, 0, 0.5)'
          }}>
            Segment Collaboration Hub
          </h1>
          <p className="text-white font-medium">مرحباً {userName} - تعاون في الوقت الفعلي</p>
        </div>

        {/* Screen Share Request */}
        <div className="mb-6 animate-fade-in-up relative z-10">
          <ScreenShareRequest 
            userName={userName} 
            userId={userId}
            segmentId={currentSegment}
            participants={participants}
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
          {/* Control Panel */}
          <Card className="glass-effect hover-lift animate-slide-in-right relative">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="w-5 h-5 text-primary" />
                لوحة التحكم
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Segment ID</label>
                <Input
                  type="text"
                  placeholder="أدخل Segment ID..."
                  value={segmentId}
                  onChange={(e) => setSegmentId(e.target.value)}
                  className="glass-effect border-primary/20 focus:border-primary"
                  disabled={isConnected}
                />
              </div>
              
              {!isConnected ? (
                <Button 
                  onClick={handleJoinSegment}
                  className="w-full gold-gradient text-black font-semibold hover-lift"
                  disabled={!segmentId.trim()}
                >
                  <Play className="w-4 h-4 mr-2" />
                  انضمام للمهمة
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 luxury-gradient rounded-lg">
                    <span className="text-sm text-white font-medium">متصل بـ:</span>
                    <Badge className="gold-gradient text-black font-semibold">
                      {currentSegment}
                    </Badge>
                  </div>
                  <Button 
                    onClick={handleLeaveSegment}
                    variant="destructive"
                    className="w-full hover-lift"
                  >
                    <X className="w-4 h-4 mr-2" />
                    مغادرة المهمة
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Participants Panel */}
          <Card className="glass-effect hover-lift animate-slide-in-right relative" style={{animationDelay: '0.2s'}}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                المشاركون ({participants.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {participants.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-white">لا يوجد مشاركون حالياً</p>
                  {isConnected && (
                    <p className="text-sm mt-2 text-gray-400">في انتظار انضمام آخرين...</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {participants.map((participant, index) => (
                    <div 
                      key={participant.id}
                      className="flex items-center justify-between p-3 luxury-gradient rounded-lg hover-lift shimmer"
                      style={{animationDelay: `${index * 0.1}s`}}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full gold-gradient flex items-center justify-center text-black font-semibold text-sm">
                          {participant.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-white">{participant.name}</p>
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            انضم في {formatJoinTime(participant.joinTime)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className="text-xs">
                          {formatDuration(participant.duration)}
                        </Badge>
                        {participant.id === userId ? (
                          <p className="text-xs text-primary mt-1 font-semibold">أنت</p>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsChatOpen(true)}
                            className="h-6 w-6 p-0 mt-1 hover:bg-primary/20"
                          >
                            <MessageCircle className="w-3 h-3 text-primary" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Status Bar */}
        {isConnected && (
          <Card className="mt-6 glass-effect animate-fade-in-up relative z-10">
            <CardContent className="p-4">
              <div className="flex items-center justify-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-white font-medium">متصل</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-white font-medium">{participants.length} مشارك</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="text-white font-medium">تحديث مباشر</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Chat Component */}
      {isConnected && hasOtherParticipants && (
        <Chat
          segmentId={currentSegment}
          userName={userName}
          userId={userId}
          isOpen={isChatOpen}
          onToggle={() => setIsChatOpen(!isChatOpen)}
        />
      )}

      {/* Admin Panel */}
      {showAdminPanel && (
        <AdminPanel onClose={() => setShowAdminPanel(false)} />
      )}

      {/* Resources Menu */}
      <ResourcesMenu />
    </div>
  );
}

export default App;

