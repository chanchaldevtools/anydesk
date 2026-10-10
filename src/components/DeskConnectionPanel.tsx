import React, { useState } from 'react';
import {
  Monitor,
  Copy,
  Check,
  Share2,
  ArrowRight,
  ShieldCheck,
  Lock,
  Volume2,
  Users,
  Laptop,
  Sparkles,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { DeskInfo } from '../types';

interface DeskConnectionPanelProps {
  deskId: string;
  deskName: string;
  onChangeDeskName: (name: string) => void;
  onlineDesks: DeskInfo[];
  lang: 'en' | 'hi';
  isConnecting: boolean;
  onRequestConnect: (targetDeskId: string) => void;
  onDirectShare: () => void;
  includeAudio: boolean;
  onToggleAudio: (val: boolean) => void;
  statusMessage: string | null;
  onSwitchToCloudP2P?: () => void;
}

export const DeskConnectionPanel: React.FC<DeskConnectionPanelProps> = ({
  deskId,
  deskName,
  onChangeDeskName,
  onlineDesks,
  lang,
  isConnecting,
  onRequestConnect,
  onDirectShare,
  includeAudio,
  onToggleAudio,
  statusMessage,
  onSwitchToCloudP2P,
}) => {
  const [remoteInput, setRemoteInput] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const formattedSelfId = deskId
    ? deskId.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')
    : '--- --- ---';

  const handleCopyId = () => {
    if (!deskId) return;
    navigator.clipboard.writeText(deskId.replace(/\s+/g, ''));
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyLink = () => {
    if (!deskId) return;
    const url = `${window.location.origin}?desk=${deskId.replace(/\s+/g, '')}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = remoteInput.replace(/[^0-9]/g, '');
    if (cleanId.length >= 6) {
      onRequestConnect(cleanId);
    }
  };

  // Filter out self from online desks
  const otherDesks = onlineDesks.filter(
    (d) => d.deskId.replace(/\s+/g, '') !== deskId.replace(/\s+/g, '')
  );

  return (
    <div className="space-y-6">
      {/* Top Banner Notice: Browser Sandbox & Permission Model */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-rose-950/20 to-slate-900 border border-slate-800 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>
                  {lang === 'hi'
                    ? '100% अनुमति-आधारित लाइव स्क्रीन व्यूअर'
                    : 'Consent-First Live Screen Viewing'}
                </span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Zero Hidden Access
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
                {lang === 'hi'
                  ? 'ब्राउज़र सैंडबॉक्स सुरक्षा: रिमोट यूजर केवल वही स्क्रीन देख सकता है जिसे शेयर करने वाला व्यक्ति खुद डायलॉग में चुनकर अनुमति देगा. कोई हिडन एक्सेस या रिमोट माउस/कीबोर्ड कंट्रोल संभव नहीं है.'
                  : 'Browser Sandbox Security: The remote user can only view what the host explicitly grants permission to via the native browser dialog. No hidden capture, remote mouse control, or keystroke access.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{lang === 'hi' ? 'लिंक कॉपी हो गया!' : 'Link Copied!'}</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>{lang === 'hi' ? 'शेयर लिंक' : 'Share Link'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Two-Column AnyDesk Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: THIS DESK (Host / Sharer) */}
        <div className="relative rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden p-6 flex flex-col justify-between">
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                  <Monitor className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {lang === 'hi' ? 'यह डेस्क (This Desk)' : 'This Desk'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {lang === 'hi'
                      ? 'स्क्रीन शेयर करने के लिए यह ID साझा करें'
                      : 'Share this ID to let someone view your screen'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{lang === 'hi' ? 'तैयार / ऑनलाइन' : 'Ready / Online'}</span>
              </div>
            </div>

            {/* Big 9-digit Desk ID Box */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {lang === 'hi' ? 'आपका डेस्क एड्रेस' : 'Your Desk Address'}
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-widest mt-1">
                  {formattedSelfId}
                </div>
              </div>

              <button
                onClick={handleCopyId}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                title="Copy Desk ID"
              >
                {copiedId ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>{lang === 'hi' ? 'कॉपी हुआ' : 'Copied'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-400" />
                    <span>{lang === 'hi' ? 'कॉपी' : 'Copy'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Alias / Custom Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">
                {lang === 'hi' ? 'डेस्क का नाम / उपनाम' : 'Desk Alias / Nickname'}
              </label>
              <input
                type="text"
                value={deskName}
                onChange={(e) => onChangeDeskName(e.target.value)}
                placeholder="My Workstation"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none text-sm text-slate-200 placeholder-slate-500 transition-colors"
              />
            </div>

            {/* Audio Toggle */}
            <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={includeAudio}
                onChange={(e) => onToggleAudio(e.target.checked)}
                className="rounded bg-slate-950 border-slate-700 text-rose-500 focus:ring-rose-500"
              />
              <Volume2 className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {lang === 'hi'
                  ? 'शेयर करते समय सिस्टम ऑडियो भी शामिल करें (यदि ब्राउज़र अनुमति दे)'
                  : 'Include system audio during screen share'}
              </span>
            </label>
          </div>

          {/* Quick Direct Share Trigger */}
          <div className="pt-6 border-t border-slate-800/80 mt-6 space-y-3">
            <button
              onClick={onDirectShare}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-sm shadow-lg shadow-rose-950/40 flex items-center justify-center gap-2 transition-all cursor-pointer transform hover:-translate-y-0.5"
            >
              <Monitor className="w-4 h-4" />
              <span>
                {lang === 'hi'
                  ? 'सीधे स्क्रीन शेयर शुरू करें'
                  : 'Start Direct Screen Sharing'}
              </span>
            </button>
            <p className="text-[11px] text-center text-slate-400">
              {lang === 'hi'
                ? 'या किसी अन्य यूजर द्वारा कनेक्शन रिक्वेस्ट भेजने की प्रतीक्षा करें'
                : 'Or wait for incoming view requests from remote users'}
            </p>
          </div>
        </div>

        {/* Card 2: REMOTE DESK (Viewer / Request) */}
        <div className="relative rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden p-6 flex flex-col justify-between">
          <form onSubmit={handleConnect} className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                  <Laptop className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {lang === 'hi' ? 'रिमोट डेस्क (Remote Desk)' : 'Remote Desk'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {lang === 'hi'
                      ? 'रिमोट स्क्रीन देखने के लिए साथी का ID दर्ज करें'
                      : 'Enter partner desk ID to request viewing their screen'}
                  </p>
                </div>
              </div>
            </div>

            {/* Input for Remote Desk ID */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">
                {lang === 'hi' ? 'रिमोट डेस्क ID' : 'Remote Desk ID'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={remoteInput}
                  onChange={(e) => setRemoteInput(e.target.value)}
                  placeholder="e.g. 482 910 375"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none text-lg text-white font-mono tracking-widest placeholder-slate-600 transition-colors"
                />
                {remoteInput && (
                  <button
                    type="button"
                    onClick={() => setRemoteInput('')}
                    className="absolute right-3 top-3 text-xs text-slate-500 hover:text-slate-300"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Security Explanation Reminder */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5 text-xs text-slate-300">
              <div className="flex items-center gap-1.5 font-semibold text-teal-400">
                <Lock className="w-3.5 h-3.5" />
                <span>
                  {lang === 'hi'
                    ? 'अनुरोध प्रक्रिया (Consent Handshake):'
                    : 'Permission Handshake:'}
                </span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                {lang === 'hi'
                  ? 'जैसे ही आप "कनेक्ट" दबाएंगे, रिमोट पार्टनर के स्क्रीन पर एक पॉपअप आएगा. जब वे अनुमति देकर अपनी स्क्रीन चुनेंगे, तभी लाइव फीड शुरू होगी.'
                  : 'When you click Connect, an incoming request is sent to the partner. The stream starts ONLY after they accept and select their screen.'}
              </p>
            </div>

            {/* Connect Button */}
            <button
              type="submit"
              disabled={isConnecting || remoteInput.replace(/[^0-9]/g, '').length < 6}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm shadow-lg shadow-teal-950/40 flex items-center justify-center gap-2 transition-all cursor-pointer transform hover:-translate-y-0.5"
            >
              {isConnecting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>
                    {lang === 'hi'
                      ? 'अनुमति की प्रतीक्षा की जा रही है...'
                      : 'Waiting for Host Approval...'}
                  </span>
                </>
              ) : (
                <>
                  <span>
                    {lang === 'hi'
                      ? 'कनेक्ट करें व स्क्रीन रिक्वेस्ट भेजें'
                      : 'Connect & Request Screen'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Status feedback message */}
          {statusMessage && (
            <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="leading-relaxed">{statusMessage}</span>
              </div>
              {(statusMessage.includes('client events') ||
                statusMessage.includes('Pusher') ||
                statusMessage.includes('Settings page')) &&
                onSwitchToCloudP2P && (
                  <button
                    type="button"
                    onClick={onSwitchToCloudP2P}
                    className="w-full py-2 px-3 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      {lang === 'hi'
                        ? 'Cloud P2P पर स्विच करें (बिना किसी सेटिंग के तुरंत चालू)'
                        : 'Switch to Cloud P2P Mode (Instant Zero-Setup Connection)'}
                    </span>
                  </button>
                )}
            </div>
          )}
        </div>
      </div>

      {/* Discovered Desks / Online Peers (Simplifies multi-tab testing) */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-rose-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              {lang === 'hi'
                ? 'ऑनलाइन डेस्क (नेटवर्क पर सक्रिय)'
                : 'Active Desks on Network (For Testing)'}
            </h4>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
              {otherDesks.length} online
            </span>
          </div>
          <div className="text-[11px] text-slate-400 hidden sm:block">
            {lang === 'hi'
              ? 'दूसरे टैब या ब्राउज़र में खोलकर तुरंत टेस्ट करें'
              : 'Open in second tab or window to test live connection'}
          </div>
        </div>

        {otherDesks.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 text-center text-xs text-slate-500 space-y-1">
            <p>
              {lang === 'hi'
                ? 'अभी कोई अन्य डेस्क ऑनलाइन नहीं है. इस ऐप को दूसरे ब्राउज़र टैब में खोलें.'
                : 'No other desks detected. Open this URL in another tab or device to test!'}
            </p>
            <button
              onClick={() => window.open(window.location.href, '_blank')}
              className="inline-flex items-center gap-1 text-rose-400 hover:text-rose-300 font-semibold mt-1"
            >
              <span>{lang === 'hi' ? 'दूसरा टैब खोलें' : 'Open in New Tab'}</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {otherDesks.map((peer) => (
              <div
                key={peer.deskId}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 flex items-center justify-between transition-colors"
              >
                <div>
                  <div className="text-xs font-bold text-white font-mono">
                    {peer.deskId.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate max-w-[140px]">
                    {peer.name || 'Remote Host'}
                  </div>
                </div>

                <button
                  onClick={() => onRequestConnect(peer.deskId)}
                  disabled={isConnecting}
                  className="px-2.5 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{lang === 'hi' ? 'कनेक्ट' : 'Connect'}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
