import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Monitor, Mic, MicOff, MessageSquare, AlertCircle, CheckCircle, XCircle, Send, Paperclip } from 'lucide-react';

// Using a public STUN server for WebRTC
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
};

export default function VerificationRoom({ user, token, refreshUser }) {
  const { transactionId } = useParams();
  const [isConnected, setIsConnected] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('pending'); // pending, verified, refunded
  const [isRefunding, setIsRefunding] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const socketRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    // 1. Initialize Socket
    socketRef.current = io('http://localhost:3001');

    socketRef.current.on('connect', () => {
      setIsConnected(true);
      socketRef.current.emit('join-room', `tx_${transactionId}`);
    });

    socketRef.current.on('user-joined', (userId) => {
      console.log('Other party joined:', userId);
      if (isSharingScreen) {
        initiateCall(userId);
      }
    });

    socketRef.current.on('offer', async (payload) => {
      createPeerConnection(payload.caller);
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);
      socketRef.current.emit('answer', {
        target: payload.caller,
        caller: socketRef.current.id,
        sdp: peerConnectionRef.current.localDescription
      });
    });

    socketRef.current.on('answer', async (payload) => {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
    });

    socketRef.current.on('ice-candidate', async (payload) => {
      try {
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
        }
      } catch (e) {
        console.error('Error adding received ice candidate', e);
      }
    });

    socketRef.current.on('chat-message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [transactionId, isSharingScreen]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const createPeerConnection = (targetId) => {
    peerConnectionRef.current = new RTCPeerConnection(ICE_SERVERS);

    peerConnectionRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('ice-candidate', {
          target: targetId,
          candidate: event.candidate
        });
      }
    };

    peerConnectionRef.current.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        peerConnectionRef.current.addTrack(track, streamRef.current);
      });
    }
  };

  const initiateCall = async (targetId) => {
    createPeerConnection(targetId);
    const offer = await peerConnectionRef.current.createOffer();
    await peerConnectionRef.current.setLocalDescription(offer);
    socketRef.current.emit('offer', {
      target: targetId,
      caller: socketRef.current.id,
      sdp: peerConnectionRef.current.localDescription
    });
  };

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setIsSharingScreen(true);
      
      stream.getVideoTracks()[0].onended = () => {
        setIsSharingScreen(false);
      };

    } catch (err) {
      console.error("Error sharing screen: ", err);
    }
  };

  const handleVerify = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/transactions/${transactionId}/complete`, { 
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if(res.ok) {
        setVerificationStatus('verified');
        await refreshUser();
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch(err) {
      console.error(err);
    }
  };

  const handleRefund = async () => {
    if (!refundReason.trim()) return;
    try {
      const res = await fetch(`http://localhost:3001/api/transactions/${transactionId}/refund`, { 
        method: 'POST', 
        body: JSON.stringify({reason: refundReason}), 
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        } 
      });
      if(res.ok) {
        setIsRefunding(false);
        setVerificationStatus('refunded');
        await refreshUser();
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch(err) {
      console.error(err);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if(!newMessage.trim()) return;
    socketRef.current.emit('chat-message', {
      roomId: `tx_${transactionId}`,
      sender: user.username,
      text: newMessage
    });
    setNewMessage('');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if(!file) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://localhost:3001/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      
      if(res.ok) {
        // Send a message with the file URL
        const markdownLink = data.type.startsWith('image/') 
          ? `![${data.name}](http://localhost:3001${data.url})` 
          : `[Attached File: ${data.name}](http://localhost:3001${data.url})`;
          
        socketRef.current.emit('chat-message', {
          roomId: `tx_${transactionId}`,
          sender: user.username,
          text: markdownLink
        });
      } else {
        alert(data.error);
      }
    } catch(err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const renderMessageContent = (text) => {
    // Basic parser for images
    const imgMatch = text.match(/!\[.*?\]\((.*?)\)/);
    if(imgMatch) {
      return (
        <div className="mt-1">
          <img src={imgMatch[1]} alt="attachment" className="max-w-full rounded-md max-h-48 object-contain" />
        </div>
      )
    }
    
    const linkMatch = text.match(/\[(.*?)\]\((.*?)\)/);
    if(linkMatch) {
      return (
        <a href={linkMatch[2]} target="_blank" rel="noreferrer" className="text-secondary hover:underline underline-offset-2 flex items-center gap-1">
          <Paperclip size={14} /> {linkMatch[1]}
        </a>
      )
    }
    
    return <p>{text}</p>;
  }

  return (
    <div className="h-[80vh] flex flex-col gap-4 relative">
      <div className="flex items-center justify-between bg-surface/50 p-4 rounded-xl border border-gray-700/50">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Verification Room <span className="text-gray-500 font-mono text-sm">#TX-{transactionId}</span>
          </h2>
          <p className="text-sm text-gray-400 mt-1 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-secondary' : 'bg-red-500'}`}></span>
            {isConnected ? 'Connected to signaling server' : 'Connecting...'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={startScreenShare}
            disabled={isSharingScreen}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              isSharingScreen ? 'bg-primary/20 text-primary cursor-default' : 'bg-surface border border-gray-600 hover:bg-gray-700 text-white'
            }`}
          >
            <Monitor size={18} />
            {isSharingScreen ? 'Sharing Screen' : 'Share Screen'}
          </button>
          
          {verificationStatus === 'pending' ? (
            <>
              <button 
                onClick={() => setIsRefunding(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-surface border border-rose-500/50 text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <XCircle size={18} />
                Cancel & Refund
              </button>
              <button 
                onClick={handleVerify}
                className="flex items-center gap-2 px-6 py-2 rounded-lg font-bold bg-secondary hover:bg-secondary/90 text-white shadow-lg shadow-secondary/20 transition-all"
              >
                <CheckCircle size={18} />
                Verify & Release Funds
              </button>
            </>
          ) : verificationStatus === 'verified' ? (
            <div className="flex items-center gap-2 px-6 py-2 rounded-lg font-bold bg-secondary/20 text-secondary border border-secondary/30">
              <CheckCircle size={18} />
              Funds Released
            </div>
          ) : (
            <div className="flex items-center gap-2 px-6 py-2 rounded-lg font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <XCircle size={18} />
              Refunded
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 relative">
        {/* Main Video Area (Remote) */}
        <div className="lg:col-span-3 bg-black rounded-xl border border-gray-800 overflow-hidden relative flex items-center justify-center">
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-contain"
          />
          {!remoteVideoRef.current?.srcObject && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 bg-surface/30">
              <Monitor size={48} className="mb-4 opacity-50" />
              <p>Waiting for the other party to share their screen...</p>
            </div>
          )}
          
          {/* Picture in Picture (Local) */}
          <div className="absolute bottom-4 right-4 w-48 aspect-video bg-gray-900 rounded-lg border border-gray-700 overflow-hidden shadow-2xl">
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover"
            />
            {!isSharingScreen && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-600">
                <Monitor size={24} />
              </div>
            )}
          </div>
        </div>

        {/* Sidebar / Chat Panel */}
        <div className="glass-panel rounded-xl flex flex-col overflow-hidden h-full">
          <div className="p-4 border-b border-gray-700/50 bg-surface">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <MessageSquare size={18} className="text-primary" />
              Chat Zone
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-sm text-gray-500 mt-4">No messages yet. Say hello!</div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.sender === user.username ? 'items-end' : 'items-start'}`}>
                  <span className="text-xs text-gray-500 mb-1">{msg.sender}</span>
                  <div className={`px-3 py-2 rounded-lg max-w-[85%] text-sm ${
                    msg.sender === user.username ? 'bg-primary text-white rounded-tr-none' : 'bg-surface text-gray-200 rounded-tl-none border border-gray-700/50'
                  }`}>
                    {renderMessageContent(msg.text)}
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="p-3 bg-surface/50 border-t border-gray-700/50 flex gap-2 items-center">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
            />
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              title="Attach file"
            >
              <Paperclip size={18} />
            </button>
            <input 
              type="text" 
              placeholder="Type a message..." 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 bg-background border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
            />
            <button 
              type="submit"
              disabled={!newMessage.trim() || uploading}
              className="p-2 bg-primary rounded-lg text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>

      {/* Refund Modal */}
      {isRefunding && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-xl">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md border border-gray-700 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Request Refund</h3>
            <p className="text-gray-400 text-sm mb-4">
              If the software does not meet expectations or has issues, please identify the reason to cancel the escrow and return funds to your balance.
            </p>
            <textarea
              className="w-full bg-surface border border-gray-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 outline-none transition-all mb-4"
              rows="4"
              placeholder="E.g., The software is missing the requested analytics feature, and it crashes on startup."
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
            ></textarea>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setIsRefunding(false)}
                className="px-4 py-2 rounded-lg font-medium text-gray-300 hover:bg-surface transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleRefund}
                disabled={!refundReason.trim()}
                className="px-4 py-2 rounded-lg font-bold bg-rose-500 hover:bg-rose-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Refund
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
