import React, { useEffect, useRef, useState } from 'react';
import { db, auth } from '../lib/firebase';
import { doc, collection, addDoc, onSnapshot, setDoc, updateDoc, query, getDocs } from 'firebase/firestore';
import { PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';

interface CallViewProps {
  chatId: string;
  participants: string[];
  isVideo: boolean;
  onEndCall: () => void;
}

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

export function CallView({ chatId, participants, isVideo, onEndCall }: CallViewProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(!isVideo);
  const [status, setStatus] = useState('Connecting...');
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  
  const currentUser = auth.currentUser;

  useEffect(() => {
    let unsubs: (() => void)[] = [];
    
    const initCall = async () => {
      if (!currentUser) return;
      
      const pc = new RTCPeerConnection(servers);
      pcRef.current = pc;
      
      const rStream = new MediaStream();
      setRemoteStream(rStream);
      
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = rStream;
      }
      
      pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          rStream.addTrack(track);
        });
      };
      
      try {
        const lStream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true });
        setLocalStream(lStream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = lStream;
        }
        lStream.getTracks().forEach((track) => {
          pc.addTrack(track, lStream);
        });
      } catch (err) {
        console.error('Failed to get local media', err);
        setStatus('Failed to access microphone/camera');
        return;
      }

      // Check if there is an ongoing call in this chat
      const callDocRef = doc(db, 'calls', chatId);
      const callCandidatesCollection = collection(callDocRef, 'offerCandidates');
      const answerCandidatesCollection = collection(callDocRef, 'answerCandidates');
      
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          // Are we caller or callee? We need to know.
          // Let's implement a simple lock mechanism.
        }
      };
      
      // Let's see if a call document exists and has a pending offer
      // Since this is a simple 1-1, we'll try to become the caller if no offer exists, otherwise callee.
      const unsubscribe = onSnapshot(callDocRef, async (snapshot) => {
        const data = snapshot.data();
        
        if (!data || !data.offer) {
          // We are caller
          setStatus('Waiting for friend to join...');
          
          pc.onicecandidate = (event) => {
            if (event.candidate) addDoc(callCandidatesCollection, event.candidate.toJSON());
          };
          
          const offerDescription = await pc.createOffer();
          await pc.setLocalDescription(offerDescription);
          
          await setDoc(callDocRef, {
            offer: {
              type: offerDescription.type,
              sdp: offerDescription.sdp,
            },
            participants: participants,
          }, { merge: true });
          
          unsubs.push(onSnapshot(callDocRef, (docSnap) => {
            const currentData = docSnap.data();
            if (currentData?.answer && !pc.currentRemoteDescription) {
              const answerDescription = new RTCSessionDescription(currentData.answer);
              pc.setRemoteDescription(answerDescription);
              setStatus('Connected');
            }
          }));
          
          unsubs.push(onSnapshot(answerCandidatesCollection, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
              if (change.type === 'added') {
                const candidate = new RTCIceCandidate(change.doc.data());
                pc.addIceCandidate(candidate);
              }
            });
          }));
        } else if (data.offer && !data.answer) {
          // We are callee
          setStatus('Joining call...');
          
          pc.onicecandidate = (event) => {
            if (event.candidate) addDoc(answerCandidatesCollection, event.candidate.toJSON());
          };
          
          const offerDescription = new RTCSessionDescription(data.offer);
          await pc.setRemoteDescription(offerDescription);
          
          const answerDescription = await pc.createAnswer();
          await pc.setLocalDescription(answerDescription);
          
          await updateDoc(callDocRef, {
            answer: {
              type: answerDescription.type,
              sdp: answerDescription.sdp,
            }
          });
          setStatus('Connected');
          
          unsubs.push(onSnapshot(callCandidatesCollection, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
              if (change.type === 'added') {
                const candidate = new RTCIceCandidate(change.doc.data());
                pc.addIceCandidate(candidate);
              }
            });
          }));
        }
      });
      unsubs.push(unsubscribe);
    };

    initCall();
    
    return () => {
      unsubs.forEach(u => u());
      if (pcRef.current) pcRef.current.close();
      if (localStream) localStream.getTracks().forEach(t => t.stop());
    };
  }, []);

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!localStream.getAudioTracks()[0].enabled);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!localStream.getVideoTracks()[0]?.enabled);
    }
  };

  const endCall = async () => {
    // Cleanup DB
    try {
      await updateDoc(doc(db, 'calls', chatId), {
        offer: null,
        answer: null
      });
    } catch(e) {}
    onEndCall();
  };

  return (
    <div className="flex-1 bg-neutral-900 text-white flex flex-col items-center justify-center relative p-8">
      <div className="absolute top-8 left-8">
        <h2 className="text-xl font-medium">{status}</h2>
      </div>
      
      <div className="relative w-full max-w-4xl aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10">
        <video 
          ref={remoteVideoRef} 
          autoPlay 
          playsInline 
          className="w-full h-full object-cover"
        />
        
        {/* PIP Local Video */}
        <div className="absolute bottom-6 right-6 w-48 aspect-video bg-neutral-800 rounded-xl overflow-hidden shadow-xl ring-2 ring-neutral-700/50">
          <video 
            ref={localVideoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover"
          />
        </div>
      </div>
      
      {/* Controls */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-neutral-800/80 backdrop-blur-md px-6 py-4 rounded-full ring-1 ring-white/10">
        <button 
          onClick={toggleMute}
          className={`p-4 rounded-full transition-colors ${isMuted ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-neutral-700 hover:bg-neutral-600 text-white'}`}
        >
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>
        
        {isVideo && (
          <button 
            onClick={toggleVideo}
            className={`p-4 rounded-full transition-colors ${isVideoOff ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-neutral-700 hover:bg-neutral-600 text-white'}`}
          >
            {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
          </button>
        )}
        
        <button 
          onClick={endCall}
          className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors ml-4 shadow-lg shadow-red-500/20"
        >
          <PhoneOff size={24} />
        </button>
      </div>
    </div>
  );
}
