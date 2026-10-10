import React from 'react';
import {
  Monitor,
  Radio,
  ShieldCheck,
  Settings2,
  HelpCircle,
  Languages,
  CheckCircle2,
  Flame,
} from 'lucide-react';
import { ConnectionMode } from '../types';

interface HeaderProps {
  deskId: string;
  isConnected: boolean;
  connectionMode: ConnectionMode;
  lang: 'en' | 'hi';
  onToggleLang: () => void;
  onOpenPusherModal: () => void;
  onOpenSecurityModal: () => void;
  isInSession: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  deskId,
  isConnected,
  connectionMode,
  lang,
  onToggleLang,
  onOpenPusherModal,
  onOpenSecurityModal,
  isInSession,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 shadow-lg shadow-rose-950/40 text-white font-bold">
            <Monitor className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isConnected ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-3 w-3 ${
                  isConnected ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                AnyDesk<span className="text-rose-500 font-black">.Web</span>
              </span>
              <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                P2P WebRTC
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              {lang === 'hi'
                ? 'सुरक्षित लाइव स्क्रीन व्यूअर • बिना अनुमति शेयरिंग संभव नहीं'
                : 'Consent-First Remote Screen Viewer • No Hidden Access'}
            </p>
          </div>
        </div>

        {/* Middle Status Indicators */}
        <div className="hidden md:flex items-center gap-3">
          {/* Security Badge */}
          <button
            onClick={onOpenSecurityModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
            title="Browser Sandbox Security Policy"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>
              {lang === 'hi' ? '100% परमिशन सुरक्षित' : 'Consent-Protected'}
            </span>
          </button>

          {/* Signaling Mode Badge */}
          <button
            onClick={onOpenPusherModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700/80 text-slate-300 border border-slate-700 transition-colors"
          >
            {connectionMode === 'pusher' ? (
              <>
                <Flame className="w-3.5 h-3.5 text-purple-400" />
                <span>Pusher Channels</span>
              </>
            ) : connectionMode === 'cloud-p2p' ? (
              <>
                <Radio className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
                <span>Cloud WebRTC (Vercel Ready)</span>
              </>
            ) : (
              <>
                <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                <span>WebSocket Hub</span>
              </>
            )}
            <Settings2 className="w-3 h-3 text-slate-400 ml-1" />
          </button>

          {/* Current Desk Quick View */}
          {deskId && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md bg-slate-800/60 border border-slate-700/70 font-mono text-slate-300">
              <span className="text-slate-400">Desk:</span>
              <span className="font-bold text-white tracking-wider">
                {deskId.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')}
              </span>
            </div>
          )}
        </div>

        {/* Right Action buttons */}
        <div className="flex items-center gap-2">
          {/* Language Toggle */}
          <button
            onClick={onToggleLang}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Switch Language"
          >
            <Languages className="w-3.5 h-3.5 text-rose-400" />
            <span>{lang === 'hi' ? 'English' : 'हिन्दी'}</span>
          </button>

          {/* Security & Architecture Guide */}
          <button
            onClick={onOpenSecurityModal}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            title={lang === 'hi' ? 'सुरक्षा नियम व जानकारी' : 'Security Guide'}
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Pusher Config Settings */}
          <button
            onClick={onOpenPusherModal}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            title={lang === 'hi' ? 'पुशर व सिग्नलिंग सेटिंग्स' : 'Pusher & Signaling Settings'}
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
