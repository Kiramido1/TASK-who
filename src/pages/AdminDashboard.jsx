import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  LogOut, Users, Clock, Video, VideoOff, 
  CheckCircle, XCircle, User, Monitor 
} from 'lucide-react';
import { database } from '../firebase';
import { ref, onValue, set, remove } from 'firebase/database';

export function AdminDashboard() {
  const { admin, logout } = useAuth();
  const [queue, setQueue] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [stats, setStats] = useState({ waiting: 0, total: 0 });

  useEffect(() => {
    // Listen to queue
    const queueRef = ref(database, 'screenShareQueue');
    const unsubQueue = onValue(queueRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const queueList = Object.entries(data)
          .map(([id, info]) => ({ id, ...info }))
          .filter(item => item.status === 'waiting')
          .sort((a, b) => a.joinTime - b.joinTime);
        setQueue(queueList);
        setStats(prev => ({ ...prev, waiting: queueList.length }));
      } else {
        setQueue([]);
        setStats(prev => ({ ...prev, waiting: 0 }));
      }
    });

    // Listen to current admin session
    const sessionRef = ref(database, `adminSessions/${admin.username}`);
    const unsubSession = onValue(sessionRef, (snapshot) => {
      setCurrentSession(snapshot.val());
    });

    return () => {
      unsubQueue();
      unsubSession();
    };
  }, [admin.username]);

  const acceptUser = async (userId) => {
    try {
      // Update user status to active
      await set(ref(database, `screenShareQueue/${userId}`), {
        ...queue.find(u => u.id === userId),
        status: 'active',
        adminName: admin.displayName,
        startTime: Date.now()
      });

      // Set admin session
      await set(ref(database, `adminSessions/${admin.username}`), {
        userId,
        userName: queue.find(u => u.id === userId).userName,
        startTime: Date.now()
      });
    } catch (error) {
      console.error('Error accepting user:', error);
    }
  };

  const endSession = async () => {
    if (!currentSession) return;

    try {
      // Remove user from queue
      await remove(ref(database, `screenShareQueue/${currentSession.userId}`));
      
      // Remove admin session
      await remove(ref(database, `adminSessions/${admin.username}`));

      // Auto-accept next in queue
      if (queue.length > 0) {
        const nextUser = queue[0];
        setTimeout(() => acceptUser(nextUser.id), 1000);
      }
    } catch (error) {
      console.error('Error ending session:', error);
    }
  };

  const rejectUser = async (userId) => {
    try {
      await remove(ref(database, `screenShareQueue/${userId}`));
    } catch (error) {
      console.error('Error rejecting user:', error);
    }
  };

  const formatDuration = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-secondary opacity-50"></div>
      
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-fade-in-up">
          <div>
            <h1 className="text-3xl font-bold gold-gradient bg-clip-text text-transparent">
              لوحة تحكم {admin.displayName}
            </h1>
            <p className="text-muted-foreground">Admin Dashboard</p>
          </div>
          <Button 
            onClick={logout}
            variant="outline"
            className="hover-lift"
          >
            <LogOut className="w-4 h-4 mr-2" />
            تسجيل الخروج
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="glass-effect hover-lift">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">في الانتظار</p>
                  <p className="text-3xl font-bold gold-gradient bg-clip-text text-transparent">
                    {stats.waiting}
                  </p>
                </div>
                <Users className="w-12 h-12 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-effect hover-lift">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">الحالة</p>
                  <p className="text-xl font-bold">
                    {currentSession ? 'نشط' : 'متاح'}
                  </p>
                </div>
                {currentSession ? (
                  <Video className="w-12 h-12 text-green-500" />
                ) : (
                  <VideoOff className="w-12 h-12 text-muted-foreground opacity-50" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-effect hover-lift">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">الجلسة الحالية</p>
                  <p className="text-xl font-bold">
                    {currentSession ? currentSession.userName : 'لا يوجد'}
                  </p>
                </div>
                <Monitor className="w-12 h-12 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current Session */}
        {currentSession && (
          <Card className="glass-effect mb-6 animate-fade-in-up border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-500">
                <Video className="w-5 h-5" />
                جلسة نشطة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 luxury-gradient rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full gold-gradient flex items-center justify-center text-black font-bold">
                    {currentSession.userName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-lg">{currentSession.userName}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(currentSession.startTime)}
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={endSession}
                  variant="destructive"
                  className="hover-lift"
                >
                  <VideoOff className="w-4 h-4 mr-2" />
                  إنهاء الجلسة
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Queue */}
        <Card className="glass-effect animate-slide-in-right">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              قائمة الانتظار ({queue.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {queue.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg">لا يوجد مستخدمين في الانتظار</p>
              </div>
            ) : (
              <div className="space-y-3">
                {queue.map((user, index) => (
                  <div 
                    key={user.id}
                    className="flex items-center justify-between p-4 luxury-gradient rounded-lg hover-lift"
                  >
                    <div className="flex items-center gap-4">
                      <Badge className="gold-gradient text-black font-bold">
                        #{index + 1}
                      </Badge>
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{user.userName}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          في الانتظار منذ {formatDuration(user.joinTime)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => acceptUser(user.id)}
                        disabled={!!currentSession}
                        className="gold-gradient text-black hover-lift"
                        size="sm"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        قبول
                      </Button>
                      <Button
                        onClick={() => rejectUser(user.id)}
                        variant="destructive"
                        size="sm"
                        className="hover-lift"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        رفض
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
