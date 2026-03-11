import { useAuth } from "@/hooks/use-auth";
import { useOrders } from "@/hooks/use-ordering";
import { useCompanies } from "@/hooks/use-admin";
import { Layout } from "@/components/Layout";
import { ShoppingCart, Users, TrendingUp, Package } from "lucide-react";

export default function AdminDashboard() {
  const { user } = useAuth();
  const { data: orders } = useOrders();
  const { data: companies } = useCompanies();

  const totalValue = orders?.reduce((acc, o) => acc + Number(o.totalValue), 0) || 0;
  const activeCompanies = companies?.filter(c => c.active).length || 0;

  const stats = [
    { label: "Total de Pedidos", value: orders?.length || 0, icon: ShoppingCart, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Receita Total", value: `R$ ${totalValue.toFixed(2)}`, icon: TrendingUp, color: "text-green-500", bg: "bg-green-500/10" },
    { label: "Clientes Ativos", value: activeCompanies, icon: Users, color: "text-orange-500", bg: "bg-orange-500/10" },
    { label: "Entregas Pendentes", value: orders?.length || 0, icon: Package, color: "text-purple-500", bg: "bg-purple-500/10" },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Olá, {user?.name}!</h1>
          <p className="text-muted-foreground mt-1 text-lg">Veja o resumo de hoje no VivaFrutaz.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <div key={i} className="bg-card rounded-2xl p-6 border border-border/50 premium-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-display font-bold mt-2 text-foreground">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-card rounded-2xl p-8 border border-border/50 premium-shadow flex items-center justify-center min-h-[300px]">
          <div className="text-center">
            <Package className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-bold text-foreground">Sistema Ativo</h3>
            <p className="text-muted-foreground mt-2">Use o menu lateral para gerenciar catálogo, clientes e pedidos.</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
