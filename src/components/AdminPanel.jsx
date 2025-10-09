import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Shield, LogOut, Users, Video, VideoOff, 
  CheckCircle, XCircle, Monitor, Lock, User,
  Maximize, Minimize
} from 'lucide-react';
import { database } from '../firebase';
import { ref, onValue, set, remove } from 'firebase/database';

const ADMIN_ACCOUNTS = {
  fahmy: { password: 'Fahmy@2025', displayName: 'Fahmy' },
  ewis: { password: 'Ewis@2025', displayName: 'Ewis' }
};

export function AdminPanel({ onClose }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [admin, setAdmin] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [queue, setQueue] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const videoRef = useRef(null);
  const videoContainerRef = useRef(null);
  const peerConnectionRef = useRef(null);

  useEffect(() => {
    if (!admin) return;

    const queueRef = ref(database, 'screenShareQueue');
    const unsubQueue = onValue(queueRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const queueList = Object.entries(data)
          .map(([id, info]) => ({ id, ...info }))
          .filter(item => item.status === 'waiting' && item.requestedAdmin === admin.username)
          .sort((a, b) => a.joinTime - b.joinTime);
        setQueue(queueList);
      } else {
        setQueue([]);
      }
    });

    const sessionRef = ref(database, `adminSessions/${admin.username}`);
    const unsubSession = onValue(sessionRef, (snapshot) => {
      const session = snapshot.val();
      setCurrentSession(session);
    });

    return () => {
      unsubQueue();
      unsubSession();
    };
  }, [admin]);

  useEffect(() => {
    if (!currentSession || !currentSession.userId) return;

    const offerRef = ref(database, `webrtc/${currentSession.userId}/offer`);
    const unsubOffer = onValue(offerRef, (snapshot) => {
      const offer = snapshot.val();
      if (offer && offer.sdp) {
        handleIncomingOffer(offer, currentSession.userId);
      }
    });

    return () => {
      unsubOffer();
    };
  }, [currentSession]);

  useEffect(() => {
    if (remoteStream && videoRef.current) {
      videoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');
    
    const account = ADMIN_ACCOUNTS[username.toLowerCase()];
    if (account && account.password === password) {
      const adminData = {
        username: username.toLowerCase(),
        displayName: account.displayName
      };
      setAdmin(adminData);
      setIsLoggedIn(true);
    } else {
      setError('اسم المستخدم أو كلمة المرور غير صحيحة');
    }
  };

  const handleLogout = async () => {
    if (currentSession) {
      await endSession();
    }
    setAdmin(null);
    setIsLoggedIn(false);
    setUsername('');
    setPassword('');
  };

  const setupPeerConnection = async (userId) => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    const pc = new RTCPeerConnection(configuration);
    peerConnectionRef.current = pc;

    pc.ontrack = (event) => {
      console.log('Received track:', event.track.kind);
      console.log('Received stream:', event.streams[0]);
      setRemoteStream(event.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
    };

    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', pc.iceConnectionState);
    };

    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        console.log('Admin sending ICE candidate:', event.candidate);
        await set(ref(database, `webrtc/${userId}/adminCandidates/${Date.now()}`), {
          candidate: event.candidate.toJSON()
        });
      }
    };

    // Listen for user ICE candidates
    const candidatesRef = ref(database, `webrtc/${userId}/userCandidates`);
    onValue(candidatesRef, (snapshot) => {
      const data = snapshot.val();
      if (data && pc) {
        Object.values(data).forEach(async ({ candidate }) => {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.error('Error adding ICE candidate:', e);
          }
        });
      }
    });

    return pc;
  };

  const handleIncomingOffer = async (offer, userId) => {
    try {
      if (peerConnectionRef.current) {
        console.log('Closing existing peer connection');
        peerConnectionRef.current.close();
      }

      const pc = await setupPeerConnection(userId);
      
      console.log('Setting remote description with offer:', offer);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      console.log('Creating answer...');
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      console.log('Sending answer to user:', answer);
      await set(ref(database, `webrtc/${userId}/answer`), {
        type: answer.type,
        sdp: answer.sdp
      });
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  };

  const acceptUser = async (userId) => {
    try {
      const user = queue.find(u => u.id === userId);
      
      await set(ref(database, `screenShareQueue/${userId}`), {
        ...user,
        status: 'active',
        adminName: admin.displayName,
        startTime: Date.now()
      });

      await set(ref(database, `adminSessions/${admin.username}`), {
        userId,
        userName: user.userName,
        startTime: Date.now()
      });
    } catch (error) {
      console.error('Error accepting user:', error);
    }
  };

  const toggleFullscreen = async () => {
    if (!videoContainerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await videoContainerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const endSession = async () => {
    if (!currentSession) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }

      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      
      setRemoteStream(null);
      
      await remove(ref(database, `screenShareQueue/${currentSession.userId}`));
      await remove(ref(database, `adminSessions/${admin.username}`));
      await remove(ref(database, `webrtc/${currentSession.userId}`));

      if (queue.length > 0) {
        setTimeout(() => acceptUser(queue[0].id), 1000);
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

  if (!isLoggedIn) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md glass-effect">
          <CardHeader className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full border-4 border-primary/30 overflow-hidden">
              <Lock className="w-full h-full p-4 text-primary bg-primary/10" />
            </div>
            <CardTitle className="text-2xl font-bold text-primary">
              تسجيل دخول الإدارة
            </CardTitle>
            <p className="text-sm text-gray-400 mt-2">Admin Panel Login</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <User className="w-4 h-4" />
                  اسم المستخدم
                </label>
                <Input
                  type="text"
                  placeholder="fahmy or ewis"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="glass-effect"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  كلمة المرور
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="glass-effect"
                  required
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit" className="flex-1 gold-gradient text-black font-semibold">
                  تسجيل الدخول
                </Button>
                <Button type="button" variant="outline" onClick={onClose}>
                  إلغاء
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 overflow-auto">
      <div className="max-w-7xl mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <img 
              src={`/${admin.displayName}.jpg`}
              alt={admin.displayName}
              className="w-12 h-12 rounded-full object-cover border-2 border-primary"
            />
            <div>
              <h1 className="text-2xl font-bold text-primary">
                لوحة تحكم {admin.displayName}
              </h1>
              <p className="text-sm text-gray-400">Admin Dashboard</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              تسجيل الخروج
            </Button>
            <Button onClick={onClose} variant="outline" size="sm">
              إغلاق
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <Card className="glass-effect">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">في الانتظار</p>
                  <p className="text-2xl font-bold text-primary">
                    {queue.length}
                  </p>
                </div>
                <Users className="w-10 h-10 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-effect">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">الحالة</p>
                  <p className="text-xl font-bold text-white">
                    {currentSession ? 'نشط' : 'متاح'}
                  </p>
                </div>
                {currentSession ? (
                  <Video className="w-10 h-10 text-green-500" />
                ) : (
                  <VideoOff className="w-10 h-10 text-muted-foreground opacity-50" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-effect">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">الجلسة</p>
                  <p className="text-lg font-bold text-white truncate">
                    {currentSession ? currentSession.userName : 'لا يوجد'}
                  </p>
                </div>
                <Monitor className="w-10 h-10 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Screen Share View */}
          <Card className="glass-effect">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                مشاركة الشاشة
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentSession ? (
                <div className="space-y-4">
                  <div 
                    ref={videoContainerRef}
                    className="bg-black rounded-lg overflow-hidden aspect-video relative group"
                    onMouseEnter={() => setShowControls(true)}
                    onMouseLeave={() => setShowControls(false)}
                  >
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-contain"
                    />
                    
                    {/* Fullscreen Button */}
                    <div className={`absolute top-4 right-4 transition-opacity duration-300 ${
                      showControls || isFullscreen ? 'opacity-100' : 'opacity-0'
                    }`}>
                      <Button
                        onClick={toggleFullscreen}
                        size="icon"
                        className="glass-effect hover:bg-primary/20"
                        variant="ghost"
                      >
                        {isFullscreen ? (
                          <Minimize className="w-5 h-5 text-white" />
                        ) : (
                          <Maximize className="w-5 h-5 text-white" />
                        )}
                      </Button>
                    </div>

                    {/* Session Info Overlay */}
                    {isFullscreen && (
                      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 transition-opacity duration-300 ${
                        showControls ? 'opacity-100' : 'opacity-0'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                              {currentSession.userName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-white">{currentSession.userName}</p>
                              <p className="text-xs text-gray-400">جلسة نشطة</p>
                            </div>
                          </div>
                          <Button 
                            onClick={endSession}
                            variant="destructive"
                            size="sm"
                          >
                            <VideoOff className="w-4 h-4 mr-2" />
                            إنهاء
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {!isFullscreen && (
                    <Button 
                      onClick={endSession}
                      variant="destructive"
                      className="w-full"
                    >
                      <VideoOff className="w-4 h-4 mr-2" />
                      إنهاء الجلسة
                    </Button>
                  )}
                </div>
              ) : (
                <div className="aspect-video bg-black/20 rounded-lg flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <Monitor className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-white">لا توجد جلسة نشطة</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Queue */}
          <Card className="glass-effect">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                قائمة الانتظار ({queue.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {queue.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-white">لا يوجد مستخدمين في الانتظار</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {queue.map((user, index) => {
                    const teammates = user.teammates || [];
                    const hasTeammates = teammates.length > 1;
                    
                    return (
                      <div 
                        key={user.id}
                        className="luxury-gradient rounded-lg overflow-hidden"
                      >
                        <div className="flex items-center justify-between p-3">
                          <div className="flex items-center gap-3 flex-1">
                            <Badge className="gold-gradient text-black font-bold">
                              #{index + 1}
                            </Badge>
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                              {user.userName.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-white">{user.userName}</p>
                                {user.segmentId && (
                                  <Badge variant="outline" className="text-xs">
                                    {user.segmentId}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-400">
                                {new Date(user.joinTime).toLocaleTimeString('ar-EG')}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => acceptUser(user.id)}
                              disabled={!!currentSession}
                              className="gold-gradient text-black"
                              size="sm"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => rejectUser(user.id)}
                              variant="destructive"
                              size="sm"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {hasTeammates && (
                          <div className="px-3 pb-3 pt-0">
                            <div className="bg-primary/5 rounded-lg p-2 border border-primary/20">
                              <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                معاه في نفس المهمة ({teammates.length}):
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {teammates.slice(0, 5).map((teammate, idx) => (
                                  <Badge 
                                    key={idx} 
                                    variant="secondary" 
                                    className="text-xs bg-primary/10 text-primary border-primary/30"
                                  >
                                    {teammate.name}
                                  </Badge>
                                ))}
                                {teammates.length > 5 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{teammates.length - 5}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
