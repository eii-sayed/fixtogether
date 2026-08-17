import { useState, useRef, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Bot,
  RotateCcw,
  ShieldAlert,
  ChevronDown,
  Wrench,
  Zap,
  Lock,
  LogIn,
  UserPlus,
} from 'lucide-react';

export default function FloatingAIHead() {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize greeting based on auth state
  useEffect(() => {
    if (isAuthenticated) {
      setMessages([
        {
          id: 'init-1',
          sender: 'bot',
          text: `👋 Hi **${user?.fullName || 'there'}**! I'm **Fixie**, your FixTogether AI assistant powered by Google Gemini.\n\nAsk me anything about diagnosing broken devices, safety checks, or creating effective repair requests!`,
          suggestedActions: [
            '🔍 Diagnose a broken device',
            '⚡ Is it safe to repair myself?',
            '📝 How do repair requests work?',
          ],
        },
      ]);
    } else {
      setMessages([
        {
          id: 'init-anon',
          sender: 'bot',
          text: "👋 Welcome to FixTogether! I'm **Fixie**, your AI repair assistant.\n\nPlease log in or create an account to start a live AI diagnostic chat!",
          suggestedActions: [],
        },
      ]);
    }
  }, [isAuthenticated, user?.fullName]);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      if (isAuthenticated) {
        setTimeout(() => inputRef.current?.focus(), 150);
      }
    }
  }, [isOpen, messages, isAuthenticated]);

  // Hide floating head on dedicated full-screen mobile chat
  if (
    location.pathname.startsWith('/repair-requests/') &&
    location.pathname.endsWith('/messages')
  ) {
    return null;
  }

  const handleSendMessage = async (textToSend) => {
    if (!isAuthenticated) {
      setIsOpen(true);
      return;
    }

    const text = (textToSend || input).trim();
    if (!text || isTyping) return;

    setHasInteracted(true);
    const userMsgId = `user-${Date.now()}`;
    const userMsg = { id: userMsgId, sender: 'user', text };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      // Build conversation history for context
      const history = messages.slice(-6).map((m) => ({
        sender: m.sender,
        text: m.text,
      }));

      const res = await api.post('/ai/chat', { message: text, history });
      const data = res.data.data;

      const botMsg = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: data.reply || 'I am here to help you. How else can I assist with your repair?',
        suggestedActions: data.suggestedActions || [],
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const errorMsg = {
        id: `err-${Date.now()}`,
        sender: 'bot',
        text: '⚠️ I encountered a temporary connection issue. Please make sure your server is running or try again.',
        suggestedActions: ['Try again', 'How do repair requests work?'],
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    if (isAuthenticated) {
      setMessages([
        {
          id: `init-${Date.now()}`,
          sender: 'bot',
          text: `👋 Chat reset! How can I help you today, **${user?.fullName || 'friend'}**?`,
          suggestedActions: [
            '🔍 Diagnose a broken device',
            '⚡ Is it safe to repair myself?',
            '📝 How do repair requests work?',
          ],
        },
      ]);
    }
  };

  // Helper to format basic markdown (bold)
  const formatBotText = (content) => {
    if (!content) return null;
    return content.split('\n').map((line, idx) => {
      const formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      return (
        <span
          key={idx}
          className="block mb-1 last:mb-0 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: formattedLine }}
        />
      );
    });
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. FLOATING AI HEAD BUTTON (Trigger) */}
      {/* ========================================================================= */}
      <div className="fixed bottom-20 md:bottom-6 right-5 z-40 flex flex-col items-end">
        {/* Callout Prompt Tooltip (Visible until clicked) */}
        {!isOpen && !hasInteracted && (
          <div
            onClick={() => setIsOpen(true)}
            className="mb-2 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-lg border border-emerald-200 text-xs font-semibold text-gray-800 flex items-center gap-1.5 cursor-pointer animate-bounce hover:bg-emerald-50 transition-all active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-spin [animation-duration:3s]" />
            <span>Ask Fixie AI</span>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          </div>
        )}

        {/* The Animated Floating Head */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`relative group w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 active:scale-95 ${
            isOpen
              ? 'bg-gray-800 text-white rotate-90 scale-90'
              : 'bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 text-white hover:scale-110 shadow-emerald-500/40'
          }`}
          aria-label={isOpen ? 'Close AI Assistant' : 'Open AI Assistant'}
        >
          {/* Animated Glowing Ring Effect */}
          {!isOpen && (
            <div className="absolute inset-0 rounded-full bg-emerald-400 opacity-70 blur-md group-hover:opacity-100 animate-pulse transition-opacity -z-10" />
          )}

          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <div className="relative flex items-center justify-center">
              <Bot className="w-7 h-7 stroke-[2.2] group-hover:rotate-6 transition-transform" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center shadow-xs">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              </span>
            </div>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 2. CONVERSATIONAL AI DRAWER / POPUP */}
      {/* ========================================================================= */}
      {isOpen && (
        <div className="fixed bottom-24 md:bottom-24 right-4 md:right-6 w-[92vw] sm:w-[380px] h-[520px] max-h-[80dvh] bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-emerald-100 flex flex-col overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-6 duration-300">
          {/* Card Header */}
          <div className="px-4 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between shadow-xs shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-inner">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight flex items-center gap-1.5">
                  <span>Fixie AI</span>
                  <span className="bg-emerald-400/30 text-emerald-100 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-emerald-300/30 uppercase tracking-wider">
                    Gemini 3.1
                  </span>
                </h3>
                <p className="text-[11px] text-emerald-100/90 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                  <span>FixTogether Repair Assistant</span>
                </p>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-1">
              {isAuthenticated && (
                <button
                  onClick={handleClearChat}
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors active:scale-95"
                  title="Reset Conversation"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors active:scale-95"
                title="Close"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* BODY: Authenticated Chat OR Login Gate */}
          {/* ========================================================================= */}
          {!isAuthenticated ? (
            <div className="flex-1 p-6 flex flex-col items-center justify-center text-center bg-gray-50/50">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 border border-emerald-100 shadow-sm">
                <Lock className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-gray-900 text-base">Login Required</h4>
              <p className="text-xs text-gray-600 mt-2 max-w-xs leading-relaxed">
                Please sign in to FixTogether to access personalized diagnostic guidance, instant safety advice, and repair estimates from Fixie AI.
              </p>

              <div className="w-full space-y-2.5 mt-6">
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="btn-primary w-full justify-center text-xs py-2.5 shadow-sm"
                >
                  <LogIn className="w-4 h-4" /> Log In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setIsOpen(false)}
                  className="btn-secondary w-full justify-center text-xs py-2.5"
                >
                  <UserPlus className="w-4 h-4" /> Create Free Account
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Messages Stream */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5 bg-gray-50/50">
                {messages.map((m) => {
                  const isUser = m.sender === 'user';
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                          isUser
                            ? 'bg-emerald-600 text-white rounded-tr-xs'
                            : 'bg-white text-gray-800 border border-gray-200/80 rounded-tl-xs'
                        }`}
                      >
                        {isUser ? m.text : formatBotText(m.text)}
                      </div>

                      {/* Suggested Action Chips */}
                      {!isUser && m.suggestedActions?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2 max-w-[95%]">
                          {m.suggestedActions.map((action, i) => (
                            <button
                              key={i}
                              onClick={() => handleSendMessage(action)}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 rounded-full text-[11px] font-medium transition-all active:scale-95 text-left flex items-center gap-1 shadow-2xs"
                            >
                              <span>{action}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-white border border-gray-200/80 rounded-2xl rounded-tl-xs px-3.5 py-2 w-fit shadow-2xs">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                    <span className="text-[11px] text-emerald-700 font-semibold ml-1">
                      Fixie is thinking…
                    </span>
                  </div>
                )}

                <div ref={messagesEndRef} className="h-px" />
              </div>

              {/* Quick Starter Topics */}
              {messages.length === 1 && (
                <div className="px-4 py-2 bg-white border-t border-gray-100 flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                  <button
                    onClick={() => handleSendMessage('Is it safe to repair my microwave?')}
                    className="px-2.5 py-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-[11px] text-gray-700 shrink-0 flex items-center gap-1"
                  >
                    <ShieldAlert className="w-3 h-3 text-amber-500" />
                    <span>Safety Check</span>
                  </button>
                  <button
                    onClick={() => handleSendMessage('How do I submit a repair request?')}
                    className="px-2.5 py-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-[11px] text-gray-700 shrink-0 flex items-center gap-1"
                  >
                    <Wrench className="w-3 h-3 text-primary-500" />
                    <span>Post Request</span>
                  </button>
                  <button
                    onClick={() => handleSendMessage('My laptop won’t turn on, what can I do?')}
                    className="px-2.5 py-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-[11px] text-gray-700 shrink-0 flex items-center gap-1"
                  >
                    <Zap className="w-3 h-3 text-purple-500" />
                    <span>Diagnose</span>
                  </button>
                </div>
              )}

              {/* Input Composer */}
              <div className="p-3 bg-white border-t border-gray-100 shrink-0">
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask Fixie about repairs, safety, or quotes…"
                    className="flex-1 px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={!input.trim() || isTyping}
                    className="p-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl shadow-xs transition-all active:scale-95 shrink-0"
                    aria-label="Send to AI"
                  >
                    {isTyping ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 text-center mt-1.5">
                  Preliminary guidance only. Always follow technician safety advice.
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
