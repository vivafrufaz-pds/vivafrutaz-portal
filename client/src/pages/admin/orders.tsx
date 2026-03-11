import { useOrders } from "@/hooks/use-ordering";
import { useCompanies } from "@/hooks/use-admin";
import { Layout } from "@/components/Layout";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Receipt, Search } from "lucide-react";
import { useState } from "react";

export default function OrdersPage() {
  const { data: orders, isLoading } = useOrders();
  const { data: companies } = useCompanies();
  const [search, setSearch] = useState("");

  const filtered = orders?.filter(o => {
    const company = companies?.find(c => c.id === o.companyId);
    return !search || company?.companyName.toLowerCase().includes(search.toLowerCase()) || String(o.id).includes(search);
  });

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Todos os Pedidos</h1>
          <p className="text-muted-foreground mt-1">Visualize pedidos de todos os clientes e agendamentos de entrega.</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border/50 premium-shadow overflow-hidden">
        <div className="p-4 border-b border-border/50 flex gap-4 bg-muted/20">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input 
              data-testid="input-search-orders"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar pedidos por empresa ou número..." 
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/30 text-muted-foreground text-sm uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Nº Pedido</th>
                <th className="px-6 py-4 font-semibold">Empresa</th>
                <th className="px-6 py-4 font-semibold">Data do Pedido</th>
                <th className="px-6 py-4 font-semibold">Data de Entrega</th>
                <th className="px-6 py-4 font-semibold">Semana</th>
                <th className="px-6 py-4 font-semibold">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Carregando pedidos...</td></tr>
              ) : filtered?.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Nenhum pedido encontrado</td></tr>
              ) : (
                filtered?.map(order => {
                  const company = companies?.find(c => c.id === order.companyId);
                  return (
                    <tr key={order.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 font-bold text-primary">
                          <Receipt className="w-4 h-4" /> #{order.id.toString().padStart(4, '0')}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-foreground">{company?.companyName || 'Desconhecido'}</td>
                      <td className="px-6 py-4 text-muted-foreground font-medium">{format(new Date(order.orderDate), "d MMM yyyy", { locale: ptBR })}</td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-lg text-sm font-bold">
                          {format(new Date(order.deliveryDate), "EEEE, d MMM", { locale: ptBR })}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground font-medium">{order.weekReference}</td>
                      <td className="px-6 py-4 font-bold text-foreground">R$ {Number(order.totalValue).toFixed(2)}</td>
                    </tr>
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
