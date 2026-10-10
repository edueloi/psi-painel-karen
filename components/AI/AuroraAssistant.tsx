
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, MessageSquare, ChevronDown, Paperclip, Bot } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { api, API_BASE_URL } from '../../services/api';
import { getToken } from '../../services/tokenStorage';
import { IconButton, Input } from '../UI';

// --- Types ---
interface Message {
  id: string;
  role: 'user' | 'model' | 'assistant';
  text: string;
  timestamp: Date | string;
}

export const AuroraAssistant: React.FC = () => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Bom dia';
    if (hours < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: `${getGreeting()}! Sou a Bia, sua assistente inteligente do Plaelo. 🧠✨\n\nSou uma parceira para te ajudar na gestão da clínica e também com dúvidas sobre sua prática clínica. Posso consultar seus pacientes, agenda e até realizar marcações para você. Como posso ser útil hoje?`,
      timestamp: new Date()
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- Global Trigger ---
  useEffect(() => {
    (window as any).openAuroraChat = () => setIsOpen(true);
    return () => { delete (window as any).openAuroraChat; };
  }, []);

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
    if (!text.trim() && !selectedFile) return;

    // 1. Add User Message
    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: selectedFile ? `${text} (Anexo: ${selectedFile.name})`.trim() : text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserMsg]);
    setInputValue('');
    const currentFile = selectedFile;
    setSelectedFile(null);
    setIsTyping(true);

    try {
      // 2. Call Backend API
      const history = messages.concat(newUserMsg).map(m => ({
        role: m.role === 'model' ? 'assistant' : m.role,
        content: m.text
      }));

      const formData = new FormData();
      formData.append('messages', JSON.stringify(history));
      if (currentFile) {
        formData.append('file', currentFile);
      }

      // We need a specific call for multipart if api.post only handles JSON
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) throw new Error('Erro ao chamar servidor');
      const data = await res.json();

      const aiResponse = data.text || "Desculpe, não consegui processar sua resposta agora.";

      // Notifica o sistema quando Aurora criou dados
      if (data.actions_taken?.includes('patients_created')) {
        window.dispatchEvent(new CustomEvent('aurora:data-updated', { detail: { type: 'patients' } }));
      }
      if (data.actions_taken?.includes('appointment_created')) {
        window.dispatchEvent(new CustomEvent('aurora:data-updated', { detail: { type: 'appointments' } }));
      }

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("O arquivo é muito grande. O limite é 5MB.");
        return;
      }
      setSelectedFile(file);
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
        <div className={`bg-white px-3 py-2 rounded-lg border border-slate-200 mb-2 transition-all duration-500 origin-bottom-right ${isHovered ? 'scale-100 opacity-100' : 'scale-90 opacity-0 translate-y-4 pointer-events-none'}`}>
            <p className="text-xs font-medium text-slate-700">{getGreeting()}! Posso ajudar?</p>
        </div>

        <button
          onClick={() => setIsOpen(true)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          data-tour="aurora"
          aria-label="Abrir assistente Bia" className="relative group w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shrink-0"
        >
          <div className="absolute inset-0 rounded-full bg-primary-600 transition-all group-hover:bg-primary-700"></div>
          <Sparkles className="relative z-10 h-5 w-5 text-white" />
        </button>
      </div>

      {/* --- CHAT WINDOW --- */}
      <div
        className={`
            fixed bottom-6 right-6 z-[100] w-[380px] h-[600px] max-h-[calc(100vh-40px)] max-w-[calc(100vw-40px)]
            bg-white rounded-lg flex flex-col overflow-hidden border border-slate-200
            transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
            ${isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-75 opacity-0 translate-y-20 pointer-events-none'}
        `}
      >
        {/* Header */}
        <div className="flex h-14 shrink-0 items-center justify-between bg-primary-600 px-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/20">
              <Bot size={16} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-medium leading-none">Bia</h3>
              <span className="mt-1 flex items-center gap-1 text-[11px] text-white/80">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span> Online
              </span>
            </div>
          </div>
          <IconButton
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            aria-label="Minimizar assistente"
            className="text-white hover:bg-white/10 hover:text-white"
          >
            <ChevronDown size={18} />
          </IconButton>
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
                            max-w-[85%] p-3 rounded-lg text-[13px] leading-relaxed
                            ${msg.role === 'user'
                                ? 'bg-primary-600 text-white rounded-br-none'
                                : 'bg-white text-slate-700 rounded-tl-none border border-slate-200'}
                        `}
                    >
                        {/* Render simple markdown-like bold */}
                        <p dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />
                        <span className={`text-[11px] mt-2 block ${msg.role === 'user' ? 'text-white/70' : 'text-slate-400'}`}>
                            {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                    </div>
                </div>
            ))}

            {isTyping && (
                <div className="flex justify-start">
                    <div className="bg-white p-3 rounded-lg rounded-tl-none border border-slate-200 flex gap-1">
                        <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"></span>
                        <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce delay-100"></span>
                        <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce delay-200"></span>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-white p-3 border-t border-slate-100">
            {/* Quick Suggestions */}
            {messages.length < 4 && !isTyping && (
                <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar mb-2">
                    {suggestions.map((sug, i) => (
                        <button
                            key={i}
                            onClick={() => handleSendMessage(sug)}
                            className="whitespace-nowrap px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-primary-50 hover:text-primary-700 hover:border-primary-200 transition-colors"
                        >
                            {sug}
                        </button>
                    ))}
                </div>
            )}

            {/* File Preview */}
            {selectedFile && (
                <div className="flex items-center gap-2 mb-2 p-2 bg-primary-50 rounded-lg border border-primary-100">
                    <div className="bg-primary-100 p-1.5 rounded-md text-primary-600">
                        <Paperclip size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-slate-500">Arquivo selecionado</p>
                        <p className="text-xs font-medium text-slate-700 truncate">{selectedFile.name}</p>
                    </div>
                    <IconButton variant="ghost" size="xs" onClick={() => setSelectedFile(null)} aria-label="Remover anexo">
                        <X size={14} />
                    </IconButton>
                </div>
            )}

            <div className="relative flex items-center gap-2">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".xlsx,.xls,.pdf,.txt,.csv"
                />
                <IconButton
                    variant={selectedFile ? 'primary' : 'outline'}
                    size="lg"
                    onClick={() => fileInputRef.current?.click()}
                    title="Anexar arquivo (Excel, PDF)"
                    aria-label="Anexar arquivo"
                >
                    <Paperclip size={14} />
                </IconButton>
                <Input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Sua mensagem ou comando..."
                    wrapperClassName="flex-1"
                />
                <IconButton
                    variant="primary"
                    size="lg"
                    onClick={() => handleSendMessage()}
                    disabled={(!inputValue.trim() && !selectedFile) || isTyping}
                    aria-label="Enviar mensagem"
                >
                    <Send size={14} />
                </IconButton>
            </div>

            <div className="text-center mt-2">
                <span className="text-[11px] text-slate-400">Powered by Bia AI • Plaelo</span>
            </div>
        </div>
      </div>
    </>
  );
};
