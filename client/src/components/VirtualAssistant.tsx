import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, ChevronDown, Home, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface Message {
  id: number;
  from: 'bot' | 'user';
  text: string;
  isMenu?: boolean;
}

const MENU_OPTIONS = [
  { key: '1', label: '1 — Como fazer pedido' },
  { key: '2', label: '2 — Como cancelar pedido' },
  { key: '3', label: '3 — Como cadastrar empresa' },
  { key: '4', label: '4 — Como exportar pedidos' },
  { key: '5', label: '5 — Falar com suporte' },
];

const ANSWERS: Record<string, string> = {
  '1': 'Para fazer um pedido: acesse "Novo Pedido" no menu lateral, escolha o dia de entrega disponível, selecione os produtos e quantidades, e clique em "Finalizar Pedido". Você receberá uma confirmação após o envio.',
  '2': 'Para cancelar um pedido, entre em contato com a equipe de operações. Pedidos só podem ser cancelados até 2 dias úteis antes da entrega, até às 09h. Acesse "Meus Pedidos" para ver o status atual do seu pedido.',
  '3': 'Para cadastrar uma empresa: acesse "Empresas" no menu administrativo, clique em "Nova Empresa", preencha os dados (nome, CNPJ, endereço, grupo de preço) e salve. A empresa terá acesso ao portal após o cadastro.',
  '4': 'Para exportar pedidos: acesse "Pedidos" ou "Painel Financeiro" no menu, use os filtros de data/empresa e clique no botão "Exportar". Gera um arquivo CSV com todos os dados do período selecionado.',
  '5': 'Para falar com o suporte da VivaFrutaz, entre em contato com a equipe pelo e-mail ou WhatsApp informados no seu contrato. Para questões urgentes sobre entregas, contate o gerente de operações diretamente.',
};

const FAQ_EXTRA: Array<{ patterns: string[]; answer: string }> = [
  { patterns: ['ocorrencia', 'ocorrência', 'problema', 'reclamação'], answer: 'Para registrar uma ocorrência: acesse "Ocorrências" no menu, clique em "Nova Ocorrência", descreva o problema e envie. A equipe será notificada.' },
  { patterns: ['logistica', 'logística', 'rota', 'motorista', 'entrega', 'veículo'], answer: 'O módulo de Logística (menu lateral) permite cadastrar motoristas, veículos e rotas de entrega. Disponível para Administradores e Gerentes de Operações.' },
  { patterns: ['cotação', 'cotacao', 'empresa interessada'], answer: 'Para registrar interesse de nova empresa: acesse "Cotação de Empresas" no menu, preencha os dados, volume estimado e produtos de interesse.' },
  { patterns: ['senha', 'esqueci senha'], answer: 'Para trocar a senha acesse o menu de perfil. Administradores gerenciam senhas de clientes em "Senhas de Clientes".' },
  { patterns: ['financeiro', 'faturamento', 'nota fiscal', 'nimbi'], answer: 'O Painel Financeiro mostra pedidos com filtros por data, empresa e produto. Exporte no formato Nimbi (para ERPs) ou CSV padrão.' },
  { patterns: ['backup', 'banco de dados'], answer: 'Backups automáticos são feitos diariamente às 17h. Para baixar: acesse "Backup & E-mails" e clique em "Executar Backup".' },
  { patterns: ['dashboard executivo', 'painel executivo', 'kpi', 'faturamento'], answer: 'O Dashboard Executivo (menu lateral) exibe faturamento, top empresas, produtos mais vendidos, clientes inativos e previsão de compra.' },
  { patterns: ['modo teste', 'teste'], answer: 'O Modo Teste ativa um banner amarelo no topo. Ative/desative no Painel Administrativo. Pedidos de teste não afetam dados reais.' },
];

function findFaqAnswer(input: string): string | null {
  const lower = input.toLowerCase().trim();
  for (const faq of FAQ_EXTRA) {
    if (faq.patterns.some(p => lower.includes(p))) return faq.answer;
  }
  return null;
}

const MENU_TEXT = 'Olá! Sou o Assistente VivaFrutaz 🍊. O que você precisa?\n\n' + MENU_OPTIONS.map(o => o.label).join('\n');

const INITIAL_MESSAGES: Message[] = [
  { id: 0, from: 'bot', text: MENU_TEXT, isMenu: true },
];

export function VirtualAssistant() {
  const { user, company } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [disabled, setDisabled] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isLoggedIn = !!(user || company);
  if (!isLoggedIn) return null;

  useEffect(() => {
    if (open) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  }, [messages, open]);

  const addBotMessage = (text: string, isMenu?: boolean) => {
    setMessages(prev => [...prev, { id: Date.now(), from: 'bot', text, isMenu }]);
  };

  const addUserMessage = (text: string) => {
    setMessages(prev => [...prev, { id: Date.now(), from: 'user', text }]);
  };

  const returnToMenu = () => {
    addBotMessage(MENU_TEXT, true);
  };

  const handleMenuOption = (key: string) => {
    addUserMessage(MENU_OPTIONS.find(o => o.key === key)?.label || key);
    setDisabled(true);
    setTimeout(() => {
      if (ANSWERS[key]) {
        addBotMessage(ANSWERS[key]);
      }
      setDisabled(false);
    }, 350);
  };

  const sendMessage = (text?: string) => {
    const msg = text || input.trim();
    if (!msg || disabled) return;
    setInput('');

    // Check if it's a menu number
    const trimmed = msg.trim();
    const menuNum = ['1','2','3','4','5'].find(n => trimmed === n || trimmed.startsWith(n + ' ') || trimmed.startsWith(n + '.') || trimmed.startsWith(n + '-'));
    if (menuNum) {
      addUserMessage(msg);
      setDisabled(true);
      setTimeout(() => {
        if (ANSWERS[menuNum]) addBotMessage(ANSWERS[menuNum]);
        setDisabled(false);
      }, 350);
      return;
    }

    addUserMessage(msg);
    setDisabled(true);
    setTimeout(() => {
      const faqAnswer = findFaqAnswer(msg);
      if (faqAnswer) {
        addBotMessage(faqAnswer);
      } else {
        addBotMessage('Não encontrei uma resposta específica. Por favor, escolha uma das opções do menu abaixo ou entre em contato com o suporte.', true);
      }
      setDisabled(false);
    }, 350);
  };

  const handleReset = () => {
    setMessages(INITIAL_MESSAGES);
    setInput('');
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        data-testid="button-assistant-toggle"
        className="fixed bottom-5 right-5 z-50 w-14 h-14 bg-primary text-white rounded-full shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 transition-all"
        aria-label="Abrir assistente"
      >
        {open ? <ChevronDown className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {/* Chat window */}
      {open && (
        <div
          data-testid="assistant-window"
          className="fixed bottom-24 right-5 z-50 w-80 md:w-96 bg-card rounded-2xl shadow-2xl border border-border/50 flex flex-col"
          style={{ maxHeight: '72vh' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 p-4 bg-primary rounded-t-2xl text-white">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm">Assistente VivaFrutaz</p>
              <p className="text-xs text-white/70">Tire suas dúvidas aqui</p>
            </div>
            <button
              data-testid="button-assistant-reset"
              onClick={handleReset}
              className="hover:bg-white/20 rounded-lg p-1.5 transition-colors"
              title="Novo chat"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setOpen(false)} data-testid="button-assistant-close" className="hover:bg-white/20 rounded-lg p-1 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: '42vh' }}>
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.from === 'bot' && (
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                    <Bot className="w-3.5 h-3.5 text-primary" />
                  </div>
                )}
                <div className="max-w-[82%]">
                  <div className={`px-3 py-2 rounded-xl text-sm ${m.from === 'user' ? 'bg-primary text-white rounded-br-sm' : 'bg-muted text-foreground rounded-bl-sm'}`}>
                    {m.text.split('\n').map((line, i) => <span key={i}>{line}{i < m.text.split('\n').length - 1 && <br />}</span>)}
                  </div>
                  {/* Menu options as clickable buttons */}
                  {m.isMenu && m.from === 'bot' && (
                    <div className="mt-2 flex flex-col gap-1.5">
                      {MENU_OPTIONS.map(opt => (
                        <button
                          key={opt.key}
                          data-testid={`button-menu-option-${opt.key}`}
                          onClick={() => handleMenuOption(opt.key)}
                          disabled={disabled}
                          className="w-full text-left text-xs px-3 py-2 bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-xl transition-colors font-medium text-primary disabled:opacity-50"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {/* Navigation buttons after bot answer (not menu) */}
                  {!m.isMenu && m.from === 'bot' && m.id !== 0 && (
                    <div className="mt-2 flex gap-1.5">
                      <button
                        data-testid="button-back-to-menu"
                        onClick={returnToMenu}
                        className="text-xs px-2.5 py-1.5 bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-lg text-primary font-medium flex items-center gap-1 transition-colors"
                      >
                        <Home className="w-3 h-3" /> Voltar ao Menu
                      </button>
                      <button
                        data-testid="button-new-question"
                        onClick={() => { setInput(''); }}
                        className="text-xs px-2.5 py-1.5 bg-muted hover:bg-muted/70 rounded-lg text-muted-foreground font-medium transition-colors"
                      >
                        Nova Pergunta
                      </button>
                      <button
                        onClick={() => setOpen(false)}
                        className="text-xs px-2.5 py-1.5 bg-muted hover:bg-muted/70 rounded-lg text-muted-foreground font-medium transition-colors"
                      >
                        Fechar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border/50 flex gap-2">
            <input
              data-testid="input-assistant-message"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !disabled && sendMessage()}
              placeholder="Digite 1-5 ou sua pergunta..."
              disabled={disabled}
              className="flex-1 text-sm px-3 py-2 bg-muted rounded-xl border-0 outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              data-testid="button-assistant-send"
              onClick={() => sendMessage()}
              disabled={disabled || !input.trim()}
              className="w-9 h-9 bg-primary text-white rounded-xl flex items-center justify-center disabled:opacity-40 hover:bg-primary/90 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
