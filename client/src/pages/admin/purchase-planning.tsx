import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ShoppingCart, Package, ChevronDown, ChevronRight, TrendingUp, Calendar,
  CheckCircle, Clock, XCircle, Loader2, RefreshCw, Star, Filter, X
} from "lucide-react";
import type { PurchasePlanStatus } from "@shared/schema";

const STATUSES: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: "Pendente", color: "bg-gray-100 text-gray-700 border-gray-200", icon: Clock },
  BUYING: { label: "Comprando", color: "bg-blue-100 text-blue-700 border-blue-200", icon: ShoppingCart },
  BOUGHT: { label: "Comprado", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle },
  UNAVAILABLE: { label: "Indisponível", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
};

const CATEGORY_COLORS: Record<string, string> = {
  "Frutas": "bg-orange-100 text-orange-700",
  "Hortifruti / Verduras": "bg-green-100 text-green-700",
  "Industrializados": "bg-blue-100 text-blue-700",
};

interface PlanningItem {
  productId: number | null;
  productName: string;
  totalQty: number;
  unit: string;
  category?: string;
  productType?: string;
  source: 'regular' | 'special';
  companies: { companyId: number; companyName: string; quantity: number; deliveryDate: string; orderId: number; orderCode: string }[];
  planStatus: PurchasePlanStatus | null;
}

interface PlanningResult {
  items: PlanningItem[];
  totalOrders: number;
  period: { startDate: string; endDate: string };
}

function getWeekRef(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function getWeekRange(weekRef: string): { start: string; end: string } {
  const [year, week] = weekRef.split("-W");
  const jan4 = new Date(Date.UTC(Number(year), 0, 4));
  const startOfWeek = new Date(jan4);
  startOfWeek.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() || 7) - 1) + (Number(week) - 1) * 7);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 6);
  return {
    start: startOfWeek.toISOString().split("T")[0],
    end: endOfWeek.toISOString().split("T")[0],
  };
}

export default function PurchasePlanningPage() {
  const { toast } = useToast();
  const [weekRef, setWeekRef] = useState(getWeekRef(new Date()));
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [statusDialog, setStatusDialog] = useState<{ productName: string; current: PurchasePlanStatus | null } | null>(null);
  const [statusForm, setStatusForm] = useState({ status: "PENDING", supplier: "", expectedArrival: "", notes: "" });

  // Filters
  const [sourceFilter, setSourceFilter] = useState("all"); // all | regular | special
  const [categoryFilter, setCategoryFilter] = useState("all"); // all | Frutas | Hortifruti... | Industrializados

  const { start, end } = getWeekRange(weekRef);

  const { data, isLoading, refetch } = useQuery<PlanningResult>({
    queryKey: ["/api/purchase-planning", weekRef, sourceFilter, categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: start, endDate: end, weekRef,
        sourceFilter, categoryFilter,
      });
      const res = await fetch(`/api/purchase-planning?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao carregar dados");
      return res.json();
    },
  });

  const upsertMutation = useMutation({
    mutationFn: (payload: any) => apiRequest("POST", "/api/purchase-planning/status", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-planning", weekRef] });
      toast({ title: "Status atualizado" });
      setStatusDialog(null);
    },
    onError: () => toast({ title: "Erro ao atualizar status", variant: "destructive" }),
  });

  function openStatusDialog(item: PlanningItem) {
    setStatusDialog({ productName: item.productName, current: item.planStatus });
    setStatusForm({
      status: item.planStatus?.status || "PENDING",
      supplier: item.planStatus?.supplier || "",
      expectedArrival: item.planStatus?.expectedArrival || "",
      notes: item.planStatus?.notes || "",
    });
  }

  function submitStatus() {
    if (!statusDialog) return;
    upsertMutation.mutate({ weekRef, productName: statusDialog.productName, ...statusForm });
  }

  const weekOptions = useMemo(() => {
    const opts: string[] = [];
    for (let i = -4; i <= 8; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i * 7);
      opts.push(getWeekRef(d));
    }
    return [...new Set(opts)];
  }, []);

  const items = data?.items || [];
  const specialItems = items.filter(i => i.source === 'special');
  const regularItems = items.filter(i => i.source === 'regular');

  const hasFilters = sourceFilter !== 'all' || categoryFilter !== 'all';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-green-600" />
            Planejamento de Compras
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Itens dos pedidos confirmados + pedidos pontuais aprovados — gerencie o status de compra
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm whitespace-nowrap">Semana:</Label>
          <Select value={weekRef} onValueChange={setWeekRef}>
            <SelectTrigger className="w-44" data-testid="select-week-ref">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {weekOptions.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()} data-testid="button-refresh">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Period */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="w-4 h-4" />
        Período: {new Date(start + "T00:00:00").toLocaleDateString("pt-BR")} a {new Date(end + "T00:00:00").toLocaleDateString("pt-BR")}
        {data && <span className="ml-3">— {data.totalOrders} pedidos regulares</span>}
        {specialItems.length > 0 && <span className="ml-1 text-green-600 font-semibold">· {specialItems.length} item(s) pontual(is)</span>}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div>
              <Label className="text-xs text-muted-foreground block mb-1">Origem</Label>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-40 h-8 text-xs" data-testid="select-source-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os pedidos</SelectItem>
                  <SelectItem value="regular">Apenas regulares</SelectItem>
                  <SelectItem value="special">Apenas pontuais</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground block mb-1">Categoria</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48 h-8 text-xs" data-testid="select-category-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  <SelectItem value="Frutas">Frutas</SelectItem>
                  <SelectItem value="Hortifruti / Verduras">Hortifruti / Verduras</SelectItem>
                  <SelectItem value="Industrializados">Industrializados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quick filter chips */}
            <div className="flex gap-2 flex-wrap ml-2">
              <button type="button" onClick={() => { setSourceFilter("special"); setCategoryFilter("Industrializados"); }}
                data-testid="chip-industrializados-pontuais"
                className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${sourceFilter === 'special' && categoryFilter === 'Industrializados' ? 'bg-blue-600 text-white border-blue-600' : 'border-border text-muted-foreground hover:border-blue-400 hover:text-blue-700'}`}>
                Pontuais Industrializados
              </button>
              <button type="button" onClick={() => { setSourceFilter("special"); setCategoryFilter("Hortifruti / Verduras"); }}
                data-testid="chip-hortifruti-pontuais"
                className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${sourceFilter === 'special' && categoryFilter === 'Hortifruti / Verduras' ? 'bg-green-600 text-white border-green-600' : 'border-border text-muted-foreground hover:border-green-400 hover:text-green-700'}`}>
                Pontuais Hortifruti
              </button>
              <button type="button" onClick={() => { setSourceFilter("special"); setCategoryFilter("Frutas"); }}
                data-testid="chip-frutas-pontuais"
                className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${sourceFilter === 'special' && categoryFilter === 'Frutas' ? 'bg-orange-500 text-white border-orange-500' : 'border-border text-muted-foreground hover:border-orange-400 hover:text-orange-700'}`}>
                Pontuais Frutas
              </button>
            </div>

            {hasFilters && (
              <button type="button" onClick={() => { setSourceFilter("all"); setCategoryFilter("all"); }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium ml-auto">
                <X className="w-3 h-3" /> Limpar filtros
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Object.entries(STATUSES).map(([key, { label, color, icon: Icon }]) => {
          const count = items.filter(i => (i.planStatus?.status || "PENDING") === key).length;
          return (
            <Card key={key}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4" />
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
                <div className="text-2xl font-bold" data-testid={`text-status-${key.toLowerCase()}`}>{count}</div>
                <div className="text-xs text-muted-foreground">produtos</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Product list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Produtos necessários ({items.length})</span>
            <div className="flex items-center gap-2">
              {specialItems.length > 0 && (
                <span className="flex items-center gap-1 text-xs font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded-full border border-secondary/20">
                  <Star className="w-3 h-3" /> {specialItems.length} pontual
                </span>
              )}
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando dados dos pedidos...</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum produto encontrado com os filtros aplicados</p>
              {hasFilters && (
                <button type="button" onClick={() => { setSourceFilter("all"); setCategoryFilter("all"); }}
                  className="mt-2 text-primary text-sm font-bold hover:underline">Limpar filtros</button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {items.map(item => {
                const status = item.planStatus?.status || "PENDING";
                const { label, color, icon: StatusIcon } = STATUSES[status] || STATUSES.PENDING;
                const isExpanded = expandedProduct === item.productName;
                const isSpecial = item.source === 'special';

                return (
                  <div key={`${item.source}__${item.productName}`} data-testid={`row-product-${item.productName}`}
                    className={isSpecial ? 'border-l-2 border-secondary' : ''}>
                    <div
                      className="flex items-center gap-3 p-3 hover:bg-muted/20 transition-colors cursor-pointer"
                      onClick={() => setExpandedProduct(isExpanded ? null : item.productName)}
                    >
                      <button className="text-muted-foreground flex-shrink-0">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{item.productName}</span>
                          {isSpecial && (
                            <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-xs font-bold bg-secondary/10 text-secondary border border-secondary/20">
                              Pontual
                            </span>
                          )}
                          {item.category && (
                            <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-xs font-bold ${CATEGORY_COLORS[item.category] || 'bg-muted text-muted-foreground'}`}>
                              {item.category}
                            </span>
                          )}
                          {item.productType === 'external' && (
                            <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-700">
                              Fora catálogo
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.companies.length} empresa{item.companies.length !== 1 ? "s" : ""} · {item.totalQty.toFixed(2)} {item.unit}
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {label}
                      </span>
                      {item.planStatus?.supplier && (
                        <span className="text-xs text-muted-foreground hidden sm:block">{item.planStatus.supplier}</span>
                      )}
                      <Button size="sm" variant="outline" className="flex-shrink-0 h-7 text-xs"
                        onClick={e => { e.stopPropagation(); openStatusDialog(item); }}
                        data-testid={`button-status-${item.productName}`}>
                        Atualizar
                      </Button>
                    </div>

                    {isExpanded && (
                      <div className="bg-muted/30 px-6 pb-3 pt-1">
                        <div className="text-xs font-medium text-muted-foreground mb-2">Detalhes por empresa:</div>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-muted-foreground">
                              <th className="text-left py-1">Empresa</th>
                              <th className="text-right py-1">Qtd.</th>
                              <th className="text-left py-1 pl-4">Entrega</th>
                              <th className="text-left py-1 pl-4">Pedido</th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.companies.map((c, i) => (
                              <tr key={i} className="border-t border-border/50">
                                <td className="py-1">{c.companyName}</td>
                                <td className="py-1 text-right font-mono">{c.quantity.toFixed(2)} {item.unit}</td>
                                <td className="py-1 pl-4">{c.deliveryDate}</td>
                                <td className="py-1 pl-4 font-mono text-muted-foreground">{c.orderCode}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {item.planStatus?.notes && (
                          <div className="mt-2 text-xs text-muted-foreground italic">Obs: {item.planStatus.notes}</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Dialog */}
      <Dialog open={!!statusDialog} onOpenChange={() => setStatusDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Status de Compra</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 text-sm text-muted-foreground mb-2">
            Produto: <span className="font-medium text-foreground">{statusDialog?.productName}</span>
          </div>
          <div className="space-y-4 py-2">
            <div>
              <Label>Status</Label>
              <Select value={statusForm.status} onValueChange={v => setStatusForm(f => ({ ...f, status: v }))}>
                <SelectTrigger data-testid="select-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUSES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fornecedor</Label>
              <Input value={statusForm.supplier} onChange={e => setStatusForm(f => ({ ...f, supplier: e.target.value }))}
                placeholder="Nome do fornecedor" data-testid="input-supplier" />
            </div>
            <div>
              <Label>Previsão de Chegada</Label>
              <Input type="date" value={statusForm.expectedArrival}
                onChange={e => setStatusForm(f => ({ ...f, expectedArrival: e.target.value }))}
                data-testid="input-expected-arrival" />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={statusForm.notes} onChange={e => setStatusForm(f => ({ ...f, notes: e.target.value }))}
                rows={2} placeholder="Informações adicionais..." data-testid="textarea-status-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialog(null)}>Cancelar</Button>
            <Button onClick={submitStatus} disabled={upsertMutation.isPending}
              className="bg-green-600 hover:bg-green-700" data-testid="button-submit-status">
              {upsertMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
