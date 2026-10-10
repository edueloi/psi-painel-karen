
import React, { useState, useRef, useEffect } from 'react';
import { getToken } from '../../services/tokenStorage';
import {
  Sparkles, Send, X, Bot, Calculator, TrendingUp, FileText,
  ReceiptText, Loader2, ChevronDown
} from 'lucide-react';
import { API_BASE_URL } from '../../services/api';
import { IconButton } from '../UI';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

interface AuraContabilProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUGGESTIONS = [
  'Quanto devo de Carnê-Leão este mês?',
  'Calcule meu IR do mês atual',
  'Quais despesas posso deduzir?',
  'Preciso emitir Nota Fiscal?',
  'Como calcular meu INSS autônomo?',
  'Resumo fiscal do ano atual',
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export const AuraContabil: React.FC<AuraContabilProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: `${getGreeting()}! Sou a **Aura Contábil**, sua assistente especializada em tributação e contabilidade para psicólogos. 📊\n\nTenho acesso a **todos os seus dados financeiros** e posso calcular seu Carnê-Leão, analisar deduções, estimar impostos e te orientar sobre obrigações fiscais. Como posso ajudar?`,
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = async (textOverride?: string) => {
    const text = textOverride || input.trim();
    if (!text) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const token = getToken();
      const history = [...messages, userMsg].map(m => ({
        role: m.role,
        text: m.text,
      }));

      const res = await fetch(`${API_BASE_URL}/ai/aura-contabil`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok) throw new Error('Erro na resposta do servidor');
      const data = await res.json();

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: data.text || 'Desculpe, não consegui processar sua pergunta.',
        timestamp: new Date(),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: 'Tive um problema ao processar sua solicitação. Verifique sua conexão e tente novamente.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Simple markdown renderer for **bold** and newlines
  const renderText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, li) => {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <React.Fragment key={li}>
          {parts.map((part, pi) =>
            pi % 2 === 1 ? <strong key={pi}>{part}</strong> : <span key={pi}>{part}</span>
          )}
          {li < lines.length - 1 && <br />}
        </React.Fragment>
      );
    });
  };

  return (
    <div
      className={`fixed bottom-6 right-6 z-[200] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
        isOpen ? 'opacity-100 pointer-events-auto translate-y-0 scale-100' : 'opacity-0 pointer-events-none translate-y-6 scale-95'
      }`}
    >
      {/* Panel */}
      <div
        className="w-[420px] max-w-[calc(100vw-48px)] bg-white rounded-lg flex flex-col overflow-hidden border border-slate-200"
        style={{ maxHeight: 'calc(100vh - 48px)', height: '680px' }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between bg-primary-600 px-4 py-3 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/20">
              <Calculator size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-medium leading-tight">Aura Contábil</p>
              <p className="text-[11px] text-white/80">Especialista fiscal · Online</p>
            </div>
          </div>
          <IconButton
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Fechar assistente"
            className="text-white hover:bg-white/10 hover:text-white"
          >
            <X size={16} />
          </IconButton>
        </div>

        {/* Context pills */}
        <div className="flex gap-2 px-4 py-2.5 bg-primary-50 border-b border-primary-100 overflow-x-auto shrink-0">
          {[
            { icon: <TrendingUp size={10} />, label: 'Seus dados reais' },
            { icon: <ReceiptText size={10} />, label: 'Carnê-Leão' },
            { icon: <FileText size={10} />, label: 'NFS-e & ISS' },
          ].map((pill) => (
            <div key={pill.label} className="flex items-center gap-1.5 bg-white border border-primary-200 px-3 py-1 rounded-lg shrink-0">
              <span className="text-primary-500">{pill.icon}</span>
              <span className="text-[11px] font-medium text-primary-700">{pill.label}</span>
            </div>
          ))}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {msg.role === 'model' && (
                <div className="w-7 h-7 rounded-lg bg-primary-100 border border-primary-200 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot size={14} className="text-primary-600" />
                </div>
              )}
              <div
                className={`max-w-[82%] px-3 py-2.5 rounded-lg text-[13px] leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary-600 text-white rounded-tr-sm'
                    : 'bg-slate-50 border border-slate-100 text-slate-700 rounded-tl-sm'
                }`}
              >
                {renderText(msg.text)}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary-100 border border-primary-200 flex items-center justify-center shrink-0">
                <Bot size={14} className="text-primary-600" />
              </div>
              <div className="bg-slate-50 border border-slate-100 px-4 py-3 rounded-lg rounded-tl-sm flex items-center gap-1.5">
                <Loader2 size={12} className="text-primary-500 animate-spin" />
                <span className="text-[11px] text-slate-500">Calculando...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions (only when few messages) */}
        {messages.length <= 1 && (
          <div className="px-4 pb-2 shrink-0">
            <p className="text-[11px] text-slate-500 mb-2">Sugestões rápidas</p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:border-primary-300 hover:bg-primary-50 rounded-lg text-[11px] font-medium text-slate-600 hover:text-primary-700 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-4 pb-4 pt-3 border-t border-slate-100 shrink-0">
          <div className="flex gap-2 items-end bg-slate-50 border border-slate-200 focus-within:border-primary-300 focus-within:bg-white rounded-lg px-4 py-2.5 transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte sobre carnê-leão, deduções, ISS..."
              rows={1}
              className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none resize-none leading-relaxed"
              style={{ maxHeight: 96 }}
            />
            <IconButton
              variant="primary"
              size="sm"
              onClick={() => sendMessage()}
              disabled={!input.trim() || isTyping}
              aria-label="Enviar mensagem"
              className="shrink-0"
            >
              <Send size={14} />
            </IconButton>
          </div>
          <p className="text-[11px] text-slate-400 text-center mt-2">
            Orientação informativa · Consulte um contador para decisões específicas
          </p>
        </div>
      </div>
    </div>
  );
};
