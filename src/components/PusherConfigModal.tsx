import React, { useState } from 'react';
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

    try {
      const res = await fetch('/api/pusher/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'test-channel',
          event: 'test-ping',
          data: { time: Date.now() },
          credentials: {
            appId,
            key,
            secret,
            cluster,
            enabled: true,
          },
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setTestResult({
          success: true,
          message:
            lang === 'hi'
              ? 'पुशर कनेक्शन सफल! चैनल्स तैयार हैं.'
              : 'Pusher connection successful! Channels ready.',
        });
      } else {
        setTestResult({
          success: false,
          message: json.error || 'Connection failed',
        });
      }
    } catch (e: any) {
      setTestResult({
        success: false,
        message: e.message || 'Network error during test',
      });
    } finally {
      setIsTesting(false);
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
            <div className="grid grid-cols-2 gap-3">
              {/* Option 1: Built-in WS */}
              <button
                type="button"
                onClick={() => onSelectMode('builtin-ws')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  currentMode === 'builtin-ws'
                    ? 'bg-rose-500/10 border-rose-500 text-white shadow-md shadow-rose-950/30'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                    <Radio className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                    <span>WebSocket Hub</span>
                  </div>
                  {currentMode === 'builtin-ws' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500 text-white font-bold">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  {lang === 'hi'
                    ? 'जीरो सेटअप, तुरंत सक्रिय, बिना किसी API key के चलता है.'
                    : 'Zero-config, instantly active, works without API keys.'}
                </p>
              </button>

              {/* Option 2: Pusher Channels */}
              <button
                type="button"
                onClick={() => onSelectMode('pusher')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  currentMode === 'pusher'
                    ? 'bg-purple-500/10 border-purple-500 text-white shadow-md shadow-purple-950/30'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                    <Flame className="w-3.5 h-3.5 text-purple-400" />
                    <span>Pusher Channels</span>
                  </div>
                  {currentMode === 'pusher' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500 text-white font-bold">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  {lang === 'hi'
                    ? 'पुशर क्लाउड चैनल्स द्वारा ग्लोबल पब-सब सिग्नलिंग.'
                    : 'Pusher Cloud Channels pub/sub WebRTC signaling.'}
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
