import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, Clock, Video, UserCheck, Monitor,
  Loader2, CheckCircle2, XCircle
} from 'lucide-react';
import { database } from '../firebase';
import { ref, set, onValue, remove } from 'firebase/database';

export function UserApp() {
  const [userName, setUserName] = useState('');
  const [showNameInput, setShowNameInput] = useState(true);
  const [userId] = useState(() => 'user_' + Math.random().toString(36).substr(2, 9));
  const [inQueue, setInQueue] = useState(false);
  const [queuePosition, setQueuePosition] = useState(0);
  const [totalWaiting, setTotalWaiting] = useState(0);
  const [myStatus, setMyStatus] = useState(null);
  const [adminSessions, setAdminSessions] = useState({ fahmy: null, ewis: null });

  useEffect(() => {
    const savedName = localStorage.getItem('userName');
    if (savedName) {
      setUserName(savedName);
      setShowNameInput(false);
    }
  }, []);

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
        
        setTotalWaiting(queueList.length);
        
        const myIndex = queueList.findIndex(u => u.id === userId);
        if (myIndex !== -1) {
          setQueuePosition(myIndex + 1);
          setInQueue(true);
        }

        // Check my status
        if (data[userId]) {
          setMyStatus(data[userId]);
          if (data[userId].status === 'active') {
            setInQueue(false);
          }
        } else {
          setMyStatus(null);
          setInQueue(false);
        }
      } else {
        setTotalWaiting(0);
        setInQueue(false);
        setMyStatus(null);
      }
    });

    // Listen to admin sessions
    const fahmyRef = ref(database, 'adminSessions/fahmy');
    const ewisRef = ref(database, 'adminSessions/ewis');
    
    const unsubFahmy = onValue(fahmyRef, (snapshot) => {
      setAdminSessions(prev => ({ ...prev, fahmy: snapshot.val() }));
    });
    
    const unsubEwis = onValue(ewisRef, (snapshot) => {
      setAdminSessions(prev => ({ ...prev, ewis: snapshot.val() }));
    });

    return () => {
      unsubQueue();
      unsubFahmy();
      unsubEwis();
    };
  }, [userId]);

  const handleNameSubmit = () => {
    if (userName.trim()) {
      localStorage.setItem('userName', userName.trim());
      setShowNameInput(false);
    }
  };

  const joinQueue = async (adminName) => {
    try {
      await set(ref(database, `screenShareQueue/${userId}`), {
        userName,
        joinTime: Date.now(),
        status: 'waiting',
        requestedAdmin: adminName
      });
      setInQueue(true);
    } catch (error) {
      console.error('Error joining queue:', error);
    }
  };

  const leaveQueue = async () => {
    try {
      await remove(ref(database, `screenShareQueue/${userId}`));
      setInQueue(false);
      setMyStatus(null);
    } catch (error) {
      console.error('Error leaving queue:', error);
    }
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
              className="w-full gold-gradient text-black font-semibold hover-lift"
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
            Screen Share Service
          </h1>
          <p className="text-muted-foreground">مرحباً {userName}</p>
        </div>

        {/* Queue Status */}
        <Card className="glass-effect mb-6 animate-fade-in-up">
          <CardContent className="p-6">
            <div className="flex items-center justify-center gap-6 text-center">
              <div>
                <p className="text-sm text-muted-foreground mb-1">في الانتظار</p>
                <p className="text-3xl font-bold gold-gradient bg-clip-text text-transparent">
                  {totalWaiting}
                </p>
              </div>
              {inQueue && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">موقعك</p>
                  <Badge className="gold-gradient text-black text-xl px-4 py-2">
                    #{queuePosition}
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* My Status */}
        {myStatus && myStatus.status === 'active' && (
          <Card className="glass-effect mb-6 animate-fade-in-up border-green-500/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <CheckCircle2 className="w-12 h-12 text-green-500" />
                  <div>
                    <p className="text-xl font-bold text-green-500">جلستك نشطة الآن!</p>
                    <p className="text-sm text-muted-foreground">
                      مع {myStatus.adminName}
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={leaveQueue}
                  variant="destructive"
                  className="hover-lift"
                >
                  إنهاء
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Admins */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {['fahmy', 'ewis'].map((adminName) => {
            const session = adminSessions[adminName];
            const isAvailable = !session;
            const isMySession = session && session.userId === userId;

            return (
              <Card key={adminName} className="glass-effect hover-lift animate-slide-in-right">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="gold-gradient bg-clip-text text-transparent capitalize">
                      {adminName === 'fahmy' ? 'Fahmy' : 'Ewis'}
                    </span>
                    <Badge variant={isAvailable ? 'default' : 'secondary'}>
                      {isAvailable ? 'متاح' : 'مشغول'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-center p-6 luxury-gradient rounded-lg">
                    {isAvailable ? (
                      <Video className="w-16 h-16 text-green-500" />
                    ) : (
                      <Monitor className="w-16 h-16 text-primary" />
                    )}
                  </div>

                  {session && !isMySession && (
                    <div className="text-center p-3 bg-primary/10 rounded-lg">
                      <p className="text-sm text-muted-foreground">في جلسة مع</p>
                      <p className="font-semibold">{session.userName}</p>
                    </div>
                  )}

                  {!inQueue && !myStatus ? (
                    <Button
                      onClick={() => joinQueue(adminName)}
                      disabled={!isAvailable}
                      className="w-full gold-gradient text-black font-semibold hover-lift"
                    >
                      <Video className="w-4 h-4 mr-2" />
                      طلب مشاركة الشاشة
                    </Button>
                  ) : inQueue ? (
                    <Button
                      onClick={leaveQueue}
                      variant="outline"
                      className="w-full"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      إلغاء الطلب
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Waiting Status */}
        {inQueue && (
          <Card className="mt-6 glass-effect animate-fade-in-up">
            <CardContent className="p-6">
              <div className="flex items-center justify-center gap-4">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <div className="text-center">
                  <p className="font-semibold">في الانتظار...</p>
                  <p className="text-sm text-muted-foreground">
                    أنت رقم {queuePosition} في الطابور
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
