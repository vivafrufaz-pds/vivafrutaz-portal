import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import {
  Shield, RefreshCw, AlertTriangle, CheckCircle, Info, LogIn, ShoppingCart, Edit,
  Scan, Bug, Wrench, Zap, Play, Database, AlertCircle, Trash2, Activity, Server, Clock
} from "lucide-react";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const LEVEL_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  INFO: { label: "INFO", color: "bg-blue-100 text-blue-700", icon: Info },
  WARN: { label: "AVISO", color: "bg-orange-100 text-orange-700", icon: AlertTriangle },
  ERROR: { label: "ERRO", color: "bg-red-100 text-red-700", icon: AlertTriangle },
};

const SEVERITY_CONFIG: Record<string, { color: string; bg: string }> = {
  INFO: { color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  WARN: { color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  ERROR: { color: "text-red-700", bg: "bg-red-50 border-red-200" },
  OK: { color: "text-green-700", bg: "bg-green-50 border-green-200" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
}

type AuditIssue = { severity: string; category: string; message: string };

function analyzeLogsForBugs(logs: any[]): Array<{ type: string; description: string; suggestion: string; priority: 'HIGH' | 'MEDIUM' | 'LOW' }> {
  const bugs = [];
  if (!logs || logs.length === 0) return bugs;

  const loginFails = logs.filter(l => l.action === 'LOGIN_FAILED');
  const recentFails = loginFails.filter(l => (Date.now() - new Date(l.createdAt).getTime()) < 60 * 60 * 1000);
  if (recentFails.length >= 3) {
    const ips = [...new Set(recentFails.map(l => l.ip).filter(Boolean))];
    bugs.push({ type: 'Segurança — Brute Force Potencial', description: `${recentFails.length} tentativas de login falhas na última hora (IPs: ${ips.join(', ') || 'desconhecido'}).`, suggestion: 'Considere implementar rate limiting por IP ou bloquear temporariamente os IPs suspeitos.', priority: 'HIGH' as const });
  }

  const errors = logs.filter(l => l.level === 'ERROR');
  if (errors.length > 0) {
    const grouped: Record<string, number> = {};
    errors.forEach(l => { grouped[l.action] = (grouped[l.action] || 0) + 1; });
    Object.entries(grouped).forEach(([action, count]) => {
      bugs.push({ type: `Erro Recorrente — ${action}`, description: `${count} ocorrência(s) de erro na ação "${action}".`, suggestion: 'Verifique os detalhes nos logs abaixo e confirme se a causa raiz foi corrigida.', priority: count >= 5 ? 'HIGH' as const : 'MEDIUM' as const });
    });
  }

  const last24h = logs.filter(l => (Date.now() - new Date(l.createdAt).getTime()) < 24 * 60 * 60 * 1000);
  if (last24h.length === 0) {
    bugs.push({ type: 'Monitoramento — Logs Ausentes', description: 'Nenhuma atividade registrada nas últimas 24 horas.', suggestion: 'Verifique se o sistema de logs está funcionando corretamente.', priority: 'MEDIUM' as const });
  }

  const unauthorized = logs.filter(l => l.action === 'UNAUTHORIZED_ACCESS');
  if (unauthorized.length > 0) {
    bugs.push({ type: 'Acesso não autorizado detectado', description: `${unauthorized.length} tentativa(s) de acesso não autorizado registradas.`, suggestion: 'Revise as permissões de rotas e verifique os usuários envolvidos.', priority: 'HIGH' as const });
  }

  return bugs;
}

// ─── Health Check Tab ────────────────────────────────────────────────────────
function HealthTab() {
  const { toast } = useToast();
  const { data: health, isLoading, refetch, isFetching } = useQuery<any>({
    queryKey: ['/api/health'],
    enabled: false,
    staleTime: 0,
  });

  const run = async () => { await refetch(); };

  const statusIcon = (s: string) => {
    if (s === 'OK') return <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />;
    if (s === 'WARN') return <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />;
    return <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />;
  };

  const statusBg = (s: string) => {
    if (s === 'OK') return 'border-green-200 bg-green-50';
    if (s === 'WARN') return 'border-orange-200 bg-orange-50';
    return 'border-red-200 bg-red-50';
  };

  const statusText = (s: string) => {
    if (s === 'OK') return 'text-green-700';
    if (s === 'WARN') return 'text-orange-700';
    return 'text-red-700';
  };

  const CHECK_LABELS: Record<string, string> = {
    database: '🗄️ Banco de Dados', auth: '👤 Autenticação / Usuários', logs: '📋 Sistema de Logs',
    server: '🖥️ Servidor', session: '🔐 Sessão Atual', maintenance: '🔧 Modo Manutenção', testMode: '🧪 Modo Teste',
  };

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-2xl border border-border/50 p-6 premium-shadow">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center">
            <Activity className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-lg">Teste de Saúde do Sistema</h3>
            <p className="text-sm text-muted-foreground">Verifica servidor, banco de dados, sessão, modos e configurações.</p>
          </div>
        </div>
        <Button onClick={run} disabled={isLoading || isFetching} data-testid="button-run-health" className="gap-2 mb-6">
          <Server className="w-4 h-4" />
          {isFetching ? 'Verificando...' : 'Executar Teste de Saúde'}
        </Button>

        {health && (
          <div className="space-y-4">
            <div className={`flex items-center gap-3 p-4 rounded-xl border-2 font-bold ${health.overall === 'HEALTHY' ? 'border-green-300 bg-green-50 text-green-700' : 'border-red-300 bg-red-50 text-red-700'}`}>
              {health.overall === 'HEALTHY' ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
              Sistema: {health.overall === 'HEALTHY' ? 'SAUDÁVEL' : 'DEGRADADO'} — Resposta em {health.responseMs}ms
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(health.checks).map(([key, check]: [string, any]) => (
                <div key={key} className={`flex items-start gap-3 p-3 rounded-xl border ${statusBg(check.status)}`}>
                  {statusIcon(check.status)}
                  <div>
                    <p className={`font-bold text-sm ${statusText(check.status)}`}>{CHECK_LABELS[key] || key}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{check.message}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Relatório gerado em {new Date(health.timestamp).toLocaleString('pt-BR')}</p>
          </div>
        )}

        {!health && !isFetching && (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Clique no botão acima para executar o diagnóstico</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function DeveloperPage() {
  const [levelFilter, setLevelFilter] = useState<string>("ALL");
  const [actionFilter, setActionFilter] = useState<string>("");
  const [userFilter, setUserFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [activeTab, setActiveTab] = useState<'logs' | 'audit' | 'ai' | 'health'>('logs');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: logs, isLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/logs'],
    refetchInterval: 30000,
  });

  const { data: mailerStatus } = useQuery<{ configured: boolean; smtp: string | null; from: string }>({
    queryKey: ['/api/admin/mailer-status'],
  });

  const auditMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/audit', { credentials: 'include' });
      if (!res.ok) throw new Error('Falha na auditoria');
      return res.json();
    },
    onError: () => toast({ title: "Erro ao executar auditoria", variant: "destructive" }),
  });

  const clearLogsMut = useMutation({
    mutationFn: () => apiRequest('DELETE', '/api/logs'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/logs'] });
      toast({ title: 'Histórico de logs limpo com sucesso!' });
      setShowClearConfirm(false);
    },
    onError: () => toast({ title: 'Erro ao limpar logs', variant: 'destructive' }),
  });

  const allActions = [...new Set((logs || []).map((l: any) => l.action))].sort();
  const allUsers = [...new Set((logs || []).map((l: any) => l.userEmail).filter(Boolean))].sort();

  const filtered = (logs || []).filter((l: any) => {
    if (levelFilter !== "ALL" && l.level !== levelFilter) return false;
    if (actionFilter && actionFilter !== 'ALL' && l.action !== actionFilter) return false;
    if (userFilter && userFilter !== 'ALL' && l.userEmail !== userFilter) return false;
    if (dateFrom) {
      const logDate = new Date(l.createdAt).toISOString().slice(0, 10);
      if (logDate < dateFrom) return false;
    }
    if (dateTo) {
      const logDate = new Date(l.createdAt).toISOString().slice(0, 10);
      if (logDate > dateTo) return false;
    }
    return true;
  });

  const counts = {
    total: logs?.length || 0,
    errors: logs?.filter((l: any) => l.level === 'ERROR').length || 0,
    warns: logs?.filter((l: any) => l.level === 'WARN').length || 0,
    logins: logs?.filter((l: any) => l.action === 'LOGIN').length || 0,
    orders: logs?.filter((l: any) => l.action === 'ORDER_CREATED').length || 0,
  };

  const aiBugs = analyzeLogsForBugs(logs || []);

  const clearFilters = () => { setLevelFilter('ALL'); setActionFilter(''); setUserFilter(''); setDateFrom(''); setDateTo(''); };
  const hasFilters = levelFilter !== 'ALL' || actionFilter || userFilter || dateFrom || dateTo;

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Área do Desenvolvedor</h1>
          <p className="text-muted-foreground mt-1">Logs, auditoria, saúde e detecção de bugs.</p>
        </div>
        <div className="flex gap-2">
          <button data-testid="button-refresh-logs"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/logs'] })}
            className="flex items-center gap-2 px-4 py-2.5 border-2 border-border rounded-xl text-sm font-bold hover:bg-muted transition-colors">
            <RefreshCw className="w-4 h-4" /> Atualizar
          </button>
          {!showClearConfirm ? (
            <button onClick={() => setShowClearConfirm(true)} data-testid="button-clear-logs"
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-red-200 text-red-600 rounded-xl text-sm font-bold hover:bg-red-50 transition-colors">
              <Trash2 className="w-4 h-4" /> Limpar Histórico
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => clearLogsMut.mutate()} disabled={clearLogsMut.isPending}
                data-testid="button-confirm-clear-logs"
                className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50">
                {clearLogsMut.isPending ? 'Limpando...' : 'Confirmar limpeza'}
              </button>
              <button onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2.5 border-2 border-border rounded-xl text-sm font-bold hover:bg-muted transition-colors">
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: "Total de logs", value: counts.total, color: "text-foreground" },
          { label: "Erros", value: counts.errors, color: "text-red-600" },
          { label: "Avisos", value: counts.warns, color: "text-orange-600" },
          { label: "Logins", value: counts.logins, color: "text-blue-600" },
          { label: "Pedidos", value: counts.orders, color: "text-green-600" },
        ].map(c => (
          <div key={c.label} className="bg-card rounded-2xl p-4 border border-border/50 premium-shadow text-center">
            <p className={`text-2xl font-display font-bold ${c.color}`}>{c.value}</p>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {/* System status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className={`rounded-2xl p-4 border-2 flex items-center gap-3 ${mailerStatus?.configured ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
          {mailerStatus?.configured ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />}
          <div>
            <p className="font-bold text-sm">E-mail SMTP: {mailerStatus?.configured ? "Configurado" : "Não configurado"}</p>
            {mailerStatus?.smtp && <p className="text-xs text-muted-foreground">{mailerStatus.smtp}</p>}
          </div>
        </div>
        <div className="rounded-2xl p-4 border-2 border-green-200 bg-green-50 flex items-center gap-3">
          <Shield className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="font-bold text-sm">Backup automático: Ativo</p>
            <p className="text-xs text-muted-foreground">Agendado diariamente às 17:00</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted/40 rounded-xl mb-6 w-fit flex-wrap">
        {[
          { id: 'logs', label: 'Logs do Sistema', icon: Database },
          { id: 'audit', label: 'Auditoria', icon: Scan },
          { id: 'ai', label: 'Detector de Bugs', icon: Bug },
          { id: 'health', label: 'Saúde do Sistema', icon: Activity },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              data-testid={`tab-${tab.id}`}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === tab.id ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab: Logs */}
      {activeTab === 'logs' && (
        <>
          {/* Advanced Filters */}
          <div className="bg-muted/30 rounded-xl p-4 mb-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex gap-2 flex-wrap">
                {["ALL", "INFO", "WARN", "ERROR"].map(l => (
                  <button key={l} onClick={() => setLevelFilter(l)} data-testid={`filter-level-${l}`}
                    className={`px-3 py-1.5 rounded-lg font-bold text-sm border-2 transition-all ${levelFilter === l ? 'bg-primary text-white border-primary' : 'border-border hover:border-primary/50 bg-card'}`}>
                    {l === "ALL" ? "Todos" : l === "WARN" ? "Avisos" : l === "ERROR" ? "Erros" : "Info"}
                  </button>
                ))}
              </div>
              {hasFilters && (
                <button onClick={clearFilters} className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground border border-dashed border-muted-foreground/30" data-testid="button-clear-filters">
                  Limpar filtros
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Tipo de evento</Label>
                <Select value={actionFilter || 'ALL'} onValueChange={v => setActionFilter(v === 'ALL' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs" data-testid="select-filter-action">
                    <SelectValue placeholder="Todos os eventos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos os eventos</SelectItem>
                    {allActions.map(a => <SelectItem key={a} value={a} className="text-xs font-mono">{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Usuário</Label>
                <Select value={userFilter || 'ALL'} onValueChange={v => setUserFilter(v === 'ALL' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs" data-testid="select-filter-user">
                    <SelectValue placeholder="Todos os usuários" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos os usuários</SelectItem>
                    {allUsers.map(u => <SelectItem key={u} value={u} className="text-xs">{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Data inicial</Label>
                <Input type="date" className="h-8 text-xs" value={dateFrom} onChange={e => setDateFrom(e.target.value)} data-testid="input-filter-date-from" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Data final</Label>
                <Input type="date" className="h-8 text-xs" value={dateTo} onChange={e => setDateTo(e.target.value)} data-testid="input-filter-date-to" />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border/50 premium-shadow overflow-hidden">
            <div className="p-5 border-b border-border/50 bg-muted/20 flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <span className="font-bold text-foreground">Logs do Sistema</span>
              <span className="ml-auto text-xs text-muted-foreground">{filtered.length} de {logs?.length || 0} registro(s)</span>
            </div>
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Carregando logs...</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <Shield className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="font-bold text-muted-foreground">Nenhum log encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/10">
                      <th className="text-left p-3 font-semibold text-muted-foreground">Data/Hora</th>
                      <th className="text-left p-3 font-semibold text-muted-foreground">Nível</th>
                      <th className="text-left p-3 font-semibold text-muted-foreground">Ação</th>
                      <th className="text-left p-3 font-semibold text-muted-foreground">Descrição</th>
                      <th className="text-left p-3 font-semibold text-muted-foreground">Usuário</th>
                      <th className="text-left p-3 font-semibold text-muted-foreground">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((log: any) => {
                      const lvl = LEVEL_CONFIG[log.level] || LEVEL_CONFIG.INFO;
                      return (
                        <tr key={log.id} data-testid={`row-log-${log.id}`} className="border-b border-border/30 hover:bg-muted/10 transition-colors">
                          <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(log.createdAt)}</td>
                          <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${lvl.color}`}>{lvl.label}</span></td>
                          <td className="p-3 font-mono text-xs font-bold text-foreground">{log.action}</td>
                          <td className="p-3 text-foreground max-w-xs truncate">{log.description}</td>
                          <td className="p-3 text-xs text-muted-foreground">{log.userEmail || '—'}</td>
                          <td className="p-3 text-xs text-muted-foreground">{log.ip || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Tab: Audit */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-card rounded-2xl border border-border/50 p-6 premium-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Scan className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-lg">Auditoria Completa do Sistema</h3>
                <p className="text-sm text-muted-foreground">Verifica usuários, empresas, pedidos, ocorrências e logs em busca de inconsistências.</p>
              </div>
            </div>
            <button onClick={() => auditMutation.mutate()} disabled={auditMutation.isPending}
              data-testid="button-run-audit"
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 shadow-lg shadow-primary/20">
              <Play className="w-4 h-4" />
              {auditMutation.isPending ? "Executando auditoria..." : "Executar Auditoria"}
            </button>

            {auditMutation.data && (
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Usuários', value: `${(auditMutation.data as any).summary?.activeUsers}/${(auditMutation.data as any).summary?.totalUsers}`, sub: 'ativos/total' },
                    { label: 'Empresas', value: `${(auditMutation.data as any).summary?.activeCompanies}/${(auditMutation.data as any).summary?.totalCompanies}`, sub: 'ativas/total' },
                    { label: 'Erros', value: (auditMutation.data as any).summary?.errors, sub: 'nos logs', color: (auditMutation.data as any).summary?.errors > 0 ? 'text-red-600' : 'text-green-600' },
                    { label: 'Login Fails', value: (auditMutation.data as any).summary?.loginFails, sub: 'tentativas', color: (auditMutation.data as any).summary?.loginFails > 5 ? 'text-orange-600' : 'text-foreground' },
                  ].map(c => (
                    <div key={c.label} className="bg-muted/30 rounded-xl p-3 text-center">
                      <p className={`text-xl font-bold ${c.color || 'text-foreground'}`}>{c.value}</p>
                      <p className="text-xs text-muted-foreground">{c.label} ({c.sub})</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-bold text-muted-foreground">{(auditMutation.data as any).issues?.length || 0} problema(s) encontrado(s):</p>
                  {(auditMutation.data as any).issues?.length === 0 && (
                    <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-xl">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <p className="text-sm text-green-700 font-medium">Sistema sem inconsistências detectadas!</p>
                    </div>
                  )}
                  {(auditMutation.data as any).issues?.map((issue: any, i: number) => {
                    const cfg = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.INFO;
                    const SevIcon = issue.severity === 'ERROR' ? AlertCircle : issue.severity === 'WARN' ? AlertTriangle : CheckCircle;
                    return (
                      <div key={i} className={`flex items-start gap-3 p-4 rounded-xl border ${cfg.bg}`}>
                        <SevIcon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${cfg.color}`} />
                        <p className="text-sm text-foreground">{issue.message}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: AI Bug Detector */}
      {activeTab === 'ai' && (
        <div className="space-y-4">
          <div className="bg-card rounded-2xl border border-border/50 p-6 premium-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-lg">Detector de Bugs com IA</h3>
                <p className="text-sm text-muted-foreground">Análise dos logs para detectar padrões suspeitos e sugerir correções.</p>
              </div>
            </div>
            <div className="flex gap-2 mb-6 flex-wrap">
              <button onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/logs'] })} data-testid="button-detect-bugs"
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors">
                <Bug className="w-4 h-4" /> Detectar Bugs
              </button>
              <button onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/logs'] })} data-testid="button-suggest-fix"
                className="flex items-center gap-2 px-5 py-2.5 border-2 border-purple-300 text-purple-700 font-bold rounded-xl hover:bg-purple-50 transition-colors">
                <Wrench className="w-4 h-4" /> Sugerir Correção
              </button>
            </div>
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Analisando logs...</div>
            ) : aiBugs.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="font-bold text-green-700 text-lg">Nenhum bug detectado!</p>
                <p className="text-sm text-muted-foreground mt-1">Análise dos logs não encontrou padrões suspeitos.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm font-bold text-muted-foreground">{aiBugs.length} problema(s) detectado(s):</p>
                {aiBugs.map((bug, i) => {
                  const colors: Record<string, string> = { HIGH: 'border-red-200 bg-red-50', MEDIUM: 'border-orange-200 bg-orange-50', LOW: 'border-blue-200 bg-blue-50' };
                  const badges: Record<string, string> = { HIGH: 'bg-red-100 text-red-700', MEDIUM: 'bg-orange-100 text-orange-700', LOW: 'bg-blue-100 text-blue-700' };
                  return (
                    <div key={i} className={`rounded-xl border p-5 ${colors[bug.priority]}`}>
                      <div className="flex items-center gap-3 mb-2">
                        <Bug className="w-5 h-5 text-foreground/60" />
                        <span className="font-bold text-foreground">{bug.type}</span>
                        <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-bold ${badges[bug.priority]}`}>
                          {bug.priority === 'HIGH' ? 'Alta' : bug.priority === 'MEDIUM' ? 'Média' : 'Baixa'}
                        </span>
                      </div>
                      <p className="text-sm text-foreground mb-3">{bug.description}</p>
                      <div className="flex items-start gap-2 bg-white/70 rounded-lg p-3">
                        <Wrench className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-green-800 font-medium">{bug.suggestion}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Health */}
      {activeTab === 'health' && <HealthTab />}
    </Layout>
  );
}
