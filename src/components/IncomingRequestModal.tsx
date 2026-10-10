import React, { useEffect } from 'react';
import {
  ShieldAlert,
  Monitor,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Lock,
  MousePointer2,
  Eye,
} from 'lucide-react';
import { IncomingRequest } from '../types';
import { sounds } from '../utils/audio';

interface IncomingRequestModalProps {
  request: IncomingRequest;
  lang: 'en' | 'hi';
  onAccept: () => void;
  onReject: () => void;
}

export const IncomingRequestModal: React.FC<IncomingRequestModalProps> = ({
  request,
  lang,
  onAccept,
  onReject,
}) => {
  useEffect(() => {
    sounds.playIncomingAlert();
  }, []);

  const formattedDeskId = request.fromDeskId.replace(
    /(\d{3})(\d{3})(\d{3})/,
    '$1 $2 $3'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border-2 border-rose-500/50 rounded-2xl shadow-2xl shadow-rose-950/50 overflow-hidden transform transition-all">
        {/* Header with animated beacon */}
        <div className="bg-gradient-to-r from-rose-950/60 via-slate-900 to-rose-950/40 p-5 border-b border-rose-500/30 flex items-start gap-4">
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500 flex items-center justify-center text-rose-400">
              <Monitor className="w-6 h-6 animate-pulse" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500"></span>
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-rose-500 text-white">
                {lang === 'hi' ? 'इनकमिंग अनुरोध' : 'INCOMING REQUEST'}
              </span>
              <span className="text-xs text-rose-300 font-medium">
                {lang === 'hi' ? 'अनुमति की आवश्यकता है' : 'Explicit Consent Required'}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mt-1">
              {lang === 'hi'
                ? 'रिमोट स्क्रीन देखने की रिक्वेस्ट'
                : 'Remote Screen Viewing Request'}
            </h3>
            <p className="text-xs text-slate-300">
              {lang === 'hi'
                ? `Desk [${formattedDeskId}] आपकी स्क्रीन देखना चाहता है.`
                : `Desk [${formattedDeskId}] is requesting permission to view your screen.`}
            </p>
          </div>
        </div>

        {/* Requester Profile Card */}
        <div className="p-5 space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">
                {lang === 'hi' ? 'अनुरोधकर्ता का Desk ID' : 'Requester Desk ID'}
              </div>
              <div className="text-xl font-extrabold text-white font-mono tracking-widest mt-0.5">
                {formattedDeskId}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400 font-medium">
                {lang === 'hi' ? 'नाम / डिवाइस' : 'Name / Device'}
              </div>
              <div className="text-sm font-semibold text-slate-200">
                {request.fromName || 'Remote Peer'}
              </div>
              <div className="text-[11px] text-slate-400">
                {request.requesterInfo?.screenResolution || 'Web Browser'}
              </div>
            </div>
          </div>

          {/* Security & Sandbox Guarantee Box */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-amber-500/30 space-y-2.5">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wide">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>
                {lang === 'hi'
                  ? 'ब्राउज़र सैंडबॉक्स सुरक्षा नियम (Browser Security):'
                  : 'Browser Sandbox Security Guarantees:'}
              </span>
            </div>

            <ul className="text-xs text-slate-300 space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>
                    {lang === 'hi'
                      ? 'सिर्फ देखने की अनुमति: '
                      : 'View-Only Access: '}
                  </strong>
                  {lang === 'hi'
                    ? 'रिमोट यूजर आपके माउस, कीबोर्ड या फाइलों को कंट्रोल नहीं कर सकता.'
                    : 'The viewer CANNOT control your keyboard, mouse, or access your files.'}
                </span>
              </li>

              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>
                    {lang === 'hi'
                      ? 'मैनुअल स्क्रीन सिलेक्शन: '
                      : 'Manual Screen Picker: '}
                  </strong>
                  {lang === 'hi'
                    ? 'स्वीकार करने पर ब्राउज़र पूछेगा कि कौन सी विंडो या टैब शेयर करनी है.'
                    : 'Accepting will open your browser dialog where YOU select which screen, window, or tab to share.'}
                </span>
              </li>

              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>
                    {lang === 'hi'
                      ? 'कभी भी रोकें: '
                      : 'Instant Revocation: '}
                  </strong>
                  {lang === 'hi'
                    ? 'आप कभी भी एक क्लिक में स्क्रीन शेयरिंग बंद कर सकते हैं.'
                    : 'You can terminate screen sharing at any second with a single click.'}
                </span>
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              onClick={onReject}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-sm border border-slate-700 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <XCircle className="w-4 h-4 text-rose-400" />
              <span>{lang === 'hi' ? 'अस्वीकार करें' : 'Decline Request'}</span>
            </button>

            <button
              onClick={onAccept}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer transform hover:-translate-y-0.5"
            >
              <CheckCircle className="w-4 h-4 text-white" />
              <span>
                {lang === 'hi'
                  ? 'स्वीकार करें और स्क्रीन चुनें'
                  : 'Accept & Choose Screen'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
