import { useAuth } from "@/hooks/use-auth";
import { useOrders } from "@/hooks/use-ordering";
import { useCompanies } from "@/hooks/use-admin";
import { Layout } from "@/components/Layout";
import { ShoppingCart, Users, TrendingUp, Package, Wrench, CheckCircle2, AlertTriangle, FlaskConical, Shield } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

/* ── Reusable visual toggle switch ──────────────────────────── */
function ToggleSwitch({
  enabled,
  onChange,
  disabled,
  colorOn = "bg-red-500",
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  colorOn?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-7 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
        enabled ? colorOn : "bg-muted"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
          enabled ? "translate-x-7" : "translate-x-0"
        }`}
      />
    </button>
  );
}

/* ── Maintenance toggle card ─────────────────────────────────── */
function MaintenanceToggle() {
  const { data, isLoading } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/settings/maintenance"],
    staleTime: 0,
    refetchOnMount: true,
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const toggle = useMutation({
    mutationFn: async (enable: boolean) => {
      const res = await fetch("/api/settings/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: enable }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Sem permissão");
      return res.json() as Promise<{ enabled: boolean }>;
    },
    onMutate: async (enable) => {
      await queryClient.cancelQueries({ queryKey: ["/api/settings/maintenance"] });
      const previous = queryClient.getQueryData(["/api/settings/maintenance"]);
      queryClient.setQueryData(["/api/settings/maintenance"], { enabled: enable });
      return { previous };
    },
    onError: (_err, _enable, context) => {
      if (context?.previous)
        queryClient.setQueryData(["/api/settings/maintenance"], context.previous);
      toast({ title: "Erro ao alterar modo manutenção", variant: "destructive" });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/settings/maintenance"], data);
      queryClient.invalidateQueries({ queryKey: ["/api/settings/maintenance"] });
      toast({
        title: data.enabled
          ? "Modo manutenção ativado."
          : "Modo manutenção desativado.",
        variant: data.enabled ? "destructive" : "default",
      });
    },
  });

  const enabled = data?.enabled ?? false;

  return (
    <div
      className={`rounded-2xl border-2 p-5 transition-all premium-shadow ${
        enabled ? "bg-red-50 border-red-300 dark:bg-red-950/30 dark:border-red-700" : "bg-card border-border/50"
      }`}
    >
      {enabled && (
        <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-red-100 border border-red-300 text-red-700 text-sm font-bold dark:bg-red-900/40 dark:border-red-700 dark:text-red-300">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 animate-pulse" />
          Modo manutenção ativado — clientes não podem acessar o sistema.
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${enabled ? "bg-red-100 dark:bg-red-900/40" : "bg-muted"}`}>
            <Wrench className={`w-5 h-5 ${enabled ? "text-red-600" : "text-muted-foreground"}`} />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">Modo Manutenção</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {enabled
                ? "Clientes bloqueados — sistema em manutenção"
                : "Sistema operando normalmente"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className={`text-xs font-bold ${enabled ? "text-red-600" : "text-muted-foreground"}`}>
            {enabled ? "LIGADO" : "DESLIGADO"}
          </span>
          <ToggleSwitch
            enabled={enabled}
            onChange={(v) => toggle.mutate(v)}
            disabled={toggle.isPending || isLoading}
            colorOn="bg-red-500"
          />
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {enabled
          ? "Para restaurar o acesso dos clientes, desligue este modo."
          : "Ao ligar, clientes perderão acesso temporariamente até a manutenção ser concluída."}
      </p>
    </div>
  );
}

/* ── Test mode toggle card ───────────────────────────────────── */
function TestModeToggle() {
  const { data, isLoading } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/settings/test-mode"],
    staleTime: 0,
    refetchOnMount: true,
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const toggle = useMutation({
    mutationFn: async (enable: boolean) => {
      const res = await fetch("/api/settings/test-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: enable }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Sem permissão");
      return res.json() as Promise<{ enabled: boolean }>;
    },
    onMutate: async (enable) => {
      await queryClient.cancelQueries({ queryKey: ["/api/settings/test-mode"] });
      const previous = queryClient.getQueryData(["/api/settings/test-mode"]);
      queryClient.setQueryData(["/api/settings/test-mode"], { enabled: enable });
      return { previous };
    },
    onError: (_err, _enable, context) => {
      if (context?.previous)
        queryClient.setQueryData(["/api/settings/test-mode"], context.previous);
      toast({ title: "Erro ao alterar modo teste", variant: "destructive" });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/settings/test-mode"], data);
      queryClient.invalidateQueries({ queryKey: ["/api/settings/test-mode"] });
      toast({
        title: data.enabled
          ? "Modo Teste ativado."
          : "Modo Teste desativado.",
        variant: data.enabled ? "default" : "default",
      });
    },
  });

  const enabled = data?.enabled ?? false;

  return (
    <div
      className={`rounded-2xl border-2 p-5 transition-all premium-shadow ${
        enabled ? "bg-amber-50 border-amber-300 dark:bg-amber-950/30 dark:border-amber-700" : "bg-card border-border/50"
      }`}
    >
      {enabled && (
        <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 text-sm font-bold dark:bg-amber-900/40 dark:border-amber-700 dark:text-amber-300">
          <FlaskConical className="w-4 h-4 flex-shrink-0 animate-pulse" />
          Modo Teste ativado — pedidos são salvos como TESTE e não afetam dados reais.
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${enabled ? "bg-amber-100 dark:bg-amber-900/40" : "bg-muted"}`}>
            <FlaskConical className={`w-5 h-5 ${enabled ? "text-amber-700" : "text-muted-foreground"}`} />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">Modo Teste</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {enabled
                ? "Pedidos são salvos como TESTE — não afetam dados reais"
                : "Pedidos são processados normalmente"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className={`text-xs font-bold ${enabled ? "text-amber-700" : "text-muted-foreground"}`}>
            {enabled ? "LIGADO" : "DESLIGADO"}
          </span>
          <ToggleSwitch
            enabled={enabled}
            onChange={(v) => toggle.mutate(v)}
            disabled={toggle.isPending || isLoading}
            colorOn="bg-amber-500"
          />
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {enabled
          ? "Para retornar ao fluxo normal, desligue este modo."
          : "Ao ligar, todos os pedidos criados serão marcados como TESTE e não entrarão no fluxo real."}
      </p>
    </div>
  );
}

/* ── System status banner ────────────────────────────────────── */
function SystemStatusBanner() {
  const { data: maintData } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/settings/maintenance"],
    staleTime: 0,
    refetchOnMount: true,
  });
  const { data: testData } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/settings/test-mode"],
    staleTime: 0,
    refetchOnMount: true,
  });

  const maintActive = maintData?.enabled === true;
  const testActive = testData?.enabled === true;

  if (maintActive) {
    return (
      <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-red-100 border-2 border-red-300 text-red-700 font-bold text-sm premium-shadow dark:bg-red-950/40 dark:border-red-700 dark:text-red-300">
        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        Modo Manutenção Ativo — clientes sem acesso ao sistema
      </div>
    );
  }
  if (testActive) {
    return (
      <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-amber-100 border-2 border-amber-300 text-amber-800 font-bold text-sm premium-shadow dark:bg-amber-950/40 dark:border-amber-700 dark:text-amber-300">
        <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
        <FlaskConical className="w-4 h-4 flex-shrink-0" />
        Modo Teste Ativo — pedidos criados são marcados como TESTE
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-green-50 border-2 border-green-200 text-green-700 font-bold text-sm premium-shadow dark:bg-green-950/40 dark:border-green-700 dark:text-green-300">
      <div className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
      Sistema Operando Normalmente
    </div>
  );
}

/* ── Main dashboard ──────────────────────────────────────────── */
export default function AdminDashboard() {
  const { user } = useAuth();
  const { data: orders } = useOrders();
  const { data: companies } = useCompanies();

  const totalValue = orders?.reduce((acc, o) => acc + Number(o.totalValue), 0) || 0;
  const activeCompanies = companies?.filter((c) => c.active).length || 0;

  const stats = [
    { label: "Total de Pedidos", value: orders?.length || 0, icon: ShoppingCart, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Receita Total", value: `R$ ${totalValue.toFixed(2)}`, icon: TrendingUp, color: "text-green-500", bg: "bg-green-500/10" },
    { label: "Clientes Ativos", value: activeCompanies, icon: Users, color: "text-orange-500", bg: "bg-orange-500/10" },
    { label: "Entregas Pendentes", value: orders?.length || 0, icon: Package, color: "text-purple-500", bg: "bg-purple-500/10" },
  ];

  const canToggleMaintenance = ["ADMIN", "DIRECTOR", "DEVELOPER"].includes(user?.role || "");

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Olá, {user?.name}!</h1>
          <p className="text-muted-foreground mt-1 text-lg">Veja o resumo de hoje no VivaFrutaz.</p>
        </div>

        {/* System status banner — always visible for allowed roles */}
        {canToggleMaintenance && <SystemStatusBanner />}

        {/* Stats */}
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

        {/* Mode controls */}
        {canToggleMaintenance && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Controle de Modos do Sistema
            </h2>
            <MaintenanceToggle />
            <TestModeToggle />
          </div>
        )}

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
