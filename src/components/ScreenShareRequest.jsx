import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Video, VideoOff, Loader2, CheckCircle2, Monitor } from 'lucide-react';
import { database } from '../firebase';
import { ref, set, onValue, remove } from 'firebase/database';

export function ScreenShareRequest({ userName, userId, segmentId, participants }) {
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [queueStatus, setQueueStatus] = useState(null);
  const [adminSessions, setAdminSessions] = useState({ fahmy: null, ewis: null });
  const [queueCounts, setQueueCounts] = useState({ fahmy: 0, ewis: 0 });
  const [isSharing, setIsSharing] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const peerConnectionRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    const queueRef = ref(database, `screenShareQueue/${userId}`);
    const unsubQueue = onValue(queueRef, (snapshot) => {
      const data = snapshot.val();
      setQueueStatus(data);
      
      if (data && data.status === 'active' && !isSharing) {
        startScreenShare();
      } else if (!data && isSharing) {
        stopScreenShare();
      }
    });

    const fahmyRef = ref(database, 'adminSessions/fahmy');
    const ewisRef = ref(database, 'adminSessions/ewis');
    
    const unsubFahmy = onValue(fahmyRef, (snapshot) => {
      setAdminSessions(prev => ({ ...prev, fahmy: snapshot.val() }));
    });
    
    const unsubEwis = onValue(ewisRef, (snapshot) => {
      setAdminSessions(prev => ({ ...prev, ewis: snapshot.val() }));
    });

    // Listen to all queue to count waiting users per admin
    const allQueueRef = ref(database, 'screenShareQueue');
    const unsubAllQueue = onValue(allQueueRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const counts = { fahmy: 0, ewis: 0 };
        Object.values(data).forEach(item => {
          if (item.status === 'waiting' && item.requestedAdmin) {
            counts[item.requestedAdmin] = (counts[item.requestedAdmin] || 0) + 1;
          }
        });
        setQueueCounts(counts);
      } else {
        setQueueCounts({ fahmy: 0, ewis: 0 });
      }
    });

    return () => {
      unsubQueue();
      unsubFahmy();
      unsubEwis();
      unsubAllQueue();
      stopScreenShare();
    };
  }, [userId]);

  useEffect(() => {
    if (localStream && videoRef.current) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const setupPeerConnection = async () => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    const pc = new RTCPeerConnection(configuration);
    peerConnectionRef.current = pc;

    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        console.log('Sending ICE candidate:', event.candidate);
        await set(ref(database, `webrtc/${userId}/userCandidates/${Date.now()}`), {
          candidate: event.candidate.toJSON()
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('User connection state:', pc.connectionState);
    };

    pc.oniceconnectionstatechange = () => {
      console.log('User ICE connection state:', pc.iceConnectionState);
    };

    // Listen for admin ICE candidates
    const candidatesRef = ref(database, `webrtc/${userId}/adminCandidates`);
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

    // Listen for answer
    const answerRef = ref(database, `webrtc/${userId}/answer`);
    onValue(answerRef, async (snapshot) => {
      const answer = snapshot.val();
      if (answer && answer.sdp) {
        console.log('Received answer from admin:', answer);
        try {
          if (pc.signalingState === 'have-local-offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
            console.log('Remote description set successfully');
          } else {
            console.log('Signaling state:', pc.signalingState);
          }
        } catch (e) {
          console.error('Error setting remote description:', e);
        }
      }
    });

    return pc;
  };

  const startScreenShare = async () => {
    try {
      console.log('Starting screen share...');
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { 
          mediaSource: 'screen',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      setLocalStream(stream);
      setIsSharing(true);

      console.log('Setting up peer connection...');
      const pc = await setupPeerConnection();
      
      stream.getTracks().forEach(track => {
        console.log('Adding track:', track.kind);
        pc.addTrack(track, stream);
      });

      console.log('Creating offer...');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      console.log('Sending offer to admin:', offer);
      await set(ref(database, `webrtc/${userId}/offer`), {
        type: offer.type,
        sdp: offer.sdp
      });

      stream.getVideoTracks()[0].onended = () => {
        console.log('Screen share ended by user');
        stopScreenShare();
      };
    } catch (error) {
      console.error('Error starting screen share:', error);
      setIsSharing(false);
    }
  };

  const stopScreenShare = async () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    setIsSharing(false);
    
    try {
      await remove(ref(database, `webrtc/${userId}`));
    } catch (error) {
      console.error('Error cleaning up:', error);
    }
  };

  const joinQueue = async (adminName, segmentId, participants) => {
    try {
      await set(ref(database, `screenShareQueue/${userId}`), {
        userName,
        joinTime: Date.now(),
        status: 'waiting',
        requestedAdmin: adminName,
        segmentId: segmentId || null,
        teammates: participants || []
      });
      setSelectedAdmin(adminName);
    } catch (error) {
      console.error('Error joining queue:', error);
    }
  };

  const leaveQueue = async () => {
    try {
      await remove(ref(database, `screenShareQueue/${userId}`));
      setSelectedAdmin(null);
      stopScreenShare();
    } catch (error) {
      console.error('Error leaving queue:', error);
    }
  };

  if (queueStatus && queueStatus.status === 'active') {
    return (
      <Card className="glass-effect border-green-500/50 relative">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-500">
            <CheckCircle2 className="w-5 h-5" />
            جلسة نشطة مع {queueStatus.adminName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-black rounded-lg overflow-hidden aspect-video">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-sm text-white font-medium">مشاركة الشاشة نشطة</span>
            </div>
            <Button onClick={leaveQueue} variant="destructive" size="sm">
              <VideoOff className="w-4 h-4 mr-2" />
              إنهاء
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (queueStatus && queueStatus.status === 'waiting') {
    const adminName = queueStatus.requestedAdmin;
    const displayName = adminName === 'fahmy' ? 'Fahmy' : 'Ewis';
    const waitingCount = queueCounts[adminName] || 0;
    
    // Calculate position in queue
    const allQueueRef = ref(database, 'screenShareQueue');
    let myPosition = 1;
    
    return (
      <Card className="glass-effect border-primary/50 relative">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="relative w-16 h-16 mx-auto">
              <img 
                src={`/${displayName}.jpg`}
                alt={displayName}
                className="w-full h-full rounded-full object-cover border-2 border-primary"
              />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full border-2 border-background flex items-center justify-center">
                <Loader2 className="w-3 h-3 animate-spin text-black" />
              </div>
            </div>
            <div>
              <p className="font-semibold text-lg text-white">في الانتظار...</p>
              <p className="text-sm text-gray-400">
                طلبك مع {displayName}
              </p>
              {waitingCount > 1 && (
                <Badge className="mt-2 bg-primary/20 text-primary border border-primary/30">
                  {waitingCount} في الطابور
                </Badge>
              )}
            </div>
            <Button onClick={leaveQueue} variant="outline" size="sm">
              إلغاء الطلب
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-effect relative">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="w-5 h-5 text-primary" />
          طلب مشاركة الشاشة
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 relative">
          {['fahmy', 'ewis'].map((adminName) => {
            const session = adminSessions[adminName];
            const isAvailable = !session;
            const displayName = adminName === 'fahmy' ? 'Fahmy' : 'Ewis';
            const waitingCount = queueCounts[adminName] || 0;

            return (
              <div key={adminName} className="space-y-3">
                <div className="text-center p-4 luxury-gradient rounded-lg relative">
                  {waitingCount > 0 && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-primary/20 text-primary border border-primary/30">
                        {waitingCount} في الانتظار
                      </Badge>
                    </div>
                  )}
                  <div className="relative w-20 h-20 mx-auto mb-3">
                    <img 
                      src={`/${displayName}.jpg`}
                      alt={displayName}
                      className="w-full h-full rounded-full object-cover border-2 border-primary"
                    />
                    {isAvailable ? (
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-background flex items-center justify-center">
                        <Video className="w-3 h-3 text-white" />
                      </div>
                    ) : (
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-red-500 rounded-full border-2 border-background flex items-center justify-center">
                        <VideoOff className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <p className="font-semibold text-primary">
                    {displayName}
                  </p>
                  <Badge variant={isAvailable ? 'default' : 'secondary'} className="mt-2">
                    {isAvailable ? 'متاح' : 'مشغول'}
                  </Badge>
                  {session && (
                    <p className="text-xs text-gray-400 mt-2">
                      في جلسة مع {session.userName}
                    </p>
                  )}
                </div>
                <Button
                  onClick={() => joinQueue(adminName, segmentId, participants)}
                  className="w-full gold-gradient text-black font-semibold"
                  size="sm"
                >
                  <Video className="w-4 h-4 mr-2" />
                  {isAvailable ? 'طلب الآن' : 'انضم للطابور'}
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
