
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, MessageSquare, ChevronDown, Minimize2, Paperclip, Bot } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { api } from '../../services/api';

// --- Types ---
interface Message {
  id: string;
  role: 'user' | 'model' | 'assistant';
  text: string;
  timestamp: Date;
}

export const AuroraAssistant: React.FC = () => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Olá! Sou a Aurora, sua assistente inteligente do PsiFlux. 🧠✨\n\nSou uma parceira para te ajudar na gestão da clínica e também com dúvidas sobre psicologia. Posso consultar seus pacientes, agenda e até realizar marcações para você. Como posso ser útil hoje?',
      timestamp: new Date()
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- Auto Scroll ---
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // --- Focus Input on Open ---
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // --- AI Logic ---
  const handleSendMessage = async (textOverride?: string) => {
    const text = textOverride || inputValue;
    if (!text.trim()) return;

    // 1. Add User Message
    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      // 2. Call Backend API
      const response = await api.post<{ text: string }>('/ai/chat', {
        messages: messages.concat(newUserMsg).map(m => ({
          role: m.role === 'model' ? 'assistant' : m.role,
          content: m.text
        }))
      });

      const aiResponse = response.text || "Desculpe, não consegui processar sua resposta agora.";
      
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: aiResponse,
        timestamp: new Date()
      }]);

    } catch (error) {
      console.error("Erro na Aurora:", error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "Tive um pequeno problema ao processar sua solicitação. Por favor, tente novamente.",
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };


  const suggestions = [
    "Como crio uma sala virtual?",
    "Como funciona a agenda?",
    "Onde vejo prontuários?",
    "Explique o financeiro"
  ];

  return (
    <>
      {/* --- TRIGGER BUTTON --- */}
      <div className={`fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-2 transition-all duration-300 ${isOpen ? 'translate-y-[20px] opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
        
        {/* Tooltip / Welcome Bubble */}
        <div className={`bg-white px-4 py-2 rounded-xl shadow-lg border border-indigo-100 mb-2 transition-all duration-500 origin-bottom-right ${isHovered ? 'scale-100 opacity-100' : 'scale-90 opacity-0 translate-y-4'}`}>
            <p className="text-sm font-medium text-slate-700">Olá! Posso ajudar? 👋</p>
        </div>

        <button
          onClick={() => setIsOpen(true)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="relative group w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
        >
          {/* Animated Background */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-[spin_4s_linear_infinite] opacity-80 blur-sm group-hover:opacity-100 group-hover:blur-md transition-all"></div>
          <div className="absolute inset-0.5 rounded-full bg-slate-900 flex items-center justify-center overflow-hidden">
             {/* Inner Glow */}
             <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-transparent"></div>
             <Sparkles className="text-white relative z-10 w-7 h-7 animate-pulse" />
          </div>
        </button>
      </div>

      {/* --- CHAT WINDOW --- */}
      <div 
        className={`
            fixed bottom-6 right-6 z-[100] w-[380px] h-[600px] max-h-[calc(100vh-40px)] max-w-[calc(100vw-40px)]
            bg-white rounded-[32px] shadow-2xl flex flex-col overflow-hidden border border-slate-100
            transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
            ${isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-75 opacity-0 translate-y-20 pointer-events-none'}
        `}
      >
        {/* Header */}
        <div className="h-20 bg-slate-900 relative flex items-center px-6 shrink-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-90"></div>
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
            
            <div className="relative z-10 flex items-center justify-between w-full text-white">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
                        <Bot size={20} className="text-white" />
                    </div>
                    <div>
                        <h3 className="font-display font-bold text-lg leading-none">Aurora</h3>
                        <span className="text-[10px] font-medium text-indigo-100 flex items-center gap-1 opacity-80">
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span> Online
                        </span>
                    </div>
                </div>
                <div className="flex gap-1">
                    <button 
                        onClick={() => setIsOpen(false)}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <ChevronDown size={20} />
                    </button>
                </div>
            </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 bg-slate-50 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {messages.map((msg) => (
                <div 
                    key={msg.id} 
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                    <div 
                        className={`
                            max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm
                            ${msg.role === 'user' 
                                ? 'bg-indigo-600 text-white rounded-br-none' 
                                : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'}
                        `}
                    >
                        {/* Render simple markdown-like bold */}
                        <p dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />
                        <span className={`text-[10px] mt-2 block ${msg.role === 'user' ? 'text-indigo-200' : 'text-slate-400'}`}>
                            {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                    </div>
                </div>
            ))}
            
            {isTyping && (
                <div className="flex justify-start">
                    <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex gap-1">
                        <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></span>
                        <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-100"></span>
                        <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-200"></span>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-white p-4 border-t border-slate-100">
            {/* Quick Suggestions */}
            {messages.length < 4 && !isTyping && (
                <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar mb-2">
                    {suggestions.map((sug, i) => (
                        <button 
                            key={i}
                            onClick={() => handleSendMessage(sug)}
                            className="whitespace-nowrap px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs font-medium text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                        >
                            {sug}
                        </button>
                    ))}
                </div>
            )}

            <div className="relative flex items-center gap-2">
                <input 
                    ref={inputRef}
                    type="text" 
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Digite sua dúvida..."
                    className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all outline-none text-slate-700 placeholder:text-slate-400"
                />
                <button 
                    onClick={() => handleSendMessage()}
                    disabled={!inputValue.trim() || isTyping}
                    className="p-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
                >
                    <Send size={18} />
                </button>
            </div>
            <div className="text-center mt-2">
                <span className="text-[10px] text-slate-400">Powered by Aurora AI • PsiFlux</span>
            </div>
        </div>
      </div>
    </>
  );
};
