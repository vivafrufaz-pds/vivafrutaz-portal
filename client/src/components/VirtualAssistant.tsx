import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Bot, User, Clock, RefreshCw, ChevronRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';

interface Message {
  id: number;
  from: 'bot' | 'user';
  text: string;
  timestamp: Date;
  isError?: boolean;
}

interface SessionContext {
  action?: string;
  step?: string;
  data?: Record<string, any>;
}

function renderMarkdown(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isBot = msg.from === 'bot';
  return (
    <div className={`flex items-start gap-2 ${isBot ? '' : 'flex-row-reverse'}`}>
      <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${isBot ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
        {isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
      </div>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
        isBot
          ? msg.isError
            ? 'bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:text-red-400'
            : 'bg-muted text-foreground'
          : 'bg-primary text-primary-foreground'
      }`}>
        {isBot ? renderMarkdown(msg.text) : msg.text}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2">
      <div className="w-7 h-7 rounded-full flex-shrink-0 bg-primary/10 text-primary flex items-center justify-center">
        <Bot className="w-4 h-4" />
      </div>
      <div className="bg-muted rounded-2xl px-4 py-3 flex items-center gap-1.5">
        <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

const QUICK_ACTIONS_ADMIN = [
  { label: '📦 Pedidos hoje', message: 'Como está o movimento de pedidos hoje?' },
  { label: '⏳ Pendentes', message: 'Quais pedidos estão pendentes?' },
  { label: '🏢 Sem pedido', message: 'Quais empresas ainda não fizeram pedido nesta semana?' },
  { label: '🌤️ Clima', message: 'Qual a previsão do tempo hoje em São Paulo?' },
  { label: '🔧 Sistema', message: 'Como está o sistema?' },
  { label: '➕ Criar empresa', message: 'Adicionar nova empresa no sistema' },
];

const QUICK_ACTIONS_CLIENT = [
  { label: '📦 Meus pedidos', message: 'Como estão meus pedidos?' },
  { label: '📅 Entrega', message: 'Qual a previsão de entrega?' },
  { label: '🌤️ Clima', message: 'Qual a previsão do tempo?' },
  { label: '📞 Suporte', message: 'Como entrar em contato com o suporte?' },
];

let msgId = 1;
const nextId = () => msgId++;

const INITIAL_BOT_MESSAGE = (isClient: boolean, name: string) => ({
  id: nextId(),
  from: 'bot' as const,
  text: isClient
    ? `Olá${name ? `, ${name}` : ''}! 👋 Sou o Assistente VivaFrutaz.\n\nPosso ajudar com informações sobre seus pedidos, previsão de entrega e clima. Use os atalhos abaixo ou escreva sua pergunta:`
    : `Olá${name ? `, ${name}` : ''}! 👋 Sou o Assistente IA VivaFrutaz.\n\nPosso consultar pedidos, empresas, clima e executar tarefas no sistema. Use os atalhos abaixo ou escreva sua pergunta livremente:`,
  timestamp: new Date(),
});

export function VirtualAssistant() {
  const { user, company, isStaff, isClient } = useAuth();
  const isLoggedIn = !!user || !!company;

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionContext, setSessionContext] = useState<SessionContext | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const name = user?.name?.split(' ')[0] || (company as any)?.companyName?.split(' ')[0] || '';

  const { data: intelligenceData } = useQuery<any>({
    queryKey: ['/api/admin/intelligence'],
    enabled: isStaff && isLoggedIn,
    staleTime: 5 * 60 * 1000,
  });

  const { data: historyData } = useQuery<any[]>({
    queryKey: ['/api/assistant/history'],
    enabled: isLoggedIn && showHistory,
    staleTime: 60 * 1000,
  });

  const criticalCount = isStaff
    ? (intelligenceData?.summary?.critical ?? 0) + (intelligenceData?.summary?.high ?? 0)
    : 0;

  useEffect(() => {
    if (isLoggedIn && !initialized) {
      setMessages([INITIAL_BOT_MESSAGE(!!isClient, name)]);
      setInitialized(true);
    }
  }, [isLoggedIn, initialized, isClient, name]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isTyping) return;

    const userMsg: Message = {
      id: nextId(),
      from: 'user',
      text: messageText.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: messageText.trim(), sessionContext }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      setSessionContext(data.sessionContext || null);

      setMessages(prev => [...prev, {
        id: nextId(),
        from: 'bot',
        text: data.response || 'Desculpe, não consegui processar sua mensagem.',
        timestamp: new Date(),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: nextId(),
        from: 'bot',
        text: '⚠️ Erro de conexão. Verifique sua sessão e tente novamente.',
        timestamp: new Date(),
        isError: true,
      }]);
    } finally {
      setIsTyping(false);
    }
  }, [sessionContext, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const resetChat = () => {
    setMessages([INITIAL_BOT_MESSAGE(!!isClient, name)]);
    setSessionContext(null);
    setShowHistory(false);
  };

  const quickActions = isClient ? QUICK_ACTIONS_CLIENT : QUICK_ACTIONS_ADMIN;

  if (!isLoggedIn) return null;

  return (
    <>
      {/* Floating Button */}
      <button
        data-testid="button-virtual-assistant"
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-2xl shadow-primary/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-200"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        {!open && criticalCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {criticalCount > 9 ? '9+' : criticalCount}
          </span>
        )}
      </button>

      {/* Chat Window */}
      {open && (
        <div
          data-testid="panel-virtual-assistant"
          className="fixed bottom-24 right-6 z-50 w-[360px] max-h-[600px] bg-card border border-border/50 rounded-3xl shadow-2xl shadow-black/20 flex flex-col overflow-hidden"
          style={{ maxHeight: 'calc(100vh - 120px)' }}
        >
          {/* Header */}
          <div className="p-4 bg-primary text-primary-foreground flex items-center gap-3 flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-primary-foreground/20 flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm leading-none">Assistente IA</p>
              <p className="text-xs text-primary-foreground/70 mt-0.5">VivaFrutaz • Online</p>
            </div>
            <div className="flex items-center gap-1">
              {!isClient && (
                <button
                  onClick={() => setShowHistory(h => !h)}
                  className="w-8 h-8 rounded-xl bg-primary-foreground/10 hover:bg-primary-foreground/20 flex items-center justify-center transition-colors"
                  title="Histórico"
                  data-testid="button-show-history"
                >
                  <Clock className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={resetChat}
                className="w-8 h-8 rounded-xl bg-primary-foreground/10 hover:bg-primary-foreground/20 flex items-center justify-center transition-colors"
                title="Novo chat"
                data-testid="button-reset-chat"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* History Panel */}
          {showHistory && (
            <div className="border-b border-border/50 bg-muted/30 overflow-y-auto max-h-40 flex-shrink-0">
              <p className="text-xs font-bold text-muted-foreground px-4 pt-3 pb-1">Histórico de Interações</p>
              {!historyData ? (
                <p className="text-xs text-muted-foreground px-4 py-2">Carregando...</p>
              ) : historyData.length === 0 ? (
                <p className="text-xs text-muted-foreground px-4 py-2">Nenhuma interação registrada.</p>
              ) : (
                historyData.slice(0, 10).map((h: any) => (
                  <div key={h.id} className="px-4 py-2 border-b border-border/20 last:border-0">
                    <p className="text-xs font-medium text-foreground truncate">{h.message}</p>
                    <p className="text-xs text-muted-foreground truncate">{h.response?.slice(0, 60)}...</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">{new Date(h.createdAt).toLocaleString('pt-BR')}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {messages.map(msg => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          {/* Quick Actions */}
          <div className="px-3 py-2 border-t border-border/30 flex-shrink-0">
            <div className="flex flex-wrap gap-1.5">
              {quickActions.map(action => (
                <button
                  key={action.label}
                  onClick={() => sendMessage(action.message)}
                  disabled={isTyping}
                  className="px-2.5 py-1.5 bg-muted hover:bg-primary/10 hover:text-primary rounded-xl text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                  data-testid={`quick-action-${action.label.split(' ').pop()?.toLowerCase()}`}
                >
                  {action.label}
                  <ChevronRight className="w-3 h-3 opacity-50" />
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-border/50 flex gap-2 flex-shrink-0 bg-card">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={sessionContext?.action === 'create_company' ? 'Responda à pergunta acima...' : 'Digite sua pergunta...'}
              disabled={isTyping}
              className="flex-1 px-4 py-2.5 rounded-xl bg-background border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50 transition-all"
              data-testid="input-assistant-message"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 transition-all flex-shrink-0"
              data-testid="button-assistant-send"
            >
              {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
