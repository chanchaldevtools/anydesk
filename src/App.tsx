import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { DeskConnectionPanel } from './components/DeskConnectionPanel';
import { IncomingRequestModal } from './components/IncomingRequestModal';
import { RemoteViewer } from './components/RemoteViewer';
import { SharerControls } from './components/SharerControls';
import { SessionChat } from './components/SessionChat';
import { PusherConfigModal } from './components/PusherConfigModal';
import { SecurityGuideModal } from './components/SecurityGuideModal';
import { signalingService } from './services/signaling';
import { webrtcManager } from './services/webrtc';
import {
  DeskInfo,
  IncomingRequest,
  SessionRole,
  ConnectionMode,
  WebRTCStats,
  ChatMessage,
  LaserPointer,
  AnnotationStroke,
  PusherConfig,
} from './types';
import { sounds } from './utils/audio';

function getOrCreateDeskId(): string {
  const stored = sessionStorage.getItem('anydesk_self_desk_id');
  if (stored) return stored;
  // Generate random 9-digit ID
  const newId = Math.floor(100000000 + Math.random() * 900000000).toString();
  sessionStorage.setItem('anydesk_self_desk_id', newId);
  return newId;
}

export default function App() {
  const [deskId] = useState<string>(getOrCreateDeskId);
  const [deskName, setDeskName] = useState<string>(() => {
    return localStorage.getItem('anydesk_user_name') || `Desk-${deskId.slice(-4)}`;
  });

  const [lang, setLang] = useState<'en' | 'hi'>('hi');
  const [isSignalingConnected, setIsSignalingConnected] = useState(false);
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>(() => signalingService.getMode());
  const [onlineDesks, setOnlineDesks] = useState<DeskInfo[]>([]);

  // Session State
  const [sessionRole, setSessionRole] = useState<SessionRole>('idle');
  const [activePartnerId, setActivePartnerId] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Streams & Diagnostics
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [stats, setStats] = useState<WebRTCStats | null>(null);
  const [includeAudio, setIncludeAudio] = useState(true);

  // Modals
  const [incomingRequest, setIncomingRequest] = useState<IncomingRequest | null>(null);
  const [isPusherModalOpen, setIsPusherModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [pusherConfig, setPusherConfig] = useState<PusherConfig | null>(
    signalingService.getPusherConfig()
  );

  // In-session interactivity
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [laserPointer, setLaserPointer] = useState<LaserPointer | null>(null);
  const [annotations, setAnnotations] = useState<AnnotationStroke[]>([]);

  // Initialize WebRTC and Signaling listeners
  useEffect(() => {
    // Check URL search parameters for desk ID invite
    const params = new URLSearchParams(window.location.search);
    const inviteDesk = params.get('desk');
    if (inviteDesk && inviteDesk !== deskId) {
      setStatusMessage(
        lang === 'hi'
          ? `लिंक से डेस्क ID [${inviteDesk}] लोड किया गया`
          : `Loaded Desk ID [${inviteDesk}] from invite link`
      );
    }

    // Connect signaling
    signalingService.connect(deskId, deskName);
    webrtcManager.initSignalingListeners();

    // Setup WebRTC callbacks
    webrtcManager.onLocalStream = (stream) => {
      setLocalStream(stream);
    };

    webrtcManager.onRemoteStream = (stream) => {
      setRemoteStream(stream);
      setSessionRole('viewer');
      setIsConnecting(false);
      sounds.playConnected();
    };

    webrtcManager.onStatsUpdate = (s) => {
      setStats(s);
    };

    webrtcManager.onSessionEnded = () => {
      handleTeardownSession();
      setStatusMessage(
        lang === 'hi' ? 'रिमोट सेशन समाप्त हो गया.' : 'Remote session ended.'
      );
    };

    webrtcManager.onDataChannelMessage = (data) => {
      handleIncomingDataMessage(data);
    };

    // Setup signaling event handlers
    const unsubStatus = signalingService.on('status-change', (connected, mode) => {
      setIsSignalingConnected(connected);
      setConnectionMode(mode);
    });

    const unsubOnline = signalingService.on('online-desks', (desks) => {
      setOnlineDesks(desks);
    });

    const unsubIncoming = signalingService.on('incoming-connection-request', (req) => {
      // Show explicit permission modal to the host!
      setIncomingRequest(req);
    });

    const unsubResponse = signalingService.on('connection-response', (res) => {
      if (res.accepted) {
        setStatusMessage(
          lang === 'hi'
            ? 'होस्ट ने अनुमति दे दी! स्क्रीन स्ट्रीम शुरू हो रही है...'
            : 'Host accepted! Receiving live stream...'
        );
        webrtcManager.prepareViewer(res.fromDeskId);
        setActivePartnerId(res.fromDeskId);
      } else {
        setIsConnecting(false);
        setStatusMessage(
          lang === 'hi'
            ? `अनुरोध अस्वीकार: ${res.reason || 'होस्ट ने अनुमति नहीं दी'}`
            : `Request declined: ${res.reason || 'Host rejected permission'}`
        );
      }
    });

    const unsubUnavailable = signalingService.on('target-unavailable', (data) => {
      setIsConnecting(false);
      setStatusMessage(
        lang === 'hi'
          ? `डेस्क [${data.targetDeskId}] ऑनलाइन नहीं है.`
          : `Desk [${data.targetDeskId}] is currently offline.`
      );
    });

    const unsubSignal = signalingService.on('signal', (data) => {
      if (data.signalData?.type === 'datachannel-fallback') {
        handleIncomingDataMessage(data.signalData.payload);
      }
    });

    const unsubError = signalingService.on('error', (err) => {
      setStatusMessage(`Signaling: ${err}`);
    });

    return () => {
      unsubStatus();
      unsubOnline();
      unsubIncoming();
      unsubResponse();
      unsubUnavailable();
      unsubSignal();
      unsubError();
      webrtcManager.close();
      signalingService.disconnect();
    };
  }, [deskId]);

  const handleIncomingDataMessage = (data: any) => {
    if (!data) return;
    if (data.type === 'laser') {
      setLaserPointer(data.laser);
    } else if (data.type === 'annotation') {
      setAnnotations((prev) => [...prev, data.stroke]);
    } else if (data.type === 'clear-annotations') {
      setAnnotations([]);
    } else if (data.type === 'chat') {
      const newMsg: ChatMessage = {
        id: data.id || Math.random().toString(),
        senderDeskId: data.senderDeskId,
        senderName: data.senderName,
        text: data.text,
        timestamp: data.timestamp || Date.now(),
        isSelf: false,
      };
      setMessages((prev) => [...prev, newMsg]);
      sounds.playMessage();
      if (!isChatOpen) {
        setUnreadCount((c) => c + 1);
      }
    }
  };

  const handleTeardownSession = () => {
    setSessionRole('idle');
    setActivePartnerId('');
    setIsConnecting(false);
    setLocalStream(null);
    setRemoteStream(null);
    setLaserPointer(null);
    setAnnotations([]);
  };

  // User initiates connection request to view remote screen
  const handleRequestConnect = (targetDeskId: string) => {
    if (!isSignalingConnected) {
      setStatusMessage(
        lang === 'hi' ? 'सिग्नलिंग सर्वर कनेक्टेड नहीं है' : 'Signaling server offline'
      );
      return;
    }
    setIsConnecting(true);
    setStatusMessage(
      lang === 'hi'
        ? `Desk [${targetDeskId}] पर अनुमति का अनुरोध भेजा गया...`
        : `Sent viewing request to Desk [${targetDeskId}]...`
    );
    signalingService.requestConnection(targetDeskId);
  };

  // Host accepts incoming request and triggers native browser screen picker
  const handleAcceptIncoming = async () => {
    if (!incomingRequest) return;
    const requesterId = incomingRequest.fromDeskId;
    setIncomingRequest(null);

    try {
      // Must prompt user for screen capture: navigator.mediaDevices.getDisplayMedia
      const stream = await webrtcManager.startSharing(requesterId, {
        audio: includeAudio,
      });

      setLocalStream(stream);
      setSessionRole('sharer');
      setActivePartnerId(requesterId);
      signalingService.respondToConnection(requesterId, true);
      sounds.playConnected();
    } catch (err: any) {
      console.warn('Screen selection cancelled or failed:', err);
      signalingService.respondToConnection(
        requesterId,
        false,
        lang === 'hi'
          ? 'होस्ट ने स्क्रीन शेयरिंग कैंसिल कर दी'
          : 'Host cancelled screen capture dialog'
      );
      setStatusMessage(
        lang === 'hi'
          ? 'स्क्रीन चयन रद्द कर दिया गया'
          : 'Screen selection dialog was cancelled'
      );
    }
  };

  const handleRejectIncoming = () => {
    if (!incomingRequest) return;
    signalingService.respondToConnection(
      incomingRequest.fromDeskId,
      false,
      lang === 'hi' ? 'अनुरोध अस्वीकार कर दिया गया' : 'Request declined by host'
    );
    setIncomingRequest(null);
  };

  // Host starts direct share
  const handleDirectShare = async () => {
    try {
      const stream = await webrtcManager.startSharing('broadcast', {
        audio: includeAudio,
      });
      setLocalStream(stream);
      setSessionRole('sharer');
      setActivePartnerId('broadcast');
      sounds.playConnected();
    } catch (err) {
      console.warn('Direct share cancelled:', err);
    }
  };

  const handleStopSharing = () => {
    if (activePartnerId) {
      signalingService.endSession(activePartnerId);
    }
    webrtcManager.close();
    handleTeardownSession();
    setStatusMessage(
      lang === 'hi' ? 'स्क्रीन शेयरिंग रोक दी गई' : 'Screen sharing stopped'
    );
  };

  const handleSendLaserPointer = (laser: LaserPointer) => {
    webrtcManager.sendDataChannelMessage({
      type: 'laser',
      laser,
    });
  };

  const handleSendAnnotation = (stroke: AnnotationStroke) => {
    setAnnotations((prev) => [...prev, stroke]);
    webrtcManager.sendDataChannelMessage({
      type: 'annotation',
      stroke,
    });
  };

  const handleClearAnnotations = () => {
    setAnnotations([]);
    webrtcManager.sendDataChannelMessage({
      type: 'clear-annotations',
    });
  };

  const handleSendMessage = (text: string) => {
    const newMsg: ChatMessage = {
      id: Math.random().toString(),
      senderDeskId: deskId,
      senderName: deskName,
      text,
      timestamp: Date.now(),
      isSelf: true,
    };
    setMessages((prev) => [...prev, newMsg]);

    webrtcManager.sendDataChannelMessage({
      type: 'chat',
      id: newMsg.id,
      senderDeskId: deskId,
      senderName: deskName,
      text,
      timestamp: newMsg.timestamp,
    });
  };

  const handleSavePusherConfig = (config: PusherConfig) => {
    setPusherConfig(config);
    signalingService.setPusherConfig(config);
  };

  const handleSelectMode = (mode: ConnectionMode) => {
    setConnectionMode(mode);
    signalingService.setMode(mode);
  };

  const handleChangeDeskName = (name: string) => {
    setDeskName(name);
    localStorage.setItem('anydesk_user_name', name);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        deskId={deskId}
        isConnected={isSignalingConnected}
        connectionMode={connectionMode}
        lang={lang}
        onToggleLang={() => setLang(lang === 'hi' ? 'en' : 'hi')}
        onOpenPusherModal={() => setIsPusherModalOpen(true)}
        onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
        isInSession={sessionRole !== 'idle'}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {sessionRole === 'viewer' ? (
          /* REMOTE VIEWER VIEW */
          <RemoteViewer
            remoteStream={remoteStream}
            targetDeskId={activePartnerId}
            stats={stats}
            lang={lang}
            onEndSession={handleStopSharing}
            onSendLaserPointer={handleSendLaserPointer}
            onSendAnnotation={handleSendAnnotation}
            onClearAnnotations={handleClearAnnotations}
            onToggleChat={() => {
              setIsChatOpen(!isChatOpen);
              setUnreadCount(0);
            }}
            unreadChatCount={unreadCount}
            remoteLaser={laserPointer}
            annotations={annotations}
          />
        ) : sessionRole === 'sharer' ? (
          /* SHARER (HOST) CONTROLS VIEW */
          <SharerControls
            localStream={localStream}
            targetDeskId={activePartnerId}
            lang={lang}
            onStopSharing={handleStopSharing}
            onToggleAudio={(unmuted) => webrtcManager.toggleLocalAudio(unmuted)}
            onToggleVideo={(unmuted) => webrtcManager.toggleLocalVideo(unmuted)}
            onToggleChat={() => {
              setIsChatOpen(!isChatOpen);
              setUnreadCount(0);
            }}
            unreadChatCount={unreadCount}
            viewerLaser={laserPointer}
            stats={stats}
          />
        ) : (
          /* REGULAR ANYDESK CONNECTION DASHBOARD */
          <DeskConnectionPanel
            deskId={deskId}
            deskName={deskName}
            onChangeDeskName={handleChangeDeskName}
            onlineDesks={onlineDesks}
            lang={lang}
            isConnecting={isConnecting}
            onRequestConnect={handleRequestConnect}
            onDirectShare={handleDirectShare}
            includeAudio={includeAudio}
            onToggleAudio={setIncludeAudio}
            statusMessage={statusMessage}
          />
        )}
      </main>

      {/* Incoming Connection Request Modal (Consent Gate) */}
      {incomingRequest && (
        <IncomingRequestModal
          request={incomingRequest}
          lang={lang}
          onAccept={handleAcceptIncoming}
          onReject={handleRejectIncoming}
        />
      )}

      {/* Pusher Channels & Signaling Configuration Modal */}
      <PusherConfigModal
        isOpen={isPusherModalOpen}
        onClose={() => setIsPusherModalOpen(false)}
        currentMode={connectionMode}
        onSelectMode={handleSelectMode}
        pusherConfig={pusherConfig}
        onSavePusherConfig={handleSavePusherConfig}
        lang={lang}
      />

      {/* Security & Sandbox Explainer Modal */}
      <SecurityGuideModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
        lang={lang}
      />

      {/* In-Session Chat Drawer */}
      <SessionChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={messages}
        onSendMessage={handleSendMessage}
        lang={lang}
      />
    </div>
  );
}
