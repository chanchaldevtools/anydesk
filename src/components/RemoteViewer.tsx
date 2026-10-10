import React, { useRef, useEffect, useState } from 'react';
import {
  Maximize,
  Minimize,
  Camera,
  Volume2,
  VolumeX,
  PhoneOff,
  Activity,
  MessageSquare,
  Crosshair,
  PenTool,
  Trash2,
  ShieldCheck,
  Expand,
  Tv,
} from 'lucide-react';
import { WebRTCStats, LaserPointer, AnnotationStroke, AnnotationPoint } from '../types';

interface RemoteViewerProps {
  remoteStream: MediaStream | null;
  targetDeskId: string;
  stats: WebRTCStats | null;
  lang: 'en' | 'hi';
  onEndSession: () => void;
  onSendLaserPointer: (laser: LaserPointer) => void;
  onSendAnnotation: (stroke: AnnotationStroke) => void;
  onClearAnnotations: () => void;
  onToggleChat: () => void;
  unreadChatCount: number;
  remoteLaser: LaserPointer | null;
  annotations: AnnotationStroke[];
}

export const RemoteViewer: React.FC<RemoteViewerProps> = ({
  remoteStream,
  targetDeskId,
  stats,
  lang,
  onEndSession,
  onSendLaserPointer,
  onSendAnnotation,
  onClearAnnotations,
  onToggleChat,
  unreadChatCount,
  remoteLaser,
  annotations,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [activeTool, setActiveTool] = useState<'none' | 'laser' | 'pen'>('laser');
  const [drawColor, setDrawColor] = useState('#EF4444');
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<AnnotationPoint[]>([]);
  const [videoFit, setVideoFit] = useState<'contain' | 'cover'>('contain');

  // Bind media stream
  useEffect(() => {
    if (videoRef.current && remoteStream) {
      videoRef.current.srcObject = remoteStream;
      videoRef.current.play().catch((e) => console.warn('Video play error:', e));
    }
  }, [remoteStream]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFs = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFs);
    return () => document.removeEventListener('fullscreenchange', handleFs);
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => console.warn(err));
    } else {
      document.exitFullscreen().catch((err) => console.warn(err));
    }
  };

  const handleCaptureScreenshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1920;
    canvas.height = video.videoHeight || 1080;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `Desk-${targetDeskId}-snapshot-${Date.now()}.png`;
      a.click();
    }
  };

  // Canvas drawing / laser tracking
  const getRelativeCoords = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return { x: 0, y: 0 };
    const rect = videoRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    return {
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const coords = getRelativeCoords(e);

    if (activeTool === 'laser') {
      onSendLaserPointer({
        x: coords.x,
        y: coords.y,
        active: true,
        color: '#EF4444',
        senderName: 'Viewer',
      });
    } else if (activeTool === 'pen' && isDrawing) {
      setCurrentStroke((prev) => [...prev, coords]);
    }
  };

  const handleMouseLeave = () => {
    if (activeTool === 'laser') {
      onSendLaserPointer({
        x: 0,
        y: 0,
        active: false,
        color: '#EF4444',
        senderName: 'Viewer',
      });
    }
    if (isDrawing) {
      finishDrawing();
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool === 'pen') {
      setIsDrawing(true);
      const coords = getRelativeCoords(e);
      setCurrentStroke([coords]);
    }
  };

  const handleMouseUp = () => {
    if (activeTool === 'pen' && isDrawing) {
      finishDrawing();
    }
  };

  const finishDrawing = () => {
    setIsDrawing(false);
    if (currentStroke.length > 1) {
      onSendAnnotation({
        id: Math.random().toString(36).substring(2, 9),
        color: drawColor,
        points: currentStroke,
      });
    }
    setCurrentStroke([]);
  };

  // Render annotations on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !videoRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.parentElement?.clientWidth || 800;
    canvas.height = canvas.parentElement?.clientHeight || 600;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const renderStroke = (pts: AnnotationPoint[], color: string) => {
      if (pts.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const firstX = (pts[0].x / 100) * canvas.width;
      const firstY = (pts[0].y / 100) * canvas.height;
      ctx.moveTo(firstX, firstY);

      for (let i = 1; i < pts.length; i++) {
        const x = (pts[i].x / 100) * canvas.width;
        const y = (pts[i].y / 100) * canvas.height;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    // Render saved annotations
    annotations.forEach((stroke) => {
      renderStroke(stroke.points, stroke.color);
    });

    // Render active stroke
    if (currentStroke.length > 0) {
      renderStroke(currentStroke, drawColor);
    }
  }, [annotations, currentStroke, drawColor]);

  const formattedDeskId = targetDeskId.replace(
    /(\d{3})(\d{3})(\d{3})/,
    '$1 $2 $3'
  );

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col h-[calc(100vh-5rem)] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl select-none"
    >
      {/* Top Session Bar */}
      <div className="bg-slate-900/90 backdrop-blur-md px-4 py-2.5 border-b border-slate-800 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              {lang === 'hi' ? 'लाइव स्क्रीन व्यू' : 'LIVE SCREEN VIEW'}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 font-mono text-xs text-slate-300">
            <span className="text-slate-400">Desk:</span>
            <span className="font-bold text-white tracking-widest">{formattedDeskId}</span>
          </div>

          <div className="hidden md:flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>End-to-End Encrypted (DTLS-SRTP)</span>
          </div>
        </div>

        {/* Top Right Tool Actions */}
        <div className="flex items-center gap-2">
          {/* Stats Toggle */}
          <button
            onClick={() => setShowStats(!showStats)}
            className={`p-1.5 rounded-lg text-xs flex items-center gap-1 border transition-colors ${
              showStats
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title="Connection Diagnostics"
          >
            <Activity className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Stats</span>
          </button>

          {/* Chat Toggle */}
          <button
            onClick={onToggleChat}
            className="relative p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs flex items-center gap-1 transition-colors"
            title="Session Chat"
          >
            <MessageSquare className="w-3.5 h-3.5 text-teal-400" />
            <span className="hidden sm:inline">{lang === 'hi' ? 'चैट' : 'Chat'}</span>
            {unreadChatCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                {unreadChatCount}
              </span>
            )}
          </button>

          {/* End Session Button */}
          <button
            onClick={onEndSession}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-950/40 transition-colors cursor-pointer"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span>{lang === 'hi' ? 'समाप्त करें' : 'Disconnect'}</span>
          </button>
        </div>
      </div>

      {/* Main Video & Interactive Canvas Container */}
      <div
        className="relative flex-1 bg-black overflow-hidden flex items-center justify-center cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isMuted}
          className={`w-full h-full ${
            videoFit === 'contain' ? 'object-contain' : 'object-cover'
          }`}
        />

        {/* Overlay Drawing Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none z-10 w-full h-full"
        />

        {/* Laser Pointer Beacon if active */}
        {remoteLaser && remoteLaser.active && (
          <div
            className="absolute pointer-events-none z-20 transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-75"
            style={{
              left: `${remoteLaser.x}%`,
              top: `${remoteLaser.y}%`,
            }}
          >
            <div className="relative flex items-center justify-center">
              <span className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-rose-400 opacity-75" />
              <div className="w-4 h-4 rounded-full bg-rose-500 border-2 border-white shadow-lg shadow-rose-500/80" />
              <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-rose-600 text-[10px] text-white font-bold px-1.5 py-0.5 rounded shadow">
                {remoteLaser.senderName}
              </div>
            </div>
          </div>
        )}

        {/* On-screen WebRTC Diagnostics Floating Box */}
        {showStats && stats && (
          <div className="absolute top-4 left-4 z-20 p-3 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-[11px] font-mono text-slate-300 shadow-xl space-y-1">
            <div className="flex items-center justify-between gap-4 font-bold text-white border-b border-slate-800 pb-1">
              <span>WebRTC Direct P2P</span>
              <span className="text-emerald-400">Connected</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Latency / RTT:</span>
              <span className="text-teal-400 font-bold">{stats.rttMs} ms</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Resolution:</span>
              <span className="text-white">{stats.resolution}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Frame Rate:</span>
              <span className="text-white">{stats.fps} FPS</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Bitrate:</span>
              <span className="text-white">{stats.bitrateKbps} kbps</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Video Codec:</span>
              <span className="text-amber-400">{stats.codec}</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Floating Control Bar (AnyDesk Style) */}
      <div className="bg-slate-900/95 backdrop-blur-md px-4 py-2 border-t border-slate-800 flex items-center justify-between z-20 flex-wrap gap-2">
        {/* Assistance / Guidance Tools (Laser Pointer, Pen Highlighter) */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTool(activeTool === 'laser' ? 'none' : 'laser')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTool === 'laser'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Laser Pointer (Guide without controlling)"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {lang === 'hi' ? 'लेजर पॉइंटर' : 'Laser Pointer'}
            </span>
          </button>

          <button
            onClick={() => setActiveTool(activeTool === 'pen' ? 'none' : 'pen')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTool === 'pen'
                ? 'bg-amber-500 text-black shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Pen Highlighter"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {lang === 'hi' ? 'हाइलाइटर' : 'Highlighter'}
            </span>
          </button>

          {activeTool === 'pen' && (
            <div className="flex items-center gap-1 px-1">
              {['#EF4444', '#F59E0B', '#10B981', '#3B82F6'].map((c) => (
                <button
                  key={c}
                  onClick={() => setDrawColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-4 h-4 rounded-full transition-transform ${
                    drawColor === c ? 'scale-125 ring-2 ring-white' : 'opacity-70'
                  }`}
                />
              ))}
            </div>
          )}

          {annotations.length > 0 && (
            <button
              onClick={onClearAnnotations}
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
              title="Clear Markings"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* View / Media Controls */}
        <div className="flex items-center gap-1.5">
          {/* Fit Toggle */}
          <button
            onClick={() =>
              setVideoFit(videoFit === 'contain' ? 'cover' : 'contain')
            }
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title={videoFit === 'contain' ? 'Fit to Screen' : 'Fill Screen'}
          >
            <Tv className="w-4 h-4" />
          </button>

          {/* Screenshot Capture */}
          <button
            onClick={handleCaptureScreenshot}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title={lang === 'hi' ? 'स्क्रीनशॉट लें' : 'Capture Snapshot'}
          >
            <Camera className="w-4 h-4" />
          </button>

          {/* Audio Mute/Unmute */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize className="w-4 h-4" />
            ) : (
              <Maximize className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
