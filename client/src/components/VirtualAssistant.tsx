import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, ChevronDown, Home, RefreshCw, Zap, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';

interface Message {
  id: number;
  from: 'bot' | 'user';
  text: string;
  isMenu?: boolean;
  isAlert?: boolean;
  isReport?: boolean;
  reportLines?: ReportLine[];
}

interface ReportLine {
  icon: string;
  label: string;
  value: string;
  level: 'ok' | 'warn' | 'error';
}

const CLIENT_MENU_OPTIONS = [
  { key: '1', label: '1 — Como fazer meu pedido semanal' },
  { key: '2', label: '2 — Previsão de entrega / janela de pedidos' },
  { key: '3', label: '3 — Catálogo e produtos disponíveis' },
  { key: '4', label: '4 — Pedidos pontuais' },
  { key: '5', label: '5 — Histórico de pedidos' },
  { key: '6', label: '6 — Atualizar dados da empresa' },
  { key: '7', label: '7 — Suporte e contato' },
];

const ADMIN_MENU_OPTIONS = [
  { key: '0', label: '0 — Verificar Sistema (Scan Automático)' },
  { key: '1', label: '1 — Empresas (clientes)' },
  { key: '2', label: '2 — Produtos e categorias' },
  { key: '3', label: '3 — Pedidos e confirmações' },
  { key: '4', label: '4 — Logística e rotas de entrega' },
  { key: '5', label: '5 — Janelas de pedido e exceções' },
  { key: '6', label: '6 — Painel financeiro e exportações' },
  { key: '7', label: '7 — Pedidos pontuais' },
  { key: '8', label: '8 — Compras e estoque' },
  { key: '9', label: '9 — Configurações e outros módulos' },
];

const DEV_EXTRA_OPTIONS = [
  { key: 'D', label: 'D — Logs e Erros do Sistema' },
  { key: 'E', label: 'E — Detector de Bugs (Bug Scanner)' },
];

const CLIENT_ANSWERS: Record<string, string> = {
  '1': `Para fazer seu pedido semanal:
1. Acesse "Novo Pedido" no menu lateral
2. Escolha o dia de entrega disponível dentro da janela de pedidos ativa
3. Selecione os produtos e as quantidades desejadas
4. Clique em "Finalizar Pedido" para confirmar

Você receberá uma confirmação na tela. Pedidos podem ser editados enquanto a janela estiver aberta.`,

  '2': `A previsão de entrega funciona assim:

📅 A equipe VivaFrutaz define janelas de pedido com datas de abertura e fechamento. Após o fechamento, os pedidos são processados e a entrega ocorre nas datas previstas.

Cada janela mostra:
• Data de abertura para fazer pedidos
• Data de fechamento (após essa data não é possível alterar)
• Data prevista de início das entregas

Você pode ver a janela ativa na tela inicial do portal.`,

  '3': `O catálogo mostra todos os produtos disponíveis para sua empresa:

🍊 Frutas frescas — produtos sazonais e permanentes
🥦 Hortifruti / Verduras — itens frescos da semana
🏭 Industrializados — produtos processados e embalados

Cada produto exibe:
• Nome e categoria
• Unidade de venda (kg, caixa, unidade)
• Preço da sua tabela
• Disponibilidade por dia da semana

Produtos sazonais aparecem apenas quando disponíveis. Pergunte sobre um produto específico para mais informações!`,

  '4': `Pedidos pontuais são solicitações especiais fora da janela regular.

Para fazer um pedido pontual:
1. Acesse "Pedidos Pontuais" no menu lateral
2. Clique em "Nova Solicitação"
3. Informe: dia desejado, data, quantidade aproximada e descrição
4. Envie — a equipe VivaFrutaz analisará e entrará em contato

Status possíveis: Pendente → Aprovado ou Recusado

A equipe pode ajustar quantidades ao aprovar.`,

  '5': `Para acessar seu histórico de pedidos:
1. Clique em "Histórico de Pedidos" no menu lateral
2. Filtre por mês, ano ou período
3. Clique em qualquer pedido para ver os detalhes

Você pode ver o status de cada pedido: Confirmado, Em Entrega, Entregue ou Cancelado.`,

  '6': `Para atualizar os dados da sua empresa:
1. Acesse "Perfil da Empresa" no menu lateral
2. Edite os campos disponíveis (endereço, contato, etc.)
3. Salve as alterações

Para dados sensíveis como CNPJ ou razão social, entre em contato com a equipe VivaFrutaz pelo WhatsApp: 11 99411-3911`,

  '7': `Suporte VivaFrutaz:

📱 WhatsApp: 11 99411-3911
⏰ Atendimento: Segunda a Sexta, 7h às 18h

Para registrar uma ocorrência formal:
1. Acesse "Ocorrências" no menu lateral
2. Clique em "Registrar Ocorrência"
3. Descreva o problema e envie

Nossa equipe será notificada e retornará em breve.`,
};

const ADMIN_ANSWERS: Record<string, string> = {
  '1': `Módulo de Empresas:
• Cadastre clientes do sistema com CNPJ, razão social, endereço e contato
• Associe cada empresa a um grupo de preço (tabela de preços)
• Defina o dia de entrega preferencial
• Ative ou desative o acesso ao portal do cliente
• Gerencie senhas de acesso das empresas

Acesse em: Menu → Empresas`,

  '2': `Módulo de Produtos e Categorias:
• Cadastre produtos com nome, categoria, unidade de venda e preço base
• Defina preços por grupo (tabela de preços por empresa)
• Marque produtos como industrializados ou sazonais
• Defina dias disponíveis para pedido por produto
• Adicione dados fiscais: NCM, CFOP e unidade comercial
• Adicione curiosidades educativas sobre o produto

Categorias disponíveis: Frutas, Hortifruti/Verduras, Industrializados`,

  '3': `Módulo de Pedidos:
• Visualize todos os pedidos de todas as empresas
• Confirme pedidos (CONFIRMED) ou cancele (CANCELLED)
• Reabra pedidos para edição (OPEN_FOR_EDITING)
• Adicione observações e notas internas
• Gere DANFE (nota fiscal em PDF)
• Exporte dados fiscais para ERP (Excel ou XML)
• Filtre por empresa, status, data e status fiscal

Status: ACTIVE → CONFIRMED → DELIVERED | CANCELLED`,

  '4': `Módulo de Logística e Rotas:
• Cadastre motoristas e veículos
• Crie rotas de entrega associando empresa + motorista + veículo
• Gerencie o assistente de rota para cada dia
• Acompanhe o status das entregas

O módulo de Logística é acessível para Administradores e Gerentes de Operações.`,

  '5': `Janelas de Pedido e Exceções:
• Crie janelas semanais com data de abertura, fechamento e entrega
• Defina exceções por empresa (janelas específicas)
• Controle de data-lock: impede edição após fechamento
• Reabra pedidos individualmente quando necessário

Exceções permitem que uma empresa tenha janela diferente das demais.`,

  '6': `Painel Financeiro e Exportações:
• Visualize pedidos com filtros por empresa, data e produto
• Veja resumo de valores e quantidades
• Exporte no formato Nimbi (ERP) — CSV ou Excel
• Exporte nota fiscal DANFE em PDF
• Controle de status fiscal: Pendente → Exportada → Emitida → Cancelada
• Gere número de pré-nota automático (VF-NF-XXXXXX)`,

  '7': `Pedidos Pontuais (Admin):
• Visualize todas as solicitações de clientes
• Filtre por status (Pendente, Aprovado, Recusado) e categoria
• Aprove ou recuse com justificativa
• Ajuste quantidades ao aprovar
• Informe data prevista de entrega
• Gere PDF do pedido pontual aprovado

Clientes são notificados automaticamente.`,

  '8': `Compras e Estoque:
• Planejamento de compras: veja o que precisa ser comprado por dia
• Controle de estoque: entrada e saída de produtos
• Controle de desperdício (Waste Control)
• Estoque é reduzido automaticamente ao confirmar pedidos
• Inventário: 4 abas — Estoque, Movimentações, Alertas e Histórico`,

  '9': `Outros módulos do sistema:

🔧 Configurações: suporte, IE, CEP, natureza fiscal, padrões de nota
📢 Avisos/Comunicados: crie anúncios para aparecer no portal dos clientes
👤 Usuários internos: gerencie logins de administradores e operadores
🔑 Senhas de clientes: aprove resets e controle acessos
💾 Backup: execução e download de backups do banco de dados
👨‍💻 Área do Desenvolvedor: ferramentas técnicas, logs e modo de teste
📊 Painel Executivo (Diretoria): visão consolidada de pedidos e finanças`,

  'D': `Logs e Erros do Sistema (Desenvolvedor):

📋 Os logs completos estão disponíveis em:
→ Menu → Área do Desenvolvedor → Aba "Bugs"

Lá você encontra:
• Detector de Bugs com histórico de erros
• Últimos 20 registros de nível ERROR
• Filtros por tipo e status (Aberto / Analisando / Resolvido)
• Exportação de relatório de bugs em .txt

Para monitorar em tempo real: consulte os logs do servidor no terminal ou painel de administração Replit.`,

  'E': `Detector de Bugs (Bug Scanner):

🔍 O Detector de Bugs está em:
→ Menu → Área do Desenvolvedor → Aba "Bugs"

Funcionalidades:
• Filtro por tipo de bug (FRONTEND, API, PERFORMANCE, SECURITY...)
• Status por bug: Aberto → Analisando → Resolvido
• Histórico de erros (últimos 20 do nível ERROR)
• Exportar relatório como arquivo .txt

Para executar o scanner manualmente, clique em "Executar Verificação" na aba de Bugs. O scanner verifica integridade do banco de dados, APIs críticas e saúde do sistema.`,
};

const CLIENT_FAQ: Array<{ patterns: string[]; answer: string }> = [
  { patterns: ['ocorrencia', 'ocorrência', 'problema', 'reclamação', 'reclamacao'], answer: 'Para registrar uma ocorrência: acesse "Ocorrências" no menu, clique em "Registrar Ocorrência", descreva o problema e envie. A equipe VivaFrutaz será notificada e retornará em breve.' },
  { patterns: ['senha', 'esqueci senha', 'trocar senha', 'redefinir senha'], answer: 'Para recuperar sua senha: na tela de login, clique em "Esqueci minha senha" e siga as instruções. Ou entre em contato pelo WhatsApp: 📱 11 99411-3911.' },
  { patterns: ['perfil', 'dados da empresa', 'dados empresa', 'atualizar empresa'], answer: 'Para atualizar os dados da empresa: acesse "Perfil da Empresa" no menu lateral e edite os campos disponíveis.' },
  { patterns: ['whatsapp', 'suporte', 'contato', 'telefone', 'fone', 'falar'], answer: 'Para suporte fale conosco:\n📱 WhatsApp: 11 99411-3911\nSegunda a Sexta, das 7h às 18h.\n\nOu registre em "Ocorrências" no menu.' },
  { patterns: ['entrega', 'quando chega', 'data entrega', 'previsão', 'previsao'], answer: 'A previsão de entrega depende da janela de pedidos ativa para sua empresa. Após o fechamento da janela, os pedidos são processados e entregues na data prevista. Veja a janela ativa na tela inicial.' },
  { patterns: ['cancelar', 'cancelamento', 'cancelar pedido'], answer: 'Para cancelar um pedido, entre em contato com a equipe de operações pelo WhatsApp: 📱 11 99411-3911. Pedidos só podem ser cancelados antes do fechamento da janela.' },
  { patterns: ['catálogo', 'catalogo', 'produtos disponíveis', 'quais produtos'], answer: 'O catálogo exibe todos os produtos disponíveis para sua empresa: frutas, hortifruti e industrializados. Preços, unidades e disponibilidade por dia da semana. Acesse em "Novo Pedido" → veja os produtos disponíveis.' },
  { patterns: ['maçã', 'maca', 'banana', 'laranja', 'morango', 'manga', 'uva', 'abacaxi', 'melancia', 'mamão', 'kiwi', 'pera', 'cereja', 'limão', 'abacate', 'coco', 'goiaba', 'fruta'], answer: 'Para informações sobre produtos específicos, acesse o catálogo em "Novo Pedido". Lá você encontra preços, unidades de venda e disponibilidade. Para dúvidas sobre um produto específico, contate nossa equipe pelo WhatsApp: 📱 11 99411-3911.' },
  { patterns: ['industrializado', 'industrializados', 'embalado', 'processado'], answer: 'Produtos industrializados são itens processados e embalados disponíveis no catálogo. Eles aparecem identificados com a tag "Industrializado" na listagem de produtos.' },
  { patterns: ['sazonal', 'sazonais', 'temporada'], answer: 'Produtos sazonais estão disponíveis apenas em determinadas épocas do ano. Quando disponíveis, aparecem marcados como "Sazonal" no catálogo. Consulte a equipe para saber a disponibilidade atual.' },
  { patterns: ['histórico', 'historico', 'pedidos anteriores', 'pedidos passados'], answer: 'Para ver seus pedidos anteriores: acesse "Histórico de Pedidos" no menu. Filtre por mês, ano ou período. Clique em qualquer pedido para ver os detalhes.' },
  { patterns: ['pontual', 'pedido especial', 'fora da janela', 'especial'], answer: 'Pedidos pontuais são solicitações especiais fora da janela regular. Acesse "Pedidos Pontuais" no menu, clique em "Nova Solicitação", preencha os dados e envie. Nossa equipe analisará e retornará em até 24h.' },
];

const ADMIN_FAQ: Array<{ patterns: string[]; answer: string }> = [
  { patterns: ['logistica', 'logística', 'rota', 'motorista', 'entrega', 'veículo'], answer: 'O módulo de Logística permite cadastrar motoristas, veículos e rotas de entrega. Disponível para Administradores e Gerentes de Operações. Acesse em Menu → Logística.' },
  { patterns: ['senha', 'reset', 'redefinir', 'senha cliente'], answer: 'Senhas de clientes são gerenciadas em "Senhas de Clientes" no menu. Administradores podem aprovar ou recusar solicitações de reset de senha.' },
  { patterns: ['financeiro', 'faturamento', 'nota fiscal', 'nimbi', 'exportar'], answer: 'O Painel Financeiro mostra pedidos com filtros por data, empresa e produto. Exporte no formato Nimbi (ERP), Excel ou XML NF-e. Controle o status fiscal de cada pedido (Pendente → Exportada → Emitida).' },
  { patterns: ['backup', 'banco de dados', 'segurança'], answer: 'Backups são gerenciados em "Backup & E-mails". Administradores podem executar backups manuais e baixar os arquivos. Acesse em Menu → Backup.' },
  { patterns: ['desenvolvedor', 'developer', 'dev', 'técnico', 'tecnico', 'logs', 'bug', 'erro', 'error'], answer: 'A Área do Desenvolvedor contém ferramentas técnicas: logs do sistema, modo de manutenção, modo de teste, detector de bugs e auditoria. Acessível para perfil Desenvolvedor/Admin. Acesse em Menu → Área do Desenvolvedor.' },
  { patterns: ['usuario', 'usuário', 'interno', 'perfil', 'papel', 'role'], answer: 'Usuários internos são gerenciados em "Usuários do Sistema". Perfis disponíveis: Administrador, Gerente de Operações, Gerente de Compras, Financeiro, Diretoria, Desenvolvedor, Logística.' },
  { patterns: ['danfe', 'nfe', 'nf-e', 'nota fiscal', 'pdf nota', 'fiscal'], answer: 'O DANFE é gerado em PDF direto no módulo de Pedidos. Cada pedido tem um painel fiscal com: status, número de pré-nota, exportação ERP (Excel/XML) e geração do DANFE.' },
  { patterns: ['estoque', 'inventário', 'inventario', 'compras', 'purchase'], answer: 'O módulo de Estoque (Inventário) controla entrada/saída de produtos. O planejamento de compras mostra o que precisará ser comprado por dia. Acesse em Menu → Inventário.' },
  { patterns: ['aviso', 'comunicado', 'announcement', 'anuncio', 'anúncio'], answer: 'Comunicados são criados em "Comunicados" no menu. Eles aparecem no portal dos clientes na área inicial. Configure título, mensagem, tipo, prioridade e período de exibição.' },
  { patterns: ['pedido pontual', 'especial', 'pontual'], answer: 'Pedidos pontuais dos clientes são gerenciados em "Pedidos Pontuais" no menu. Você pode aprovar (ajustando quantidades e data de entrega) ou recusar com justificativa. Gere um PDF do pedido aprovado.' },
  { patterns: ['janela', 'window', 'período', 'periodo', 'abertura', 'fechamento'], answer: 'As janelas de pedido definem quando clientes podem fazer pedidos. Configure em "Janelas de Pedido": data de abertura, fechamento e entrega. Exceções permitem janelas específicas por empresa.' },
  { patterns: ['empresa', 'cliente', 'cadastro', 'cnpj', 'razão social'], answer: 'Empresas são os clientes do sistema. Cadastre em Menu → Empresas: nome, CNPJ, endereço, contato e grupo de preço. Cada empresa tem acesso próprio ao portal.' },
  { patterns: ['maçã', 'maca', 'banana', 'laranja', 'fruta', 'produto', 'categoria'], answer: 'Produtos são gerenciados em Menu → Produtos. Você pode cadastrar com: nome, categoria, unidade, preço base, flags (industrializado/sazonal), dias disponíveis, dados fiscais (NCM/CFOP) e curiosidades educativas.' },
  { patterns: ['diretoria', 'executivo', 'dashboard executivo', 'painel executivo'], answer: 'O Painel Executivo (Diretoria) oferece visão consolidada de pedidos, faturamento e métricas. Acessível apenas para perfil Diretoria e Administrador.' },
  { patterns: ['scan', 'verificação', 'verificar', 'checar sistema', 'auditoria'], answer: 'Para verificar o sistema automaticamente, escolha a opção "0 — Verificar Sistema" no menu do assistente. Ele fará um scan completo e mostrará alertas em tempo real.' },
];

function getRoleLabel(role?: string): string {
  const map: Record<string, string> = {
    ADMIN: 'Administrador',
    DIRECTOR: 'Diretoria',
    PURCHASE_MANAGER: 'Gerente de Compras',
    FINANCEIRO: 'Financeiro',
    DEVELOPER: 'Desenvolvedor',
    LOGISTICS: 'Logística',
    OPERATIONS_MANAGER: 'Gerente de Operações',
    SISTEMA_TESTE: 'Sistema Teste',
  };
  return map[role || ''] || 'Interno';
}

function getGreetingTime(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function findFaqAnswer(input: string, isClient: boolean): string | null {
  const lower = input.toLowerCase().trim();
  const faqList = isClient ? CLIENT_FAQ : ADMIN_FAQ;
  for (const faq of faqList) {
    if (faq.patterns.some(p => lower.includes(p))) return faq.answer;
  }
  return null;
}

export function VirtualAssistant() {
  const { user, company } = useAuth();
  const isClient = !!company;
  const isLoggedIn = !!(user || company);
  const isDeveloper = !isClient && (user as any)?.role === 'DEVELOPER';

  const MENU_OPTIONS = isClient
    ? CLIENT_MENU_OPTIONS
    : isDeveloper
      ? [...ADMIN_MENU_OPTIONS, ...DEV_EXTRA_OPTIONS]
      : ADMIN_MENU_OPTIONS;
  const ANSWERS = isClient ? CLIENT_ANSWERS : ADMIN_ANSWERS;

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [disabled, setDisabled] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [scanning, setScanning] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: auditData } = useQuery<any>({
    queryKey: ['/api/admin/audit'],
    enabled: !isClient && isLoggedIn,
    staleTime: 3 * 60 * 1000,
  });

  const { data: ordersData } = useQuery<any[]>({
    queryKey: ['/api/orders'],
    enabled: !isClient && isLoggedIn,
    staleTime: 3 * 60 * 1000,
  });

  const criticalIssues = !isClient && auditData?.issues
    ? (auditData.issues as any[]).filter((i: any) => i.severity === 'CRITICAL' || i.severity === 'HIGH').length
    : 0;

  const activeOrders = Array.isArray(ordersData)
    ? ordersData.filter((o: any) => o.status === 'ACTIVE' || o.status === 'CONFIRMED').length
    : null;

  const buildGreeting = () => {
    const time = getGreetingTime();
    if (isClient) {
      const name = (company as any)?.companyName?.split(' ')[0] || '';
      return `${time}${name ? `, ${name}` : ''}! Sou o Assistente VivaFrutaz 🍊. Como posso ajudar?`;
    }
    const name = (user as any)?.name?.split(' ')[0] || '';
    const role = getRoleLabel((user as any)?.role);
    let base = `${time}${name ? `, ${name}` : ''}! Sou o Assistente VivaFrutaz 🍊\nPerfil: ${role}.`;
    if (activeOrders !== null && activeOrders > 0) {
      base += `\n\n📦 Há ${activeOrders} pedido${activeOrders !== 1 ? 's' : ''} ativo${activeOrders !== 1 ? 's' : ''} no sistema agora.`;
    }
    if (criticalIssues > 0) {
      base += `\n⚠️ ${criticalIssues} problema${criticalIssues !== 1 ? 's' : ''} crítico${criticalIssues !== 1 ? 's' : ''} detectado${criticalIssues !== 1 ? 's' : ''}. Use a opção "0" para ver o relatório.`;
    } else if (auditData) {
      base += `\n✅ Sistema verificado — nenhum problema crítico.`;
    }
    base += '\n\nEscolha uma opção ou digite sua pergunta:';
    return base;
  };

  const buildInitialMessages = (): Message[] => {
    return [{ id: 0, from: 'bot', text: buildGreeting(), isMenu: true }];
  };

  useEffect(() => {
    if (!isLoggedIn) return;
    if (!initialized && (isClient || auditData !== undefined || ordersData !== undefined)) {
      setMessages(buildInitialMessages());
      setInitialized(true);
    }
  }, [isLoggedIn, auditData, ordersData, initialized]);

  useEffect(() => {
    if (!initialized && isLoggedIn && isClient) {
      setMessages(buildInitialMessages());
      setInitialized(true);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (open) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  }, [messages, open]);

  if (!isLoggedIn) return null;

  const addBotMessage = (text: string, opts?: Partial<Pick<Message, 'isMenu' | 'isAlert' | 'isReport' | 'reportLines'>>) => {
    setMessages(prev => [...prev, { id: Date.now(), from: 'bot', text, ...opts }]);
  };

  const addUserMessage = (text: string) => {
    setMessages(prev => [...prev, { id: Date.now(), from: 'user', text }]);
  };

  const returnToMenu = () => {
    addBotMessage(buildGreeting(), { isMenu: true });
  };

  const runSystemScan = async () => {
    setScanning(true);
    setDisabled(true);
    addBotMessage('🔍 Iniciando verificação automática do sistema...');
    await new Promise(r => setTimeout(r, 800));

    const lines: ReportLine[] = [];

    const audit = auditData;
    if (!audit) {
      addBotMessage('Não foi possível obter dados do sistema. Verifique a conexão com o servidor.', { isAlert: true });
      setScanning(false);
      setDisabled(false);
      return;
    }

    const summary = audit.summary || {};
    lines.push({
      icon: '🏢',
      label: 'Empresas ativas',
      value: String(summary.activeCompanies ?? '—'),
      level: 'ok',
    });
    lines.push({
      icon: '📦',
      label: 'Pedidos ativos',
      value: String(activeOrders ?? summary.activeOrders ?? '—'),
      level: activeOrders === 0 ? 'warn' : 'ok',
    });

    const issues: any[] = audit.issues || [];
    const inactiveCompanies = audit.details?.inactiveCompanies?.length ?? 0;
    const inactiveProducts = audit.details?.inactiveProducts?.length ?? 0;
    const loginFails = audit.details?.loginFails?.length ?? 0;
    const sysErrors = audit.details?.systemErrors?.length ?? 0;

    if (inactiveCompanies > 0) {
      lines.push({ icon: '⚠️', label: 'Empresas inativas (+60 dias)', value: `${inactiveCompanies} empresa(s)`, level: inactiveCompanies > 5 ? 'error' : 'warn' });
    } else {
      lines.push({ icon: '✅', label: 'Empresas inativas', value: 'Nenhuma', level: 'ok' });
    }

    if (inactiveProducts > 0) {
      lines.push({ icon: '⚠️', label: 'Produtos inativos', value: `${inactiveProducts} produto(s)`, level: 'warn' });
    } else {
      lines.push({ icon: '✅', label: 'Produtos inativos', value: 'Nenhum', level: 'ok' });
    }

    if (loginFails > 0) {
      lines.push({ icon: '🔐', label: 'Falhas de login recentes', value: `${loginFails} tentativa(s)`, level: loginFails > 10 ? 'error' : 'warn' });
    } else {
      lines.push({ icon: '✅', label: 'Falhas de login', value: 'Nenhuma recente', level: 'ok' });
    }

    if (sysErrors > 0) {
      lines.push({ icon: '🐛', label: 'Erros de sistema', value: `${sysErrors} erro(s) no log`, level: sysErrors > 5 ? 'error' : 'warn' });
    } else {
      lines.push({ icon: '✅', label: 'Erros de sistema', value: 'Nenhum detectado', level: 'ok' });
    }

    const critIssues = issues.filter((i: any) => i.severity === 'CRITICAL' || i.severity === 'HIGH');
    if (critIssues.length > 0) {
      lines.push({ icon: '🚨', label: 'Problemas críticos', value: `${critIssues.length} encontrado(s)`, level: 'error' });
    } else {
      lines.push({ icon: '✅', label: 'Saúde geral do sistema', value: 'Saudável', level: 'ok' });
    }

    const hasWarnings = lines.some(l => l.level !== 'ok');
    const summaryText = hasWarnings
      ? `⚠️ Verificação concluída com alertas — veja o relatório abaixo.`
      : `✅ Sistema verificado — tudo funcionando corretamente.`;

    addBotMessage(summaryText, { isReport: true, reportLines: lines });
    setScanning(false);
    setDisabled(false);
  };

  const handleMenuOption = (key: string) => {
    const label = MENU_OPTIONS.find(o => o.key === key)?.label || key;
    addUserMessage(label);
    if (key === '0') {
      runSystemScan();
      return;
    }
    setDisabled(true);
    setTimeout(() => {
      if (ANSWERS[key]) addBotMessage(ANSWERS[key]);
      setDisabled(false);
    }, 350);
  };

  const sendMessage = (text?: string) => {
    const msg = text || input.trim();
    if (!msg || disabled) return;
    setInput('');

    const trimmed = msg.trim();
    const validKeys = MENU_OPTIONS.map(o => o.key);
    const menuKey = validKeys.find(k =>
      trimmed === k || trimmed.toLowerCase() === k.toLowerCase() ||
      trimmed.startsWith(k + ' ') || trimmed.startsWith(k + '.') || trimmed.startsWith(k + '-')
    );
    if (menuKey) {
      handleMenuOption(menuKey);
      return;
    }

    addUserMessage(msg);
    setDisabled(true);
    setTimeout(() => {
      const faqAnswer = findFaqAnswer(msg, isClient);
      if (faqAnswer) {
        addBotMessage(faqAnswer);
      } else {
        const fallback = isClient
          ? 'Não encontrei uma resposta para sua pergunta. Escolha uma opção abaixo ou fale pelo WhatsApp:\n📱 11 99411-3911'
          : 'Não encontrei uma resposta específica. Escolha uma das opções do menu ou descreva melhor sua dúvida.';
        addBotMessage(fallback, { isMenu: true });
      }
      setDisabled(false);
    }, 350);
  };

  const handleReset = () => {
    setMessages(buildInitialMessages());
    setInput('');
  };

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        data-testid="button-assistant-toggle"
        className="fixed bottom-5 right-5 z-50 w-14 h-14 bg-primary text-white rounded-full shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 transition-all"
        aria-label="Abrir assistente"
      >
        {open ? <ChevronDown className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        {!open && criticalIssues > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {criticalIssues}
          </span>
        )}
      </button>

      {open && (
        <div
          data-testid="assistant-window"
          className="fixed bottom-24 right-5 z-50 w-80 md:w-96 bg-card rounded-2xl shadow-2xl border border-border/50 flex flex-col"
          style={{ maxHeight: '80vh' }}
        >
          <div className="flex items-center gap-3 p-4 bg-primary rounded-t-2xl text-white">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm">Assistente VivaFrutaz</p>
              <p className="text-xs text-white/70">
                {isClient
                  ? 'Suporte ao cliente'
                  : `Suporte interno — ${getRoleLabel((user as any)?.role)}`}
              </p>
            </div>
            {!isClient && (
              <button
                data-testid="button-assistant-scan"
                onClick={() => { if (!scanning && !disabled) { addUserMessage('0 — Verificar Sistema (Scan Automático)'); runSystemScan(); }}}
                title="Scan do sistema"
                className="hover:bg-white/20 rounded-lg p-1.5 transition-colors"
              >
                <Zap className="w-3.5 h-3.5" />
              </button>
            )}
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

          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: '50vh' }}>
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.from === 'bot' && (
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                    <Bot className="w-3.5 h-3.5 text-primary" />
                  </div>
                )}
                <div className="max-w-[82%]">
                  {m.isReport && m.reportLines ? (
                    <div className="space-y-1.5">
                      <div className="px-3 py-2 rounded-xl text-sm bg-muted text-foreground rounded-bl-sm">
                        {m.text}
                      </div>
                      <div className="bg-white border border-border/50 rounded-xl overflow-hidden text-xs">
                        {m.reportLines.map((line, i) => (
                          <div key={i} className={`flex items-center justify-between px-3 py-2 ${i > 0 ? 'border-t border-border/30' : ''} ${line.level === 'error' ? 'bg-red-50' : line.level === 'warn' ? 'bg-orange-50' : ''}`}>
                            <span className="text-muted-foreground flex items-center gap-1.5">
                              <span>{line.icon}</span> {line.label}
                            </span>
                            <span className={`font-bold ${line.level === 'error' ? 'text-red-700' : line.level === 'warn' ? 'text-orange-700' : 'text-green-700'}`}>
                              {line.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className={`px-3 py-2 rounded-xl text-sm ${m.from === 'user' ? 'bg-primary text-white rounded-br-sm' : m.isAlert ? 'bg-orange-50 border border-orange-200 text-orange-800 rounded-bl-sm' : 'bg-muted text-foreground rounded-bl-sm'}`}>
                      {m.text.split('\n').map((line, i) => <span key={i}>{line}{i < m.text.split('\n').length - 1 && <br />}</span>)}
                    </div>
                  )}

                  {m.isMenu && m.from === 'bot' && (
                    <div className="mt-2 flex flex-col gap-1.5">
                      {MENU_OPTIONS.map(opt => (
                        <button
                          key={opt.key}
                          data-testid={`button-menu-option-${opt.key}`}
                          onClick={() => handleMenuOption(opt.key)}
                          disabled={disabled}
                          className={`w-full text-left text-xs px-3 py-2 border rounded-xl transition-colors font-medium disabled:opacity-50 ${
                            opt.key === '0'
                              ? 'bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-800'
                              : opt.key === 'D' || opt.key === 'E'
                                ? 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-800'
                                : 'bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary'
                          }`}
                        >
                          {opt.key === '0' && <AlertTriangle className="w-3 h-3 inline mr-1 mb-0.5" />}
                          {opt.label}
                        </button>
                      ))}
                      {isClient && (
                        <a
                          href="https://wa.me/5511994113911"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full text-center text-xs px-3 py-2 bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl transition-colors font-bold text-green-700 flex items-center justify-center gap-1.5"
                        >
                          📱 WhatsApp: 11 99411-3911
                        </a>
                      )}
                    </div>
                  )}

                  {!m.isMenu && !m.isReport && m.from === 'bot' && m.id !== 0 && (
                    <div className="mt-2 flex gap-1.5 flex-wrap">
                      <button
                        data-testid="button-back-to-menu"
                        onClick={returnToMenu}
                        className="text-xs px-2.5 py-1.5 bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-lg text-primary font-medium flex items-center gap-1 transition-colors"
                      >
                        <Home className="w-3 h-3" /> Voltar ao Menu
                      </button>
                      {isClient && (
                        <a
                          href="https://wa.me/5511994113911"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-2.5 py-1.5 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg text-green-700 font-bold transition-colors"
                        >
                          📱 WhatsApp
                        </a>
                      )}
                      <button
                        onClick={() => setOpen(false)}
                        className="text-xs px-2.5 py-1.5 bg-muted hover:bg-muted/70 rounded-lg text-muted-foreground font-medium transition-colors"
                      >
                        Fechar
                      </button>
                    </div>
                  )}

                  {m.isReport && (
                    <div className="mt-2 flex gap-1.5">
                      <button
                        data-testid="button-back-to-menu"
                        onClick={returnToMenu}
                        className="text-xs px-2.5 py-1.5 bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-lg text-primary font-medium flex items-center gap-1 transition-colors"
                      >
                        <Home className="w-3 h-3" /> Voltar ao Menu
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {scanning && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mr-2 mt-1">
                  <Bot className="w-3.5 h-3.5 text-primary animate-pulse" />
                </div>
                <div className="px-3 py-2 bg-muted rounded-xl text-sm text-muted-foreground flex items-center gap-2">
                  <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="p-3 border-t border-border/50 flex gap-2">
            <input
              data-testid="input-assistant-message"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !disabled && sendMessage()}
              placeholder="Digite um número ou sua pergunta..."
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
