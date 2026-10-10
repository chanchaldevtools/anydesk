import React, { useEffect, useRef, useState } from 'react';
import {
  StopCircle,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  MessageSquare,
  ShieldCheck,
  Radio,
  Clock,
  Layers,
  Crosshair,
} from 'lucide-react';
import { LaserPointer, WebRTCStats } from '../types';

interface SharerControlsProps {
  localStream: MediaStream | null;
  targetDeskId: string;
  lang: 'en' | 'hi';
  onStopSharing: () => void;
  onToggleAudio: (muted: boolean) => void;
  onToggleVideo: (paused: boolean) => void;
  onToggleChat: () => void;
  unreadChatCount: number;
  viewerLaser: LaserPointer | null;
  stats: WebRTCStats | null;
}

export const SharerControls: React.FC<SharerControlsProps> = ({
  localStream,
  targetDeskId,
  lang,
  onStopSharing,
  onToggleAudio,
  onToggleVideo,
  onToggleChat,
  unreadChatCount,
  viewerLaser,
  stats,
}) => {
  const previewRef = useRef<HTMLVideoElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [elapsedSecs, setElapsedSecs] = useState(0);

  useEffect(() => {
    if (previewRef.current && localStream) {
      previewRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSecs((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const formattedDeskId = targetDeskId.replace(
    /(\d{3})(\d{3})(\d{3})/,
    '$1 $2 $3'
  );

  const handlePause = () => {
    const next = !isPaused;
    setIsPaused(next);
    onToggleVideo(!next); // if paused, video enabled = false
  };

  const handleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    onToggleAudio(!next);
  };

  return (
    <div className="space-y-6">
      {/* Active Streaming Alert Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-950/40 via-slate-900 to-rose-950/30 border-2 border-rose-500/50 p-6 shadow-2xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold text-xs uppercase tracking-wider border border-rose-500/30">
                {lang === 'hi' ? 'लाइव स्क्रीन शेयर जारी है' : 'SCREEN BROADCAST LIVE'}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTime(elapsedSecs)}</span>
              </div>
            </div>

            <h2 className="text-xl font-extrabold text-white">
              {lang === 'hi'
                ? `Desk [${formattedDeskId}] आपकी स्क्रीन देख रहा है`
                : `Sharing Screen with Desk [${formattedDeskId}]`}
            </h2>

            <p className="text-xs text-slate-300 max-w-xl">
              {lang === 'hi'
                ? 'सुरक्षा नोट: रिमोट यूजर केवल आपकी स्क्रीन देख सकता है. वह आपके माउस या कीबोर्ड को नहीं छू सकता. शेयरिंग बंद करने के लिए नीचे दिया गया लाल बटन दबाएं.'
                : 'Security Note: The remote user only has visual viewing access. They cannot control your mouse or type. You can revoke access immediately at any moment.'}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Privacy Pause / Shield */}
            <button
              onClick={handlePause}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-colors cursor-pointer ${
                isPaused
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
              title="Pause transmission for privacy"
            >
              {isPaused ? (
                <>
                  <EyeOff className="w-4 h-4 text-amber-400" />
                  <span>{lang === 'hi' ? 'पॉज़ हटाएँ' : 'Resume Stream'}</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 text-slate-400" />
                  <span>{lang === 'hi' ? 'प्राइवेसी पॉज़' : 'Pause Stream'}</span>
                </>
              )}
            </button>

            {/* Audio Mute */}
            <button
              onClick={handleMute}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-colors cursor-pointer ${
                isMuted
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-4 h-4 text-rose-400" />
                  <span>{lang === 'hi' ? 'ऑडियो म्यूट' : 'Muted'}</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  <span>{lang === 'hi' ? 'ऑडियो ऑन' : 'Audio On'}</span>
                </>
              )}
            </button>

            {/* In-session Chat */}
            <button
              onClick={onToggleChat}
              className="relative px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-teal-400" />
              <span>{lang === 'hi' ? 'चैट' : 'Chat'}</span>
              {unreadChatCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                  {unreadChatCount}
                </span>
              )}
            </button>

            {/* STOP SHARING - Primary Big Red Button */}
            <button
              onClick={onStopSharing}
              className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-sm flex items-center gap-2 shadow-lg shadow-rose-950/50 transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <StopCircle className="w-5 h-5 text-white animate-pulse" />
              <span>{lang === 'hi' ? 'स्क्रीन शेयरिंग बंद करें' : 'Stop Sharing'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Broadcast Preview & Remote Viewer Activity Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Local Stream Preview */}
        <div className="md:col-span-2 rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <Layers className="w-4 h-4 text-rose-500" />
              <span>{lang === 'hi' ? 'आपकी स्क्रीन का लाइव प्रीव्यू' : 'Your Live Screen Preview'}</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              {stats?.resolution || '1080p'} • {stats?.fps || 30} FPS
            </span>
          </div>

          <div className="relative aspect-video rounded-xl bg-black overflow-hidden border border-slate-800 flex items-center justify-center">
            <video
              ref={previewRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain"
            />
            {isPaused && (
              <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center text-amber-400 gap-2">
                <EyeOff className="w-8 h-8" />
                <span className="text-xs font-bold">
                  {lang === 'hi' ? 'स्क्रीन शेयरिंग पॉज़ की गई है' : 'Stream Paused for Privacy'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Remote Viewer Radar / Activity Panel */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Crosshair className="w-4 h-4 text-rose-400" />
              <span>{lang === 'hi' ? 'रिमोट दर्शक गतिविधि' : 'Viewer Activity'}</span>
            </h4>

            {viewerLaser && viewerLaser.active ? (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-1">
                <div className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span>{lang === 'hi' ? 'दर्शक स्क्रीन पर पॉइंट कर रहा है' : 'Viewer is Pointing'}</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Coordinates: X: {Math.round(viewerLaser.x)}%, Y: {Math.round(viewerLaser.y)}%
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-500">
                {lang === 'hi'
                  ? 'रिमोट दर्शक अभी स्क्रीन पर कुछ इंगित नहीं कर रहा है.'
                  : 'Remote viewer is currently observing without laser pointing.'}
              </div>
            )}

            <div className="space-y-2 pt-2 border-t border-slate-800 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Security Cipher:</span>
                <span className="text-emerald-400 font-mono">AES-128 GCM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Connection:</span>
                <span className="text-white font-mono">WebRTC P2P</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Viewer Control:</span>
                <span className="text-teal-400 font-bold">None (View-Only)</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            <span>
              {lang === 'hi'
                ? 'आप कभी भी ब्राउज़र के फ्लोटिंग बार या ऊपर लाल बटन से शेयरिंग रोक सकते हैं.'
                : 'Full host sovereignty: Stop sharing anytime with zero delay.'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
