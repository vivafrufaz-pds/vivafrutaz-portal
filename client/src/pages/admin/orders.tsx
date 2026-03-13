import { useState } from "react";
import { useOrders, useOrderDetail } from "@/hooks/use-ordering";
import { useCompanies } from "@/hooks/use-admin";
import { useProducts } from "@/hooks/use-catalog";
import { Layout } from "@/components/Layout";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Receipt, Search, ChevronDown, ChevronUp, MessageSquare, Package, FileText } from "lucide-react";

function OrderRow({ order, companyName, products }: { order: any; companyName: string; products: any[] }) {
  const [expanded, setExpanded] = useState(false);
  const { data: detail } = useOrderDetail(expanded ? order.id : undefined);

  return (
    <>
      <tr className="hover:bg-muted/10 transition-colors cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <td className="px-6 py-4">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary flex-shrink-0" />
            <div>
              <p className="font-bold text-primary font-mono text-sm">
                {order.orderCode || `#${String(order.id).padStart(4, '0')}`}
              </p>
            </div>
          </div>
        </td>
        <td className="px-6 py-4">
          <p className="font-bold text-foreground">{companyName}</p>
        </td>
        <td className="px-6 py-4">
          <div>
            <p className="font-medium text-foreground">{format(new Date(order.orderDate), "d MMM yyyy", { locale: ptBR })}</p>
            <p className="text-xs text-muted-foreground">{format(new Date(order.orderDate), "HH:mm")}</p>
          </div>
        </td>
        <td className="px-6 py-4">
          <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-lg text-sm font-bold">
            {format(new Date(order.deliveryDate), "EEE, d MMM", { locale: ptBR })}
          </span>
        </td>
        <td className="px-6 py-4">
          {order.orderNote ? (
            <span className="flex items-center gap-1 text-sm text-blue-600 font-medium">
              <MessageSquare className="w-4 h-4" />
              <span className="truncate max-w-[120px]">{order.orderNote}</span>
            </span>
          ) : (
            <span className="text-muted-foreground text-sm">—</span>
          )}
        </td>
        <td className="px-6 py-4 font-bold text-foreground">R$ {Number(order.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
        <td className="px-6 py-4 text-muted-foreground">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </td>
      </tr>

      {/* Expanded detail row */}
      {expanded && (
        <tr>
          <td colSpan={7} className="px-6 py-0 bg-muted/20 border-b border-border/50">
            <div className="py-5 space-y-4">
              {/* Order note */}
              {order.orderNote && (
                <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <MessageSquare className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">Observação do cliente</p>
                    <p className="text-sm text-blue-900">{order.orderNote}</p>
                  </div>
                </div>
              )}

              {/* Items */}
              {!detail ? (
                <p className="text-sm text-muted-foreground">Carregando itens...</p>
              ) : detail.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum item.</p>
              ) : (
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Package className="w-3.5 h-3.5" /> Itens do pedido
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {detail.items.map((item: any) => {
                      const product = products.find(p => p.id === Number(item.productId));
                      return (
                        <div key={item.id} className="bg-card rounded-xl p-3 border border-border/50 flex justify-between items-center">
                          <div>
                            <p className="font-bold text-sm text-foreground">{product?.name || `Produto #${item.productId}`}</p>
                            <p className="text-xs text-muted-foreground">{item.quantity} × R$ {Number(item.unitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          </div>
                          <p className="font-bold text-sm text-primary">
                            R$ {Number(item.totalPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function OrdersPage() {
  const { data: orders, isLoading } = useOrders();
  const { data: companies } = useCompanies();
  const { data: products } = useProducts();
  const [search, setSearch] = useState("");

  const filtered = orders?.filter(o => {
    const company = companies?.find(c => c.id === o.companyId);
    const code = (o as any).orderCode || '';
    return !search ||
      company?.companyName.toLowerCase().includes(search.toLowerCase()) ||
      code.toLowerCase().includes(search.toLowerCase()) ||
      String(o.id).includes(search);
  });

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Todos os Pedidos</h1>
          <p className="text-muted-foreground mt-1">Visualize e gerencie pedidos com detalhes de itens e observações.</p>
        </div>
        {orders && (
          <div className="px-4 py-2 bg-primary/10 rounded-xl text-primary font-bold text-sm flex items-center gap-2">
            <FileText className="w-4 h-4" /> {orders.length} pedido(s)
          </div>
        )}
      </div>

      <div className="bg-card rounded-2xl border border-border/50 premium-shadow overflow-hidden">
        <div className="p-4 border-b border-border/50 flex gap-4 bg-muted/20">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              data-testid="input-search-orders"
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por empresa ou código VF-..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/30 border-b border-border/50 text-muted-foreground text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Código</th>
                <th className="px-6 py-4 font-semibold">Empresa</th>
                <th className="px-6 py-4 font-semibold">Data / Hora</th>
                <th className="px-6 py-4 font-semibold">Entrega</th>
                <th className="px-6 py-4 font-semibold">Observação</th>
                <th className="px-6 py-4 font-semibold">Total</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">Carregando pedidos...</td></tr>
              ) : filtered?.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">Nenhum pedido encontrado</td></tr>
              ) : (
                filtered?.map(order => {
                  const company = companies?.find(c => c.id === order.companyId);
                  return (
                    <OrderRow
                      key={order.id}
                      order={order}
                      companyName={company?.companyName || 'Desconhecido'}
                      products={products || []}
                    />
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
