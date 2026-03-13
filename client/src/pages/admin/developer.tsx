import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Shield, RefreshCw, AlertTriangle, CheckCircle, Info, LogIn, ShoppingCart, Edit } from "lucide-react";
import { useState } from "react";

const LEVEL_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  INFO: { label: "INFO", color: "bg-blue-100 text-blue-700", icon: Info },
  WARN: { label: "AVISO", color: "bg-orange-100 text-orange-700", icon: AlertTriangle },
  ERROR: { label: "ERRO", color: "bg-red-100 text-red-700", icon: AlertTriangle },
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

export default function DeveloperPage() {
  const [levelFilter, setLevelFilter] = useState<string>("ALL");
  const [actionFilter, setActionFilter] = useState<string>("");
  const queryClient = useQueryClient();

  const { data: logs, isLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/logs'],
    refetchInterval: 30000,
  });

  const { data: mailerStatus } = useQuery<{ configured: boolean; smtp: string | null; from: string }>({
    queryKey: ['/api/admin/mailer-status'],
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

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Área do Desenvolvedor</h1>
          <p className="text-muted-foreground mt-1">Logs do sistema, auditoria e monitoramento.</p>
        </div>
        <button
          data-testid="button-refresh-logs"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/logs'] })}
          className="flex items-center gap-2 px-4 py-2.5 border-2 border-border rounded-xl text-sm font-bold hover:bg-muted transition-colors"
        >
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

      {/* Log filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {["ALL", "INFO", "WARN", "ERROR"].map(l => (
          <button key={l} onClick={() => setLevelFilter(l)}
            data-testid={`filter-level-${l}`}
            className={`px-4 py-2 rounded-xl font-bold text-sm border-2 transition-all ${levelFilter === l ? 'bg-primary text-white border-primary' : 'border-border hover:border-primary/50'}`}>
            {l === "ALL" ? "Todos" : l === "WARN" ? "Avisos" : l === "ERROR" ? "Erros" : "Info"}
          </button>
        ))}
        <input value={actionFilter} onChange={e => setActionFilter(e.target.value)}
          placeholder="Buscar ação ou descrição..."
          className="px-4 py-2 rounded-xl border-2 border-border focus:border-primary outline-none text-sm flex-1 min-w-[200px]" />
      </div>

      {/* Log table */}
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
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${lvl.color}`}>{lvl.label}</span>
                      </td>
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
    </Layout>
  );
}
