import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCompanyOrders } from "@/hooks/use-ordering";
import { Layout } from "@/components/Layout";
import { format, parseISO, isSameMonth, isSameYear, getYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Receipt, Calendar, Plus, Filter, X, CheckCircle, Clock } from "lucide-react";
import { Link } from "wouter";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "Ativo", color: "bg-green-100 text-green-700" },
  CANCELLED: { label: "Cancelado", color: "bg-red-100 text-red-700" },
  DELIVERED: { label: "Entregue", color: "bg-blue-100 text-blue-700" },
  PENDING: { label: "Pendente", color: "bg-yellow-100 text-yellow-700" },
};

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

function CompanyMissing() {
  return (
    <Layout>
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center mb-4 mx-auto text-3xl">⚠️</div>
        <h2 className="text-xl font-bold text-foreground mb-2">Dados da empresa não encontrados.</h2>
        <p className="text-muted-foreground text-sm max-w-sm">Entre em contato com a equipe VivaFrutaz.</p>
      </div>
    </Layout>
  );
}

export default function OrderHistoryPage() {
  const { company, isLoading: authLoading } = useAuth();
  const { data: orders, isLoading } = useCompanyOrders(company?.id);

  const today = new Date();
  const [filterMonth, setFilterMonth] = useState<string>("");
  const [filterYear, setFilterYear] = useState<string>("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const years = useMemo(() => {
    const yrs = new Set<number>();
    orders?.forEach(o => yrs.add(getYear(new Date(o.orderDate))));
    if (yrs.size === 0) yrs.add(today.getFullYear());
    return Array.from(yrs).sort((a, b) => b - a);
  }, [orders]);

  const filtered = useMemo(() => {
    const sorted = [...(orders || [])].sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
    return sorted.filter(o => {
      const d = new Date(o.orderDate);
      if (filterYear && getYear(d) !== Number(filterYear)) return false;
      if (filterMonth && d.getMonth() !== Number(filterMonth)) return false;
      if (filterDateFrom && d < new Date(filterDateFrom)) return false;
      if (filterDateTo && d > new Date(filterDateTo + 'T23:59:59')) return false;
      return true;
    });
  }, [orders, filterYear, filterMonth, filterDateFrom, filterDateTo]);

  const clearFilters = () => { setFilterMonth(""); setFilterYear(""); setFilterDateFrom(""); setFilterDateTo(""); };
  const hasFilters = filterMonth || filterYear || filterDateFrom || filterDateTo;

  if (!authLoading && !company) return <CompanyMissing />;

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Meus Pedidos</h1>
          <p className="text-muted-foreground mt-1">Histórico completo de entregas e pedidos.</p>
        </div>
        <Link href="/client/order" className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25">
          <Plus className="w-4 h-4" /> Novo Pedido
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-2xl border border-border/50 premium-shadow p-4 mb-6 flex flex-wrap gap-3 items-center">
        <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />

        <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
          className="px-3 py-2 rounded-xl border-2 border-border text-sm focus:border-primary outline-none">
          <option value="">Todos os anos</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
          className="px-3 py-2 rounded-xl border-2 border-border text-sm focus:border-primary outline-none">
          <option value="">Todos os meses</option>
          {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
            className="px-3 py-2 rounded-xl border-2 border-border text-sm focus:border-primary outline-none" />
          <span className="text-muted-foreground text-sm">até</span>
          <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
            className="px-3 py-2 rounded-xl border-2 border-border text-sm focus:border-primary outline-none" />
        </div>

        {hasFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium ml-auto">
            <X className="w-3 h-3" /> Limpar filtros
          </button>
        )}

        <span className="text-xs text-muted-foreground font-medium ml-auto">
          {filtered.length} pedido{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid gap-5">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando histórico...</div>
        ) : orders?.length === 0 ? (
          <div className="bg-card rounded-2xl p-12 text-center border border-border/50">
            <Receipt className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-foreground">Nenhum Pedido</h3>
            <p className="text-muted-foreground mt-2">Você ainda não realizou nenhum pedido.</p>
            <Link href="/client/order" className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-colors">
              Fazer Primeiro Pedido
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card rounded-2xl p-8 text-center border border-border/50">
            <p className="text-muted-foreground">Nenhum pedido no período selecionado.</p>
            <button onClick={clearFilters} className="text-primary font-bold text-sm hover:underline mt-2">Limpar filtros</button>
          </div>
        ) : (
          filtered.map(order => {
            const status = STATUS_LABELS[order.status] || { label: order.status, color: 'bg-muted text-muted-foreground' };
            return (
              <div key={order.id} className="bg-card rounded-2xl border border-border/50 premium-shadow p-6 hover:border-primary/30 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left side */}
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-mono font-bold text-base flex-shrink-0">
                      <Receipt className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-foreground font-mono">{order.orderCode || `#${String(order.id).padStart(4, '0')}`}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${status.color}`}>{status.label}</span>
                      </div>
                      <p className="text-sm font-semibold text-muted-foreground">{order.weekReference}</p>
                      <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Pedido: {format(new Date(order.orderDate), "d 'de' MMM yyyy", { locale: ptBR })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Entrega: {format(new Date(order.deliveryDate), "EEEE, d 'de' MMM", { locale: ptBR })}
                        </span>
                      </div>
                      {order.adminNote && (
                        <p className="text-xs text-blue-600 mt-1 font-medium italic">📋 {order.adminNote}</p>
                      )}
                    </div>
                  </div>

                  {/* Right side */}
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total</p>
                      <p className="text-2xl font-display font-bold text-primary">R$ {Number(order.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <Link href={`/client/order`}
                      data-testid={`button-reorder-${order.id}`}
                      className="p-3 bg-secondary/10 text-secondary rounded-xl hover:bg-secondary hover:text-white transition-all font-bold text-sm px-5">
                      Repetir
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Layout>
  );
}
