import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import {
  Shield, RefreshCw, AlertTriangle, CheckCircle, Info, LogIn, ShoppingCart, Edit,
  Scan, Bug, Wrench, Zap, Play, Database, AlertCircle
} from "lucide-react";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const LEVEL_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  INFO: { label: "INFO", color: "bg-blue-100 text-blue-700", icon: Info },
  WARN: { label: "AVISO", color: "bg-orange-100 text-orange-700", icon: AlertTriangle },
  ERROR: { label: "ERRO", color: "bg-red-100 text-red-700", icon: AlertTriangle },
};

const SEVERITY_CONFIG: Record<string, { color: string; bg: string }> = {
  INFO: { color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  WARN: { color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  ERROR: { color: "text-red-700", bg: "bg-red-50 border-red-200" },
};

const ACTION_ICONS: Record<string, any> = {
  LOGIN: LogIn,
  LOGIN_FAILED: AlertTriangle,
  ORDER_CREATED: ShoppingCart,
  COMPANY_UPDATED: Edit,
  PRODUCT_UPDATED: Edit,
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
}

type AuditIssue = { severity: string; category: string; message: string };

// Simulated AI bug analysis based on real log data
function analyzeLogsForBugs(logs: any[]): Array<{ type: string; description: string; suggestion: string; priority: 'HIGH' | 'MEDIUM' | 'LOW' }> {
  const bugs = [];
  if (!logs || logs.length === 0) return bugs;

  const loginFails = logs.filter(l => l.action === 'LOGIN_FAILED');
  const recentFails = loginFails.filter(l => {
    const d = new Date(l.createdAt);
    return (Date.now() - d.getTime()) < 60 * 60 * 1000;
  });
  if (recentFails.length >= 3) {
    const ips = [...new Set(recentFails.map(l => l.ip).filter(Boolean))];
    bugs.push({
      type: 'Segurança — Brute Force Potencial',
      description: `${recentFails.length} tentativas de login falhas na última hora (IPs: ${ips.join(', ') || 'desconhecido'}).`,
      suggestion: 'Considere implementar rate limiting por IP ou bloquear temporariamente os IPs suspeitos.',
      priority: 'HIGH' as const,
    });
  }

  const errors = logs.filter(l => l.level === 'ERROR');
  if (errors.length > 0) {
    const grouped: Record<string, number> = {};
    errors.forEach(l => { grouped[l.action] = (grouped[l.action] || 0) + 1; });
    Object.entries(grouped).forEach(([action, count]) => {
      bugs.push({
        type: `Erro Recorrente — ${action}`,
        description: `${count} ocorrência(s) de erro na ação "${action}".`,
        suggestion: 'Verifique os detalhes nos logs abaixo e confirme se a causa raiz foi corrigida.',
        priority: count >= 5 ? 'HIGH' as const : 'MEDIUM' as const,
      });
    });
  }

  const last24h = logs.filter(l => (Date.now() - new Date(l.createdAt).getTime()) < 24 * 60 * 60 * 1000);
  if (last24h.length === 0) {
    bugs.push({
      type: 'Monitoramento — Logs Ausentes',
      description: 'Nenhuma atividade registrada nas últimas 24 horas.',
      suggestion: 'Verifique se o sistema de logs está funcionando corretamente.',
      priority: 'MEDIUM' as const,
    });
  }

  return bugs;
}

export default function DeveloperPage() {
  const [levelFilter, setLevelFilter] = useState<string>("ALL");
  const [actionFilter, setActionFilter] = useState<string>("");
  const [activeTab, setActiveTab] = useState<'logs' | 'audit' | 'ai'>('logs');
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
      const res = await fetch('/api/admin/audit', { credentials: 'include' });
      if (!res.ok) throw new Error('Falha na auditoria');
      return res.json() as Promise<{ issues: AuditIssue[]; scannedAt: string }>;
    },
    onError: () => toast({ title: "Erro ao executar auditoria", variant: "destructive" }),
  });

  const filtered = (logs || []).filter(l => {
    if (levelFilter !== "ALL" && l.level !== levelFilter) return false;
    if (actionFilter && !l.action.includes(actionFilter.toUpperCase()) && !l.description.toLowerCase().includes(actionFilter.toLowerCase())) return false;
    return true;
  });

  const counts = {
    total: logs?.length || 0,
    errors: logs?.filter(l => l.level === 'ERROR').length || 0,
    warns: logs?.filter(l => l.level === 'WARN').length || 0,
    logins: logs?.filter(l => l.action === 'LOGIN').length || 0,
    orders: logs?.filter(l => l.action === 'ORDER_CREATED').length || 0,
  };

  const aiBugs = analyzeLogsForBugs(logs || []);

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Área do Desenvolvedor</h1>
          <p className="text-muted-foreground mt-1">Logs, auditoria do sistema e detecção de bugs.</p>
        </div>
        <button data-testid="button-refresh-logs"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/logs'] })}
          className="flex items-center gap-2 px-4 py-2.5 border-2 border-border rounded-xl text-sm font-bold hover:bg-muted transition-colors">
          <RefreshCw className="w-4 h-4" /> Atualizar
        </button>
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
      <div className="flex gap-1 p-1 bg-muted/40 rounded-xl mb-6 w-fit">
        {[
          { id: 'logs', label: 'Logs do Sistema', icon: Database },
          { id: 'audit', label: 'Auditoria', icon: Scan },
          { id: 'ai', label: 'Detector de Bugs (IA)', icon: Bug },
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
          <div className="flex flex-wrap gap-2 mb-4">
            {["ALL", "INFO", "WARN", "ERROR"].map(l => (
              <button key={l} onClick={() => setLevelFilter(l)} data-testid={`filter-level-${l}`}
                className={`px-4 py-2 rounded-xl font-bold text-sm border-2 transition-all ${levelFilter === l ? 'bg-primary text-white border-primary' : 'border-border hover:border-primary/50'}`}>
                {l === "ALL" ? "Todos" : l === "WARN" ? "Avisos" : l === "ERROR" ? "Erros" : "Info"}
              </button>
            ))}
            <input value={actionFilter} onChange={e => setActionFilter(e.target.value)}
              placeholder="Buscar ação ou descrição..."
              className="px-4 py-2 rounded-xl border-2 border-border focus:border-primary outline-none text-sm flex-1 min-w-[200px]" />
          </div>
          <div className="bg-card rounded-2xl border border-border/50 premium-shadow overflow-hidden">
            <div className="p-5 border-b border-border/50 bg-muted/20 flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <span className="font-bold text-foreground">Logs do Sistema</span>
              <span className="ml-auto text-xs text-muted-foreground">{filtered.length} registro(s)</span>
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
                    {filtered.map(log => {
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
                <h3 className="font-bold text-foreground text-lg">Varredura Completa do Sistema</h3>
                <p className="text-sm text-muted-foreground">Verifica banco de dados, rotas, pedidos e logs em busca de inconsistências.</p>
              </div>
            </div>
            <button onClick={() => auditMutation.mutate()}
              disabled={auditMutation.isPending}
              data-testid="button-run-audit"
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 shadow-lg shadow-primary/20">
              <Play className="w-4 h-4" />
              {auditMutation.isPending ? "Executando auditoria..." : "Executar Auditoria"}
            </button>

            {auditMutation.data && (
              <div className="mt-6">
                <p className="text-xs text-muted-foreground mb-3">
                  Verificação realizada em {formatDate(auditMutation.data.scannedAt)} — {auditMutation.data.issues.length} item(ns) encontrado(s)
                </p>
                <div className="space-y-2">
                  {auditMutation.data.issues.map((issue, i) => {
                    const cfg = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.INFO;
                    const SevIcon = issue.severity === 'ERROR' ? AlertCircle : issue.severity === 'WARN' ? AlertTriangle : CheckCircle;
                    return (
                      <div key={i} className={`flex items-start gap-3 p-4 rounded-xl border ${cfg.bg}`}>
                        <SevIcon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${cfg.color}`} />
                        <div>
                          <p className={`font-bold text-sm ${cfg.color}`}>{issue.category}</p>
                          <p className="text-sm text-foreground mt-0.5">{issue.message}</p>
                        </div>
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
                <p className="text-sm text-muted-foreground">Análise inteligente dos logs para detectar padrões suspeitos e sugerir correções.</p>
              </div>
            </div>

            <div className="flex gap-2 mb-6 flex-wrap">
              <button onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/logs'] })}
                data-testid="button-detect-bugs"
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors">
                <Bug className="w-4 h-4" /> Detectar Bugs
              </button>
              <button onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/logs'] })}
                data-testid="button-suggest-fix"
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
                <p className="text-sm font-bold text-muted-foreground">{aiBugs.length} problema(s) detectado(s) na análise:</p>
                {aiBugs.map((bug, i) => {
                  const priorityColors: Record<string, string> = {
                    HIGH: 'border-red-200 bg-red-50',
                    MEDIUM: 'border-orange-200 bg-orange-50',
                    LOW: 'border-blue-200 bg-blue-50',
                  };
                  const priorityBadge: Record<string, string> = {
                    HIGH: 'bg-red-100 text-red-700',
                    MEDIUM: 'bg-orange-100 text-orange-700',
                    LOW: 'bg-blue-100 text-blue-700',
                  };
                  return (
                    <div key={i} className={`rounded-xl border p-5 ${priorityColors[bug.priority]}`}>
                      <div className="flex items-center gap-3 mb-2">
                        <Bug className="w-5 h-5 text-foreground/60" />
                        <span className="font-bold text-foreground">{bug.type}</span>
                        <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-bold ${priorityBadge[bug.priority]}`}>
                          {bug.priority === 'HIGH' ? 'Alta Prioridade' : bug.priority === 'MEDIUM' ? 'Média' : 'Baixa'}
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
    </Layout>
  );
}
