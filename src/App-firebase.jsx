import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Users, Clock, Play, X, UserCheck } from 'lucide-react';
import { database } from './firebase';
import { ref, set, onValue, remove } from 'firebase/database';
import './App.css';

function App() {
  const [userName, setUserName] = useState('');
  const [segmentId, setSegmentId] = useState('');
  const [currentSegment, setCurrentSegment] = useState('');
  const [participants, setParticipants] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [showNameInput, setShowNameInput] = useState(true);
  const [userId] = useState(() => 'user_' + Math.random().toString(36).substr(2, 9));

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
            <CardTitle className="text-2xl font-bold gold-gradient bg-clip-text text-transparent">
              مرحباً بك
            </CardTitle>
            <p className="text-muted-foreground">أدخل اسمك للمتابعة</p>
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
      
      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in-up">
          <h1 className="text-4xl font-bold gold-gradient bg-clip-text text-transparent mb-2">
            Segment Collaboration Hub
          </h1>
          <p className="text-muted-foreground">مرحباً {userName} - تعاون في الوقت الفعلي</p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Control Panel */}
          <Card className="glass-effect hover-lift animate-slide-in-right">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="w-5 h-5 text-primary" />
                لوحة التحكم
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Segment ID</label>
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
                    <span className="text-sm">متصل بـ:</span>
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
          <Card className="glass-effect hover-lift animate-slide-in-right" style={{animationDelay: '0.2s'}}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                المشاركون ({participants.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {participants.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>لا يوجد مشاركون حالياً</p>
                  {isConnected && (
                    <p className="text-sm mt-2">في انتظار انضمام آخرين...</p>
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
                          <p className="font-medium">{participant.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            انضم في {formatJoinTime(participant.joinTime)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className="text-xs">
                          {formatDuration(participant.duration)}
                        </Badge>
                        {participant.id === userId && (
                          <p className="text-xs text-primary mt-1">أنت</p>
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
          <Card className="mt-6 glass-effect animate-fade-in-up">
            <CardContent className="p-4">
              <div className="flex items-center justify-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span>متصل</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span>{participants.length} مشارك</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>تحديث مباشر</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default App;

