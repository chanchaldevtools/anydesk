import React from 'react';
import {
  X,
  ShieldCheck,
  Lock,
  MousePointer2,
  Eye,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Laptop,
} from 'lucide-react';

interface SecurityGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'hi';
}

export const SecurityGuideModal: React.FC<SecurityGuideModalProps> = ({
  isOpen,
  onClose,
  lang,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {lang === 'hi'
                  ? 'सुरक्षा व अनुमति मॉडल (Browser Sandbox Security)'
                  : 'Security & Permission Architecture'}
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'hi'
                  ? 'वेब-आधारित रिमोट व्यूअर कैसे काम करता है और क्यों यह सुरक्षित है'
                  : 'How web-based remote screen viewing guarantees user privacy'}
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

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-300 text-xs leading-relaxed">
          {/* Key Principle Card */}
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 space-y-2">
            <h4 className="font-bold text-sm flex items-center gap-2 text-rose-300">
              <AlertTriangle className="w-4 h-4" />
              <span>
                {lang === 'hi'
                  ? 'मुख्य नियम: बिना आपकी स्पष्ट अनुमति कोई स्क्रीन नहीं देख सकता'
                  : 'Key Rule: Zero Access Without Explicit Host Consent'}
              </span>
            </h4>
            <p>
              {lang === 'hi'
                ? 'वेब ब्राउज़र (Chrome, Edge, Firefox, Safari) सुरक्षा नीतियों के तहत, कोई भी वेबसाइट किसी भी कंप्यूटर की स्क्रीन को चुपके से (hidden access) कैप्चर नहीं कर सकती. स्क्रीन शेयरिंग शुरू करने के लिए कंप्यूटर के मालिक को खुद ब्राउज़र प्रॉम्प्ट में स्क्रीन का चुनाव करना ही होगा.'
                : 'Under modern browser security specifications, websites are sandboxed and cannot access your screen in the background. Screen sharing is physically impossible without the host clicking "Accept" and selecting what to share via the native browser dialog.'}
            </p>
          </div>

          {/* Comparison Table: Desktop AnyDesk vs Web AnyDesk */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm text-white">
              {lang === 'hi'
                ? 'पारंपरिक AnyDesk vs यह वेब रिमोट व्यूअर:'
                : 'Desktop Executable vs Browser AnyDesk Web:'}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Desktop Executable */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-rose-400 font-bold text-xs uppercase flex items-center gap-1.5">
                  <Laptop className="w-3.5 h-3.5" />
                  <span>Desktop App (.exe / .dmg)</span>
                </div>
                <ul className="space-y-1.5 text-slate-400 text-[11px]">
                  <li>⚠️ सिस्टम ड्राइवर इंस्टॉल करता है</li>
                  <li>⚠️ माउस व कीबोर्ड को पूरा कंट्रोल कर सकता है</li>
                  <li>⚠️ बैकग्राउंड अनअटेंडेड एक्सेस कर सकता है</li>
                  <li>⚠️ फाइल्स व पर्सनल डेटा तक पहुंच संभव</li>
                </ul>
              </div>

              {/* Web Sandbox */}
              <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-2">
                <div className="text-emerald-400 font-bold text-xs uppercase flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>This Web Application</span>
                </div>
                <ul className="space-y-1.5 text-emerald-200/90 text-[11px]">
                  <li>✅ शून्य इंस्टॉलेशन, सिर्फ ब्राउज़र में चलता है</li>
                  <li>✅ शून्य माउस/कीबोर्ड टेकओवर (No OS takeover)</li>
                  <li>✅ केवल चुनी हुई विंडो या स्क्रीन की लाइव वीडियो दिखती है</li>
                  <li>✅ एक क्लिक में कभी भी डिस्कनेक्ट करें</li>
                </ul>
              </div>
            </div>
          </div>

          {/* How tech assistance works safely */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <MousePointer2 className="w-4 h-4 text-teal-400" />
              <span>
                {lang === 'hi'
                  ? 'बिना माउस कंट्रोल के सहायता (Support) कैसे दें?'
                  : 'How Does Remote Guidance Work Without Mouse Control?'}
              </span>
            </h4>
            <p className="text-slate-400 text-[11px]">
              {lang === 'hi'
                ? 'तकनीकी सहायता, कोड रिव्यू, या ट्यूटोरियल के दौरान व्यूअर स्क्रीन पर "वर्चुअल लेजर पॉइंटर" और "हाइलाइटर पेन" का उपयोग कर सकता है. इससे स्क्रीन शेयर करने वाले व्यक्ति को तुरंत पता चलता है कि कहाँ क्लिक करना है, जबकि उनके कंप्यूटर का पूर्ण नियंत्रण उनके ही हाथों में रहता है!'
                : 'For remote tech support, presentations, or debugging, the viewer can utilize our Virtual Laser Pointer and Pen Highlighter. This guides the host visually in real-time, pointing out buttons or code lines, while the host retains 100% control of their own mouse and keyboard.'}
            </p>
          </div>

          {/* WebRTC Encryption Guarantee */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-300">
            <Lock className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div className="text-[11px]">
              <strong className="text-white">
                {lang === 'hi' ? 'एंड-टू-एंड एन्क्रिप्टेड (DTLS-SRTP): ' : 'Direct Peer-to-Peer Encrypted: '}
              </strong>
              {lang === 'hi'
                ? 'वीडियो स्ट्रीम WebRTC के माध्यम से सीधे दो ब्राउज़रों के बीच भेजी जाती है. कोई भी सर्वर आपकी स्क्रीन का वीडियो रिकॉर्ड या स्टोर नहीं करता.'
                : 'Media streams travel directly peer-to-peer using WebRTC DTLS/SRTP military-grade encryption. No video is ever stored or inspected by intermediate servers.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
