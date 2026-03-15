import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Link } from "wouter";
import {
  Brain, RefreshCw, AlertTriangle, AlertCircle, CheckCircle, Info,
  Package, Users, ShoppingBag, Truck, Shield, ChevronRight,
  TrendingDown, Clock, Zap, Activity, Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
type Category = 'estoque' | 'clientes' | 'produtos' | 'logistica' | 'sistema';

interface IntelAlert {
  id: string;
  category: Category;
  severity: Severity;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  data?: Record<string, unknown>;
}

interface IntelligenceResponse {
  alerts: IntelAlert[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    byCategory: Record<Category, number>;
  };
  generatedAt: string;
}

const SEV_CONFIG: Record<Severity, { label: string; color: string; bg: string; border: string; icon: typeof AlertCircle }> = {
  CRITICAL: { label: 'Crítico', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', icon: AlertCircle },
  HIGH:     { label: 'Alto',    color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', icon: AlertTriangle },
  MEDIUM:   { label: 'Médio',   color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200', icon: Info },
  LOW:      { label: 'Baixo',   color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', icon: CheckCircle },
};

const CAT_CONFIG: Record<Category, { label: string; icon: typeof Package; color: string }> = {
  estoque:  { label: 'Estoque',    icon: Package,       color: 'text-blue-600' },
  clientes: { label: 'Clientes',   icon: Users,         color: 'text-purple-600' },
  produtos: { label: 'Produtos',   icon: ShoppingBag,   color: 'text-orange-600' },
  logistica:{ label: 'Logística',  icon: Truck,         color: 'text-teal-600' },
  sistema:  { label: 'Sistema',    icon: Shield,        color: 'text-red-600' },
};

type TabKey = 'all' | Category;

export default function IntelligencePage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [sevFilter, setSevFilter] = useState<Severity | 'all'>('all');

  const { data, isLoading, error, dataUpdatedAt } = useQuery<IntelligenceResponse>({
    queryKey: ['/api/admin/intelligence'],
    queryFn: async () => {
      const res = await fetch('/api/admin/intelligence', { credentials: 'include' });
      if (!res.ok) throw new Error('Erro ao carregar análise');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const handleRefresh = () => {
    qc.invalidateQueries({ queryKey: ['/api/admin/intelligence'] });
  };

  const alerts = data?.alerts ?? [];
  const summary = data?.summary;

  const filtered = alerts.filter(a => {
    if (activeTab !== 'all' && a.category !== activeTab) return false;
    if (sevFilter !== 'all' && a.severity !== sevFilter) return false;
    return true;
  }).sort((a, b) => {
    const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return order[a.severity] - order[b.severity];
  });

  const generatedLabel = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : null;

  const tabs: { key: TabKey; label: string; icon: typeof Package; count: number }[] = [
    { key: 'all', label: 'Todos', icon: Activity, count: alerts.length },
    { key: 'estoque', label: 'Estoque', icon: Package, count: summary?.byCategory.estoque ?? 0 },
    { key: 'clientes', label: 'Clientes', icon: Users, count: summary?.byCategory.clientes ?? 0 },
    { key: 'produtos', label: 'Produtos', icon: ShoppingBag, count: summary?.byCategory.produtos ?? 0 },
    { key: 'logistica', label: 'Logística', icon: Truck, count: summary?.byCategory.logistica ?? 0 },
    { key: 'sistema', label: 'Sistema', icon: Shield, count: summary?.byCategory.sistema ?? 0 },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                <Brain className="w-6 h-6 text-white" />
              </div>
              Central de Inteligência
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Análise preditiva automática — detecta riscos antes que se tornem problemas.
              {generatedLabel && (
                <span className="ml-2 text-xs text-muted-foreground/70 flex items-center gap-1 inline-flex">
                  <Clock className="w-3 h-3" /> Última análise: {generatedLabel}
                </span>
              )}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            data-testid="button-intelligence-refresh"
            className="gap-2 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Analisando...' : 'Atualizar Análise'}
          </Button>
        </div>

        {/* ── Summary Cards ── */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-card border border-border/50 rounded-2xl p-4 animate-pulse h-20" />
            ))}
          </div>
        ) : summary ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div
              data-testid="card-intelligence-critical"
              className={`bg-red-50 border border-red-100 rounded-2xl p-4 cursor-pointer transition-all ${sevFilter === 'CRITICAL' ? 'ring-2 ring-red-400' : 'hover:border-red-200'}`}
              onClick={() => setSevFilter(sevFilter === 'CRITICAL' ? 'all' : 'CRITICAL')}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">Crítico</span>
                <AlertCircle className="w-4 h-4 text-red-500" />
              </div>
              <p className="text-3xl font-bold text-red-700 mt-1">{summary.critical}</p>
              <p className="text-xs text-red-500 mt-0.5">{summary.critical === 0 ? 'Nenhum' : 'alerta(s)'}</p>
            </div>
            <div
              data-testid="card-intelligence-high"
              className={`bg-orange-50 border border-orange-100 rounded-2xl p-4 cursor-pointer transition-all ${sevFilter === 'HIGH' ? 'ring-2 ring-orange-400' : 'hover:border-orange-200'}`}
              onClick={() => setSevFilter(sevFilter === 'HIGH' ? 'all' : 'HIGH')}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Alto</span>
                <AlertTriangle className="w-4 h-4 text-orange-500" />
              </div>
              <p className="text-3xl font-bold text-orange-700 mt-1">{summary.high}</p>
              <p className="text-xs text-orange-500 mt-0.5">{summary.high === 0 ? 'Nenhum' : 'alerta(s)'}</p>
            </div>
            <div
              data-testid="card-intelligence-medium"
              className={`bg-yellow-50 border border-yellow-100 rounded-2xl p-4 cursor-pointer transition-all ${sevFilter === 'MEDIUM' ? 'ring-2 ring-yellow-400' : 'hover:border-yellow-200'}`}
              onClick={() => setSevFilter(sevFilter === 'MEDIUM' ? 'all' : 'MEDIUM')}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-yellow-700 uppercase tracking-wide">Médio</span>
                <Info className="w-4 h-4 text-yellow-600" />
              </div>
              <p className="text-3xl font-bold text-yellow-700 mt-1">{summary.medium}</p>
              <p className="text-xs text-yellow-600 mt-0.5">{summary.medium === 0 ? 'Nenhum' : 'alerta(s)'}</p>
            </div>
            <div
              data-testid="card-intelligence-low"
              className={`bg-green-50 border border-green-100 rounded-2xl p-4 cursor-pointer transition-all ${sevFilter === 'LOW' ? 'ring-2 ring-green-400' : 'hover:border-green-200'}`}
              onClick={() => setSevFilter(sevFilter === 'LOW' ? 'all' : 'LOW')}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-green-600 uppercase tracking-wide">Baixo</span>
                <CheckCircle className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-3xl font-bold text-green-700 mt-1">{summary.low}</p>
              <p className="text-xs text-green-500 mt-0.5">{summary.low === 0 ? 'Nenhum' : 'alerta(s)'}</p>
            </div>
          </div>
        ) : null}

        {/* ── Overall health banner ── */}
        {!isLoading && summary && (
          <div className={`rounded-2xl p-4 flex items-center gap-3 ${
            summary.critical > 0 ? 'bg-red-50 border border-red-200' :
            summary.high > 0 ? 'bg-orange-50 border border-orange-200' :
            summary.medium > 0 ? 'bg-yellow-50 border border-yellow-200' :
            'bg-green-50 border border-green-200'
          }`}>
            {summary.critical > 0 ? <AlertCircle className="w-5 h-5 text-red-600 shrink-0" /> :
             summary.high > 0 ? <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0" /> :
             summary.medium > 0 ? <Zap className="w-5 h-5 text-yellow-600 shrink-0" /> :
             <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />}
            <div className="flex-1">
              <p className={`font-semibold text-sm ${
                summary.critical > 0 ? 'text-red-800' :
                summary.high > 0 ? 'text-orange-800' :
                summary.medium > 0 ? 'text-yellow-800' : 'text-green-800'
              }`}>
                {summary.critical > 0 ? `⚠️ ${summary.critical} problema(s) crítico(s) detectado(s) — ação imediata necessária.` :
                 summary.high > 0 ? `${summary.high} alerta(s) de alta prioridade requerem atenção.` :
                 summary.medium > 0 ? `${summary.medium} item(ns) de atenção moderada.` :
                 '✅ Sistema operando normalmente — nenhum problema crítico detectado.'}
              </p>
              <p className="text-xs opacity-70 mt-0.5">{summary.total} análise(s) concluída(s) em 5 categorias.</p>
            </div>
            {sevFilter !== 'all' && (
              <button onClick={() => setSevFilter('all')} className="text-xs underline opacity-70 hover:opacity-100 shrink-0">
                Limpar filtro
              </button>
            )}
          </div>
        )}

        {/* ── Tabs + Filter Bar ── */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-1 flex-wrap">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  data-testid={`tab-intelligence-${tab.key}`}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-card border border-border/50 text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                    }`}>{tab.count}</span>
                  )}
                </button>
              );
            })}
          </div>
          {sevFilter !== 'all' && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Filter className="w-3 h-3" />
              Filtrando por: <Badge variant="outline">{SEV_CONFIG[sevFilter].label}</Badge>
              <button onClick={() => setSevFilter('all')} className="text-primary hover:underline">Limpar</button>
            </div>
          )}
        </div>

        {/* ── Alert List ── */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-card border border-border/50 rounded-2xl p-5 animate-pulse h-24" />
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
            <p className="text-red-700 font-semibold">Erro ao carregar análise</p>
            <p className="text-sm text-red-500 mt-1">Tente atualizar novamente.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card border border-border/50 rounded-2xl p-10 text-center">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <p className="font-semibold text-foreground">Nenhum alerta encontrado</p>
            <p className="text-sm text-muted-foreground mt-1">
              {sevFilter !== 'all' || activeTab !== 'all' ? 'Sem resultados para os filtros aplicados.' : 'Tudo certo nesta categoria!'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(alert => {
              const sev = SEV_CONFIG[alert.severity];
              const cat = CAT_CONFIG[alert.category];
              const SevIcon = sev.icon;
              const CatIcon = cat.icon;
              return (
                <div
                  key={alert.id}
                  data-testid={`alert-card-${alert.id}`}
                  className={`${sev.bg} ${sev.border} border rounded-2xl p-5 flex gap-4 transition-all hover:shadow-sm`}
                >
                  <div className="shrink-0 mt-0.5">
                    <SevIcon className={`w-5 h-5 ${sev.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${sev.bg} ${sev.border} ${sev.color}`}>
                        {sev.label}
                      </span>
                      <span className={`text-xs font-medium flex items-center gap-1 ${cat.color}`}>
                        <CatIcon className="w-3 h-3" /> {cat.label}
                      </span>
                    </div>
                    <p className={`font-semibold mt-1.5 ${sev.color} text-sm`}>{alert.title}</p>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{alert.description}</p>

                    {/* Extra data chips */}
                    {alert.data && Object.keys(alert.data).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {alert.category === 'estoque' && alert.data.currentStock !== undefined && (
                          <>
                            <span className="text-xs bg-white/80 border border-border/40 px-2 py-0.5 rounded-lg text-foreground">
                              Estoque atual: <strong>{String(alert.data.currentStock)}</strong>
                            </span>
                            {alert.data.minStock !== undefined && (
                              <span className="text-xs bg-white/80 border border-border/40 px-2 py-0.5 rounded-lg text-foreground">
                                Mínimo: <strong>{String(alert.data.minStock)}</strong>
                              </span>
                            )}
                            {alert.data.daysLeft !== undefined && (
                              <span className="text-xs bg-white/80 border border-border/40 px-2 py-0.5 rounded-lg text-foreground">
                                Estimativa: <strong>{String(alert.data.daysLeft)} dia(s)</strong>
                              </span>
                            )}
                          </>
                        )}
                        {alert.category === 'clientes' && alert.data.daysSince !== undefined && (
                          <>
                            <span className="text-xs bg-white/80 border border-border/40 px-2 py-0.5 rounded-lg text-foreground">
                              Sem pedido há: <strong>{String(alert.data.daysSince)} dias</strong>
                            </span>
                            {alert.data.avgGapDays !== undefined && (
                              <span className="text-xs bg-white/80 border border-border/40 px-2 py-0.5 rounded-lg text-foreground">
                                Frequência histórica: <strong>~{String(alert.data.avgGapDays)} dias</strong>
                              </span>
                            )}
                          </>
                        )}
                        {alert.category === 'produtos' && alert.data.dropPct !== undefined && (
                          <>
                            <span className="text-xs bg-white/80 border border-border/40 px-2 py-0.5 rounded-lg text-foreground flex items-center gap-1">
                              <TrendingDown className="w-3 h-3 text-red-500" />
                              Queda: <strong>{String(alert.data.dropPct)}%</strong>
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  {alert.actionLabel && alert.actionHref && (
                    <div className="shrink-0 self-center">
                      <Link href={alert.actionHref}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-xs h-8"
                          data-testid={`button-alert-action-${alert.id}`}
                        >
                          {alert.actionLabel} <ChevronRight className="w-3 h-3" />
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Footer note ── */}
        {!isLoading && filtered.length > 0 && (
          <p className="text-xs text-center text-muted-foreground pb-4">
            Mostrando {filtered.length} de {alerts.length} alerta(s) · Análise gerada em {data?.generatedAt ? new Date(data.generatedAt).toLocaleString('pt-BR') : '—'}
          </p>
        )}
      </div>
    </Layout>
  );
}
