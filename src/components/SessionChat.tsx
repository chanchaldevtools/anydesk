import React, { useState, useRef, useEffect } from 'react';
import { Send, X, MessageSquare, Terminal, ThumbsUp, HelpCircle } from 'lucide-react';
import { ChatMessage } from '../types';

interface SessionChatProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  lang: 'en' | 'hi';
}

export const SessionChat: React.FC<SessionChatProps> = ({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  lang,
}) => {
  const [inputText, setInputText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  const quickSnippets = [
    lang === 'hi' ? 'स्क्रीन साफ दिख रही है 👍' : 'I can see your screen clearly 👍',
    lang === 'hi' ? 'कृपया टर्मिनल / कंसोल खोलें' : 'Please open Terminal / Console',
    lang === 'hi' ? 'क्या आप वो विंडो आगे ला सकते हैं?' : 'Can you bring that window to front?',
    lang === 'hi' ? 'समस्या ठीक हो गई, धन्यवाद!' : 'Issue resolved, thank you!',
  ];

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-teal-400" />
          <h3 className="font-bold text-sm text-white">
            {lang === 'hi' ? 'सेशन लाइव चैट व नोट्स' : 'Session Chat & Notes'}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
            <MessageSquare className="w-8 h-8 opacity-40" />
            <p className="text-xs">
              {lang === 'hi'
                ? 'कोई संदेश नहीं. सहायता के लिए यहाँ संदेश या निर्देश भेजें.'
                : 'No messages yet. Exchange support notes or instructions here.'}
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.isSelf ? 'items-end' : 'items-start'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-400">
                <span className="font-semibold text-slate-300">
                  {msg.isSelf ? 'You' : msg.senderName}
                </span>
                <span>•</span>
                <span>
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                  msg.isSelf
                    ? 'bg-rose-600 text-white rounded-tr-none shadow-md shadow-rose-950/30'
                    : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      {/* Quick Snippets */}
      <div className="p-2 border-t border-slate-800 bg-slate-950/60 overflow-x-auto flex gap-1.5 no-scrollbar">
        {quickSnippets.map((text, i) => (
          <button
            key={i}
            onClick={() => onSendMessage(text)}
            className="flex-shrink-0 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 border border-slate-700 transition-colors whitespace-nowrap cursor-pointer"
          >
            {text}
          </button>
        ))}
      </div>

      {/* Input form */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-slate-800 bg-slate-900 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            lang === 'hi' ? 'संदेश या नोट लिखें...' : 'Type message or note...'
          }
          className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none text-xs text-white placeholder-slate-500 transition-colors"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white transition-colors cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
