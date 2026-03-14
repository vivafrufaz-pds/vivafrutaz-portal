import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, ChevronDown } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface Message {
  id: number;
  from: 'bot' | 'user';
  text: string;
}

const FAQ: Array<{ patterns: string[]; answer: string }> = [
  {
    patterns: ['pedido', 'como fazer pedido', 'novo pedido', 'criar pedido'],
    answer: 'Para fazer um pedido: acesse "Novo Pedido" no menu lateral, escolha o dia de entrega disponível, selecione os produtos e quantidades, e clique em "Finalizar Pedido". Você receberá um e-mail de confirmação.'
  },
  {
    patterns: ['cancelar pedido', 'cancelar', 'desistir pedido'],
    answer: 'Para cancelar um pedido, entre em contato com a equipe de operações da VivaFrutaz. Pedidos só podem ser cancelados antes do prazo de corte. Acesse "Meus Pedidos" para ver o status atual do seu pedido.'
  },
  {
    patterns: ['exportar', 'baixar pedidos', 'excel', 'relatório', 'relatorio'],
    answer: 'Para exportar pedidos ou relatórios, acesse a seção correspondente (Pedidos, Relatório Financeiro, Logística, etc.) e clique no botão "Exportar" — ele gera um arquivo CSV/Excel com todos os dados do período selecionado.'
  },
  {
    patterns: ['cadastrar empresa', 'nova empresa', 'adicionar empresa'],
    answer: 'Para cadastrar uma nova empresa: acesse "Empresas" no menu administrativo, clique em "Nova Empresa", preencha os dados (nome, CNPJ, endereço, grupo de preço) e salve. A empresa receberá um e-mail com as credenciais de acesso.'
  },
  {
    patterns: ['senha', 'esqueci senha', 'reset senha', 'trocar senha', 'mudar senha'],
    answer: 'Para trocar a senha: usuários do sistema podem usar "Alterar Senha" no menu do perfil. Clientes que esqueceram a senha devem solicitar redefinição no portal. Administradores podem gerenciar isso em "Senhas de Clientes".'
  },
  {
    patterns: ['ocorrencia', 'ocorrência', 'problema', 'reclamação', 'reclamacao'],
    answer: 'Para registrar uma ocorrência: acesse "Ocorrências" no menu, clique em "Nova Ocorrência", informe o tipo (problema de entrega, produto com defeito, etc.), descreva o problema e envie. A equipe será notificada e entrará em contato.'
  },
  {
    patterns: ['logistica', 'logística', 'rota', 'motorista', 'entrega', 'veículo'],
    answer: 'O módulo de Logística está disponível no menu para Administradores e Gerentes de Operações. Lá você pode cadastrar motoristas e veículos, criar rotas de entrega com data e hora, e gerenciar manutenções da frota.'
  },
  {
    patterns: ['cotação', 'cotacao', 'empresa interessada', 'novo cliente'],
    answer: 'Para registrar interesse de uma nova empresa: acesse "Cotação de Empresas" no menu, clique em "Nova Cotação", preencha os dados da empresa, volume estimado e produtos de interesse. Você pode atribuir um grupo de preço e acompanhar o status (Pendente, Em análise, Aprovado).'
  },
  {
    patterns: ['grupo de preço', 'grupo de preco', 'preço', 'preco', 'desconto'],
    answer: 'Os grupos de preço definem os preços que cada empresa vê. Cada grupo tem uma taxa administrativa que é adicionada ao preço base dos produtos. Clientes nunca veem o preço base ou a taxa — apenas o preço final.'
  },
  {
    patterns: ['financeiro', 'faturamento', 'nota fiscal', 'nimbi'],
    answer: 'O Painel Financeiro mostra pedidos com filtros por data, empresa e produto. É possível exportar em formato Nimbi (para integração com ERPs) ou padrão CSV. O campo "Validade Nimbi" pode ser editado diretamente na lista de pedidos.'
  },
  {
    patterns: ['backup', 'banco de dados', 'restaurar'],
    answer: 'Backups automáticos são feitos diariamente às 17h. Para baixar um backup manualmente, acesse "Backup & E-mails" no menu administrativo e clique em "Executar Backup". Os últimos 30 backups ficam disponíveis para download.'
  },
  {
    patterns: ['dashboard executivo', 'painel executivo', 'vendas', 'faturamento'],
    answer: 'O Dashboard Executivo (acesso: Admin, Diretor, Financeiro, Dev) exibe: faturamento do dia/semana/mês, top empresas, produtos mais vendidos, clientes inativos, previsão de compra, e alertas automáticos. Use os filtros de período para analisar diferentes janelas de tempo.'
  },
  {
    patterns: ['modo teste', 'modo de teste', 'teste', 'pedido teste'],
    answer: 'O Modo Teste ativa um banner amarelo no topo do sistema e permite criar pedidos de teste que não afetam o sistema real. Para ativar/desativar, acesse o Painel Administrativo e use o botão "Ativar Modo Teste".'
  },
  {
    patterns: ['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'hello', 'help', 'ajuda'],
    answer: 'Olá! Sou o Assistente VivaFrutaz. Posso te ajudar com: pedidos, exportações, cadastros, logística, ocorrências, financeiro, cotações e muito mais. O que você precisa saber?'
  },
  {
    patterns: ['obrigado', 'obrigada', 'valeu', 'thanks'],
    answer: 'De nada! Se precisar de mais ajuda, é só perguntar. Estou aqui para ajudar! 😊'
  },
];

const QUICK_QUESTIONS = [
  'Como fazer um pedido?',
  'Como registrar uma ocorrência?',
  'Como exportar relatórios?',
  'Como cadastrar uma empresa?',
  'Como usar a logística?',
];

function findAnswer(input: string): string {
  const lower = input.toLowerCase().trim();
  for (const faq of FAQ) {
    if (faq.patterns.some(p => lower.includes(p))) {
      return faq.answer;
    }
  }
  return 'Não encontrei uma resposta específica para isso. Por favor, entre em contato com o suporte da VivaFrutaz ou consulte o manual do sistema. Você também pode perguntar sobre: pedidos, ocorrências, logística, exportações, cadastros ou financeiro.';
}

export function VirtualAssistant() {
  const { user, company, isStaff, isClient } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, from: 'bot', text: 'Olá! Sou o Assistente VivaFrutaz 🍊. Como posso te ajudar hoje?' }
  ]);
  const [input, setInput] = useState('');
  const [disabled, setDisabled] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isLoggedIn = !!(user || company);
  if (!isLoggedIn) return null;

  useEffect(() => {
    if (open) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, [messages, open]);

  const sendMessage = (text?: string) => {
    const msg = text || input.trim();
    if (!msg) return;
    setInput('');
    const userId = Date.now();
    setMessages(prev => [...prev, { id: userId, from: 'user', text: msg }]);
    setDisabled(true);
    setTimeout(() => {
      const answer = findAnswer(msg);
      setMessages(prev => [...prev, { id: userId + 1, from: 'bot', text: answer }]);
      setDisabled(false);
    }, 400);
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
          style={{ maxHeight: '70vh' }}
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
            <button onClick={() => setOpen(false)} className="hover:bg-white/20 rounded-lg p-1 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: '40vh' }}>
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.from === 'bot' && (
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                    <Bot className="w-3.5 h-3.5 text-primary" />
                  </div>
                )}
                <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${m.from === 'user' ? 'bg-primary text-white rounded-br-sm' : 'bg-muted text-foreground rounded-bl-sm'}`}>
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Quick questions */}
          {messages.length <= 2 && (
            <div className="px-4 pb-2">
              <p className="text-xs text-muted-foreground mb-2">Perguntas rápidas:</p>
              <div className="flex flex-wrap gap-1">
                {QUICK_QUESTIONS.map(q => (
                  <button key={q} onClick={() => sendMessage(q)}
                    className="text-xs px-2 py-1 bg-muted hover:bg-muted/70 rounded-lg transition-colors text-left">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-border/50 flex gap-2">
            <input
              data-testid="input-assistant-message"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !disabled && sendMessage()}
              placeholder="Digite sua dúvida..."
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
