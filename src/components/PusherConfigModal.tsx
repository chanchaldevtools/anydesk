import React, { useState } from 'react';
import PusherClient from 'pusher-js';
import {
  X,
  Flame,
  Radio,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { ConnectionMode, PusherConfig } from '../types';

interface PusherConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: ConnectionMode;
  onSelectMode: (mode: ConnectionMode) => void;
  pusherConfig: PusherConfig | null;
  onSavePusherConfig: (config: PusherConfig) => void;
  lang: 'en' | 'hi';
}

export const PusherConfigModal: React.FC<PusherConfigModalProps> = ({
  isOpen,
  onClose,
  currentMode,
  onSelectMode,
  pusherConfig,
  onSavePusherConfig,
  lang,
}) => {
  const [appId, setAppId] = useState(pusherConfig?.appId || '');
  const [key, setKey] = useState(pusherConfig?.key || '');
  const [secret, setSecret] = useState(pusherConfig?.secret || '');
  const [cluster, setCluster] = useState(pusherConfig?.cluster || 'ap2');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleTestPusher = async () => {
    if (!key || !cluster) {
      setTestResult({
        success: false,
        message: lang === 'hi' ? 'कृपया Key और Cluster भरें' : 'Please provide Key and Cluster',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    let testClient: PusherClient | null = null;
    let timer: any = null;

    try {
      testClient = new PusherClient(key, {
        cluster,
        forceTLS: true,
      });

      const cleanup = () => {
        if (timer) clearTimeout(timer);
        if (testClient) {
          testClient.disconnect();
        }
        setIsTesting(false);
      };

      timer = setTimeout(() => {
        cleanup();
        setTestResult({
          success: false,
          message:
            lang === 'hi'
              ? 'कनेक्शन टाइमआउट: कृपया Key और Cluster की जाँच करें.'
              : 'Connection timeout: Please check Key and Cluster.',
        });
      }, 7000);

      testClient.connection.bind('connected', () => {
        cleanup();
        setTestResult({
          success: true,
          message:
            lang === 'hi'
              ? 'पुशर कनेक्शन सफल! चैनल्स सक्रिय हैं.'
              : 'Pusher connection successful! Cloud channels ready.',
        });
      });

      testClient.connection.bind('error', (err: any) => {
        cleanup();
        const errMsg =
          err?.error?.data?.message ||
          err?.message ||
          (lang === 'hi' ? 'अमान्य Key या Cluster' : 'Invalid Key or Cluster');
        setTestResult({
          success: false,
          message: errMsg,
        });
      });
    } catch (e: any) {
      setIsTesting(false);
      setTestResult({
        success: false,
        message: e.message || 'Pusher initialization error',
      });
    }
  };

  const handleSaveAndUse = (e: React.FormEvent) => {
    e.preventDefault();
    const config: PusherConfig = {
      appId,
      key,
      secret,
      cluster,
      enabled: Boolean(key && cluster),
    };
    onSavePusherConfig(config);
    if (config.enabled) {
      onSelectMode('pusher');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {lang === 'hi' ? 'सिग्नलिंग व पुशर सेटिंग्स' : 'Signaling & Pusher Channels'}
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'hi'
                  ? 'WebRTC कनेक्शन हैंडशेक के लिए रियल-टाइम सर्विस'
                  : 'Real-time service for WebRTC connection exchange'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Mode Switcher */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {lang === 'hi' ? 'सिग्नलिंग प्रोवाइडर चुनें:' : 'Select Signaling Provider:'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Option 1: Cloud P2P (Serverless / Vercel) */}
              <button
                type="button"
                onClick={() => onSelectMode('cloud-p2p')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  currentMode === 'cloud-p2p'
                    ? 'bg-teal-500/10 border-teal-500 text-white shadow-md shadow-teal-950/30'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1 font-bold text-xs text-white">
                    <Radio className="w-3.5 h-3.5 text-teal-400" />
                    <span>Cloud P2P</span>
                  </div>
                  {currentMode === 'cloud-p2p' && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-teal-500 text-black font-extrabold">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 leading-snug">
                  {lang === 'hi'
                    ? 'Vercel/Static सर्वरलेस के लिए सर्वोत्तम. बिना एरर तुरंत काम करता है.'
                    : 'Recommended for Vercel/Serverless. Zero errors.'}
                </p>
              </button>

              {/* Option 2: Pusher Channels */}
              <button
                type="button"
                onClick={() => onSelectMode('pusher')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  currentMode === 'pusher'
                    ? 'bg-purple-500/10 border-purple-500 text-white shadow-md shadow-purple-950/30'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1 font-bold text-xs text-white">
                    <Flame className="w-3.5 h-3.5 text-purple-400" />
                    <span>Pusher Channels</span>
                  </div>
                  {currentMode === 'pusher' && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-purple-500 text-white font-extrabold">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 leading-snug">
                  {lang === 'hi'
                    ? 'पुशर क्लाउड चैनल्स द्वारा ग्लोबल पब-सब सिग्नलिंग.'
                    : 'Official Pusher Cloud pub/sub WebRTC signaling.'}
                </p>
              </button>

              {/* Option 3: Local WebSocket */}
              <button
                type="button"
                onClick={() => onSelectMode('builtin-ws')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  currentMode === 'builtin-ws'
                    ? 'bg-rose-500/10 border-rose-500 text-white shadow-md shadow-rose-950/30'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1 font-bold text-xs text-white">
                    <Radio className="w-3.5 h-3.5 text-rose-500" />
                    <span>Local WS Hub</span>
                  </div>
                  {currentMode === 'builtin-ws' && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-rose-500 text-white font-extrabold">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 leading-snug">
                  {lang === 'hi'
                    ? 'लोकल Node.js एक्सप्रेस सर्वर के लिए.'
                    : 'For full-stack Node.js server environments.'}
                </p>
              </button>
            </div>
          </div>

          {/* Pusher Credentials Form */}
          <form onSubmit={handleSaveAndUse} className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">
                {lang === 'hi' ? 'Pusher Channels क्रेडेंशियल्स' : 'Pusher App Credentials'}
              </span>
              <a
                href="https://dashboard.pusher.com"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1"
              >
                <span>dashboard.pusher.com</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-medium">App Key</label>
                <input
                  type="text"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="e.g. 849a2..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:border-purple-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-medium">Cluster</label>
                <input
                  type="text"
                  value={cluster}
                  onChange={(e) => setCluster(e.target.value)}
                  placeholder="e.g. ap2 (Mumbai), us2, eu"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:border-purple-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-medium">App ID (Optional)</label>
                <input
                  type="text"
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  placeholder="e.g. 1729012"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:border-purple-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-medium">App Secret (Optional)</label>
                <input
                  type="password"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="e.g. e4a7f..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:border-purple-500 outline-none"
                />
              </div>
            </div>

            {/* Client Events Setup Instructions Box */}
            <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-xs text-purple-200 space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-purple-300">
                <ShieldCheck className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <span>
                  {lang === 'hi'
                    ? 'Pusher Dashboard में Client Events कैसे चालू करें:'
                    : 'How to Enable Client Events in Pusher Dashboard:'}
                </span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-300">
                <li>
                  {lang === 'hi'
                    ? 'dashboard.pusher.com पर लॉगिन करें और अपना Channels App चुनें.'
                    : 'Log in to dashboard.pusher.com and select your Channels App.'}
                </li>
                <li>
                  {lang === 'hi'
                    ? 'बाएं मेनू से App Settings पर क्लिक करें.'
                    : 'Click "App Settings" in the left sidebar.'}
                </li>
                <li>
                  {lang === 'hi'
                    ? '"Enable client events" चेकबॉक्स को टिक करें और Save करें.'
                    : 'Check the "Enable client events" box and click Save.'}
                </li>
              </ol>
              <div className="p-2 rounded-lg bg-teal-500/10 border border-teal-500/20 text-[11px] text-teal-300 font-medium">
                {lang === 'hi'
                  ? '💡 सुझाव: यदि आप कोई सेटिंग नहीं बदलना चाहते, तो ऊपर "Cloud P2P" चुनें (यह 100% बिना किसी सेटअप के तुरंत चलता है).'
                  : '💡 Tip: To connect with zero setup on Vercel, simply switch to "Cloud P2P" mode above.'}
              </div>
            </div>

            {testResult && (
              <div
                className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={handleTestPusher}
                disabled={isTesting}
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {isTesting
                    ? lang === 'hi'
                      ? 'जाँच हो रही है...'
                      : 'Testing...'
                    : lang === 'hi'
                    ? 'कनेक्शन टेस्ट करें'
                    : 'Test Connection'}
                </span>
              </button>

              <button
                type="submit"
                className="flex-1 py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-950/40 cursor-pointer"
              >
                {lang === 'hi' ? 'सेव करें और उपयोग करें' : 'Save & Apply'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
