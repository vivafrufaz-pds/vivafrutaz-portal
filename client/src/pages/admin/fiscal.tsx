import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Receipt, Search, Filter, Calendar, Building2, Download, Eye, FileText,
  CheckCircle2, Clock, XCircle, Send, ChevronDown, ChevronRight, RefreshCw,
  TrendingUp, AlertCircle, Package
} from 'lucide-react';
import { downloadDanfe, openDanfe, type DanfeData } from '@/lib/danfe-generator';

const FISCAL_LABEL: Record<string, string> = {
  nota_pendente: 'Pendente',
  nota_exportada: 'Exportada',
  nota_emitida: 'Emitida',
  nota_cancelada: 'Cancelada',
};

const FISCAL_BADGE: Record<string, string> = {
  nota_pendente: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  nota_exportada: 'bg-blue-100 text-blue-700 border-blue-300',
  nota_emitida: 'bg-green-100 text-green-700 border-green-300',
  nota_cancelada: 'bg-red-100 text-red-700 border-red-300',
};

const FISCAL_ICON: Record<string, any> = {
  nota_pendente: Clock,
  nota_exportada: Send,
  nota_emitida: CheckCircle2,
  nota_cancelada: XCircle,
};

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}

export default function FiscalManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterClientType, setFilterClientType] = useState('todos');
  const [filterContract, setFilterContract] = useState('todos');
  const [filterCompany, setFilterCompany] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedCompany, setExpandedCompany] = useState<number | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set());

  const { data: ordersRaw = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ['/api/orders'],
    staleTime: 30000,
  });

  const { data: companies = [] } = useQuery<any[]>({
    queryKey: ['/api/companies'],
    staleTime: 60000,
  });

  const companyMap = useMemo(() => {
    const m: Record<number, any> = {};
    (companies as any[]).forEach((c: any) => { m[c.id] = c; });
    return m;
  }, [companies]);

  const orders = useMemo(() => {
    return (ordersRaw as any[]).filter((o: any) => {
      if (filterStatus !== 'todos') {
        const status = o.fiscalStatus || 'nota_pendente';
        if (filterStatus === 'faturado' && status !== 'nota_emitida') return false;
        if (filterStatus === 'pendente' && status !== 'nota_pendente') return false;
        if (!['faturado', 'pendente', 'todos'].includes(filterStatus) && status !== filterStatus) return false;
      }

      const company = companyMap[o.companyId];
      if (filterClientType !== 'todos' && company?.clientType !== filterClientType) return false;
      if (filterContract !== 'todos') {
        if (filterContract === 'avulso' && company?.clientType !== 'avulso') return false;
        if (filterContract === 'contratual' && company?.clientType !== 'contratual') return false;
        if (filterContract === 'mensal' && company?.billingCycle !== 'mensal') return false;
        if (filterContract === 'semanal' && company?.billingCycle !== 'semanal') return false;
      }

      if (filterCompany && !o.companyName?.toLowerCase().includes(filterCompany.toLowerCase())) return false;

      if (dateFrom && o.deliveryDate && o.deliveryDate < dateFrom) return false;
      if (dateTo && o.deliveryDate && o.deliveryDate > dateTo) return false;

      if (search) {
        const q = search.toLowerCase();
        if (!o.companyName?.toLowerCase().includes(q) &&
            !String(o.id).includes(q) &&
            !o.deliveryDate?.includes(q)) return false;
      }
      return true;
    });
  }, [ordersRaw, filterStatus, filterClientType, filterContract, filterCompany, dateFrom, dateTo, search, companyMap]);

  const grouped = useMemo(() => {
    const g: Record<number, { company: any; orders: any[]; total: number }> = {};
    orders.forEach((o: any) => {
      if (!g[o.companyId]) {
        g[o.companyId] = { company: companyMap[o.companyId] || { companyName: o.companyName, id: o.companyId }, orders: [], total: 0 };
      }
      g[o.companyId].orders.push(o);
      g[o.companyId].total += Number(o.totalValue || 0);
    });
    return Object.values(g).sort((a, b) => b.total - a.total);
  }, [orders, companyMap]);

  const stats = useMemo(() => {
    const pending = orders.filter((o: any) => !o.fiscalStatus || o.fiscalStatus === 'nota_pendente');
    const emitted = orders.filter((o: any) => o.fiscalStatus === 'nota_emitida');
    const exported = orders.filter((o: any) => o.fiscalStatus === 'nota_exportada');
    return {
      total: orders.length,
      pending: pending.length,
      emitted: emitted.length,
      exported: exported.length,
      totalValue: orders.reduce((s: number, o: any) => s + Number(o.totalValue || 0), 0),
      pendingValue: pending.reduce((s: number, o: any) => s + Number(o.totalValue || 0), 0),
    };
  }, [orders]);

  const fiscalMutation = useMutation({
    mutationFn: ({ orderId, fiscalStatus }: { orderId: number; fiscalStatus: string }) =>
      apiRequest('PATCH', `/api/orders/${orderId}/fiscal`, { fiscalStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({ title: 'Status fiscal atualizado com sucesso' });
    },
    onError: () => toast({ title: 'Erro ao atualizar status', variant: 'destructive' }),
  });

  const blingMutation = useMutation({
    mutationFn: (orderId: number) =>
      apiRequest('POST', `/api/orders/${orderId}/bling-export`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({ title: 'Exportado para Bling com sucesso' });
    },
    onError: () => toast({ title: 'Erro ao exportar para Bling', variant: 'destructive' }),
  });

  const toggleOrder = (id: number) => {
    setSelectedOrders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllInGroup = (groupOrders: any[]) => {
    const ids = groupOrders.map((o: any) => o.id);
    const allSelected = ids.every(id => selectedOrders.has(id));
    setSelectedOrders(prev => {
      const next = new Set(prev);
      if (allSelected) ids.forEach(id => next.delete(id));
      else ids.forEach(id => next.add(id));
      return next;
    });
  };

  const handleBulkStatus = (status: string) => {
    if (selectedOrders.size === 0) {
      toast({ title: 'Selecione ao menos um pedido', variant: 'destructive' });
      return;
    }
    selectedOrders.forEach(id => fiscalMutation.mutate({ orderId: id, fiscalStatus: status }));
    setSelectedOrders(new Set());
  };

  const handleViewDanfe = async (order: any) => {
    const items = (order.items || []).map((item: any) => ({
      description: item.productName || item.name || 'Item',
      quantity: Number(item.quantity || 1),
      unitValue: Number(item.unitPrice || item.price || 0),
      totalValue: Number(item.totalValue || (item.quantity * item.unitPrice) || 0),
    }));
    const danfeData: DanfeData = {
      orderId: order.id,
      orderDate: order.deliveryDate || order.createdAt || new Date().toISOString(),
      companyName: order.companyName || 'N/A',
      companyCnpj: order.companyCnpj || companyMap[order.companyId]?.cnpj || '',
      companyAddress: companyMap[order.companyId]?.address || '',
      items,
      totalValue: Number(order.totalValue || 0),
      notes: order.observations || '',
    };
    openDanfe(danfeData);
  };

  const handleDownloadDanfe = async (order: any) => {
    const items = (order.items || []).map((item: any) => ({
      description: item.productName || item.name || 'Item',
      quantity: Number(item.quantity || 1),
      unitValue: Number(item.unitPrice || item.price || 0),
      totalValue: Number(item.totalValue || (item.quantity * item.unitPrice) || 0),
    }));
    const danfeData: DanfeData = {
      orderId: order.id,
      orderDate: order.deliveryDate || order.createdAt || new Date().toISOString(),
      companyName: order.companyName || 'N/A',
      companyCnpj: order.companyCnpj || companyMap[order.companyId]?.cnpj || '',
      companyAddress: companyMap[order.companyId]?.address || '',
      items,
      totalValue: Number(order.totalValue || 0),
      notes: order.observations || '',
    };
    downloadDanfe(danfeData);
    toast({ title: 'DANFE gerado e baixado com sucesso' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Gestão de Notas Fiscais</h1>
            <p className="text-sm text-muted-foreground">Faturamento, DANFE e exportação para Bling</p>
          </div>
        </div>
        <button
          data-testid="button-refresh-fiscal"
          onClick={() => {
            refetch();
            queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
            toast({ title: 'Dados atualizados' });
          }}
          className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 rounded-xl text-sm font-medium text-muted-foreground transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total de Pedidos', value: stats.total, icon: Package, color: 'text-foreground' },
          { label: 'Pendentes', value: stats.pending, sub: fmt(stats.pendingValue), icon: Clock, color: 'text-yellow-600' },
          { label: 'Exportados (Bling)', value: stats.exported, icon: Send, color: 'text-blue-600' },
          { label: 'Emitidos', value: stats.emitted, icon: CheckCircle2, color: 'text-green-600' },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-border/50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-xs text-muted-foreground font-medium">{label}</span>
            </div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub} pendente</p>}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-card border border-border/50 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-1">
          <Filter className="w-4 h-4 text-primary" />
          Filtros
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <div className="relative xl:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              data-testid="input-fiscal-search"
              type="text"
              placeholder="Buscar empresa ou pedido..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-border/50 rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              data-testid="input-fiscal-date-from"
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-border/50 rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              data-testid="input-fiscal-date-to"
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-border/50 rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <select
            data-testid="select-fiscal-status"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-border/50 rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="todos">Todos os status</option>
            <option value="pendente">Pendente de faturamento</option>
            <option value="nota_exportada">Exportada (Bling)</option>
            <option value="faturado">Faturado (Emitida)</option>
            <option value="nota_cancelada">Cancelada</option>
          </select>

          <select
            data-testid="select-fiscal-contract"
            value={filterContract}
            onChange={e => setFilterContract(e.target.value)}
            className="px-3 py-2 text-sm border border-border/50 rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="todos">Todos os contratos</option>
            <option value="avulso">Cliente avulso</option>
            <option value="contratual">Cliente contratual</option>
            <option value="mensal">Faturamento mensal</option>
            <option value="semanal">Faturamento semanal</option>
          </select>
        </div>

        {selectedOrders.size > 0 && (
          <div className="flex items-center gap-3 pt-2 border-t border-border/30 flex-wrap">
            <span className="text-sm font-medium text-foreground">{selectedOrders.size} pedido(s) selecionado(s)</span>
            <button
              data-testid="button-bulk-mark-emitida"
              onClick={() => handleBulkStatus('nota_emitida')}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-colors"
            >
              Marcar como Emitida
            </button>
            <button
              data-testid="button-bulk-mark-exportada"
              onClick={() => handleBulkStatus('nota_exportada')}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors"
            >
              Marcar como Exportada
            </button>
            <button
              data-testid="button-bulk-mark-pendente"
              onClick={() => handleBulkStatus('nota_pendente')}
              className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-xs font-bold transition-colors"
            >
              Marcar como Pendente
            </button>
            <button
              onClick={() => setSelectedOrders(new Set())}
              className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-muted-foreground rounded-lg text-xs font-medium transition-colors"
            >
              Limpar seleção
            </button>
          </div>
        )}
      </div>

      {/* Orders grouped by company */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Carregando pedidos...</span>
        </div>
      ) : grouped.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum pedido encontrado</p>
          <p className="text-sm">Tente ajustar os filtros</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map(({ company, orders: compOrders, total }) => {
            const isExpanded = expandedCompany === company.id;
            const allSelected = compOrders.every(o => selectedOrders.has(o.id));
            const someSelected = compOrders.some(o => selectedOrders.has(o.id));
            const pendingCount = compOrders.filter(o => !o.fiscalStatus || o.fiscalStatus === 'nota_pendente').length;
            const emittedCount = compOrders.filter(o => o.fiscalStatus === 'nota_emitida').length;

            return (
              <div key={company.id} className="bg-card border border-border/50 rounded-2xl overflow-hidden" data-testid={`company-fiscal-group-${company.id}`}>
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedCompany(isExpanded ? null : company.id)}
                >
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                    onChange={() => toggleAllInGroup(compOrders)}
                    onClick={e => e.stopPropagation()}
                    className="w-4 h-4 rounded border-border accent-primary"
                    data-testid={`checkbox-group-${company.id}`}
                  />

                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-foreground truncate text-sm">{company.companyName}</h3>
                      {company.clientType && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          company.clientType === 'contratual'
                            ? 'bg-purple-100 text-purple-700 border-purple-300'
                            : 'bg-blue-100 text-blue-700 border-blue-300'
                        }`}>
                          {company.clientType === 'contratual' ? 'Contratual' : 'Avulso'}
                        </span>
                      )}
                      {company.billingCycle && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/50">
                          {company.billingCycle === 'mensal' ? 'Mensal' : 'Semanal'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-0.5 text-xs text-muted-foreground">
                      <span>{compOrders.length} pedido(s)</span>
                      {pendingCount > 0 && <span className="text-yellow-600">{pendingCount} pendente(s)</span>}
                      {emittedCount > 0 && <span className="text-green-600">{emittedCount} emitida(s)</span>}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-foreground text-sm">{fmt(total)}</p>
                    <p className="text-xs text-muted-foreground">total período</p>
                  </div>

                  {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                </div>

                {isExpanded && (
                  <div className="border-t border-border/30">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/30 text-xs text-muted-foreground">
                            <th className="text-left px-4 py-2 w-8"></th>
                            <th className="text-left px-4 py-2">Pedido</th>
                            <th className="text-left px-4 py-2">Entrega</th>
                            <th className="text-left px-4 py-2">Status</th>
                            <th className="text-right px-4 py-2">Valor</th>
                            <th className="text-right px-4 py-2">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {compOrders.map((order: any) => {
                            const fStatus = order.fiscalStatus || 'nota_pendente';
                            const FIcon = FISCAL_ICON[fStatus] || Clock;
                            return (
                              <tr key={order.id} className={`border-t border-border/20 hover:bg-muted/20 transition-colors ${selectedOrders.has(order.id) ? 'bg-primary/5' : ''}`}>
                                <td className="px-4 py-3">
                                  <input
                                    type="checkbox"
                                    checked={selectedOrders.has(order.id)}
                                    onChange={() => toggleOrder(order.id)}
                                    className="w-4 h-4 rounded border-border accent-primary"
                                    data-testid={`checkbox-order-${order.id}`}
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <span className="font-mono font-bold text-foreground">#{order.id}</span>
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">{fmtDate(order.deliveryDate)}</td>
                                <td className="px-4 py-3">
                                  <select
                                    value={fStatus}
                                    onChange={e => fiscalMutation.mutate({ orderId: order.id, fiscalStatus: e.target.value })}
                                    className={`text-xs font-bold px-2 py-1 rounded-lg border cursor-pointer bg-transparent ${FISCAL_BADGE[fStatus] || 'bg-gray-100 text-gray-600 border-gray-300'}`}
                                    data-testid={`select-fiscal-status-${order.id}`}
                                  >
                                    <option value="nota_pendente">Pendente</option>
                                    <option value="nota_exportada">Exportada</option>
                                    <option value="nota_emitida">Emitida</option>
                                    <option value="nota_cancelada">Cancelada</option>
                                  </select>
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-foreground">{fmt(Number(order.totalValue || 0))}</td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-1.5 justify-end flex-wrap">
                                    <button
                                      data-testid={`button-view-danfe-fiscal-${order.id}`}
                                      onClick={() => handleViewDanfe(order)}
                                      className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors border border-blue-200"
                                      title="Visualizar DANFE"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      DANFE
                                    </button>
                                    <button
                                      data-testid={`button-download-danfe-fiscal-${order.id}`}
                                      onClick={() => handleDownloadDanfe(order)}
                                      className="flex items-center gap-1 px-2.5 py-1.5 bg-muted hover:bg-muted/80 text-muted-foreground rounded-lg text-xs font-bold transition-colors border border-border/50"
                                      title="Baixar DANFE PDF"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                      PDF
                                    </button>
                                    <button
                                      data-testid={`button-bling-fiscal-${order.id}`}
                                      onClick={() => blingMutation.mutate(order.id)}
                                      disabled={blingMutation.isPending}
                                      className="flex items-center gap-1 px-2.5 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg text-xs font-bold transition-colors border border-orange-200 disabled:opacity-50"
                                      title="Exportar para Bling"
                                    >
                                      <Send className="w-3.5 h-3.5" />
                                      Bling
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-muted/20 border-t border-border/30">
                            <td colSpan={4} className="px-4 py-2 text-xs text-muted-foreground font-medium">
                              Total consolidado — {compOrders.length} pedido(s)
                            </td>
                            <td className="px-4 py-2 text-right font-bold text-foreground">{fmt(total)}</td>
                            <td className="px-4 py-2"></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="pb-4 text-center text-xs text-muted-foreground">
        <TrendingUp className="w-3.5 h-3.5 inline mr-1" />
        Total geral visível: <strong>{fmt(stats.totalValue)}</strong> em {stats.total} pedidos
      </div>
    </div>
  );
}
