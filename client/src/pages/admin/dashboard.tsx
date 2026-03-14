import { useAuth } from "@/hooks/use-auth";
import { useOrders } from "@/hooks/use-ordering";
import { useCompanies } from "@/hooks/use-admin";
import { Layout } from "@/components/Layout";
import { ShoppingCart, Users, TrendingUp, Package, Wrench, CheckCircle, AlertTriangle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

function MaintenanceToggle() {
  const { data, isLoading } = useQuery<{ enabled: boolean }>({
    queryKey: ['/api/settings/maintenance'],
    staleTime: 10000,
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const toggle = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await fetch('/api/settings/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Sem permissão');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings/maintenance'] });
      toast({
        title: data.enabled ? 'Modo manutenção ativado' : 'Modo manutenção desativado',
        description: data.enabled
          ? 'Clientes não podem acessar o sistema.'
          : 'Sistema liberado para clientes.',
        variant: data.enabled ? 'destructive' : 'default',
      });
    },
    onError: () => toast({ title: 'Erro ao alterar modo manutenção', variant: 'destructive' }),
  });

  const enabled = data?.enabled ?? false;

  return (
    <div className={`rounded-2xl border-2 p-5 flex items-center justify-between gap-4 premium-shadow transition-all ${
      enabled ? 'bg-red-50 border-red-200' : 'bg-card border-border/50'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${enabled ? 'bg-red-100' : 'bg-muted'}`}>
          <Wrench className={`w-5 h-5 ${enabled ? 'text-red-600' : 'text-muted-foreground'}`} />
        </div>
        <div>
          <p className="font-bold text-sm text-foreground">Modo Manutenção</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {enabled
              ? 'Clientes bloqueados — sistema em manutenção'
              : 'Sistema operando normalmente'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {enabled ? (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
            <AlertTriangle className="w-3 h-3" /> ATIVO
          </span>
        ) : (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
            <CheckCircle className="w-3 h-3" /> NORMAL
          </span>
        )}
        <button
          data-testid="button-toggle-maintenance"
          onClick={() => toggle.mutate(!enabled)}
          disabled={toggle.isPending || isLoading}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50 ${
            enabled
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-red-500 hover:bg-red-600 text-white'
          }`}
        >
          {toggle.isPending ? '...' : enabled ? 'Desativar Manutenção' : 'Ativar Manutenção'}
        </button>
      </div>
    </div>
  );
}

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

  const canToggleMaintenance = ['ADMIN', 'DIRECTOR', 'DEVELOPER'].includes(user?.role || '');

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

        {canToggleMaintenance && <MaintenanceToggle />}

        <div className="bg-card rounded-2xl p-8 border border-border/50 premium-shadow flex items-center justify-center min-h-[200px]">
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
