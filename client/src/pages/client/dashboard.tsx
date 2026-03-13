import { useAuth } from "@/hooks/use-auth";
import { useActiveOrderWindow, useCompanyOrders } from "@/hooks/use-ordering";
import { Layout } from "@/components/Layout";
import { Link, useLocation } from "wouter";
import { ShoppingCart, History, AlertCircle, CheckCircle2, Info, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const DAY_MAP: Record<string, string> = {
  "Segunda-feira": "Segunda-feira", "Terça-feira": "Terça-feira",
  "Quarta-feira": "Quarta-feira", "Quinta-feira": "Quinta-feira",
  "Sexta-feira": "Sexta-feira",
  "Monday": "Segunda-feira", "Tuesday": "Terça-feira", "Wednesday": "Quarta-feira",
  "Thursday": "Quinta-feira", "Friday": "Sexta-feira",
};

export default function ClientDashboard() {
  const { company } = useAuth();
  const { data: activeWindow } = useActiveOrderWindow();
  const { data: orders } = useCompanyOrders(company?.id);
  const [, setLocation] = useLocation();

  const isFirstOrder = !orders || orders.length === 0;

  const getAllowedDays = (): string[] => {
    const days = company?.allowedOrderDays;
    if (!days) return [];
    if (Array.isArray(days)) return (days as any[]).map(d => DAY_MAP[String(d)] || String(d));
    return [];
  };

  const allowedDays = getAllowedDays();
  const handleDayClick = (day: string) => setLocation(`/client/order?day=${encodeURIComponent(day)}`);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Welcome header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 rounded-3xl p-8 sm:p-10 text-primary-foreground shadow-xl shadow-primary/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-[-10%] left-[10%] w-48 h-48 bg-black/10 rounded-full blur-2xl" />

          <div className="relative z-10">
            <h1 className="text-3xl sm:text-4xl font-display font-extrabold tracking-tight">
              Olá, {company?.contactName}!
            </h1>
            <p className="mt-2 text-lg text-primary-foreground/90 font-medium">
              Bem-vindo ao portal da VivaFrutaz.
              {isFirstOrder ? " Vamos criar seu primeiro pedido de frutas!" : " Vamos reabastecer seu estoque de frutas."}
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link href="/client/order" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-primary font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all">
                <ShoppingCart className="w-5 h-5" /> Novo Pedido
              </Link>
              <Link href="/client/history" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-primary-foreground/10 hover:bg-primary-foreground/20 text-white font-bold rounded-xl transition-all">
                <History className="w-5 h-5" /> Meus Pedidos
              </Link>
            </div>
          </div>
        </div>

        {/* Operational notices */}
        <div className="bg-card rounded-2xl border border-border/50 premium-shadow p-5">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-5 h-5 text-primary flex-shrink-0" />
            <h2 className="font-bold text-foreground">Informações Operacionais</h2>
          </div>
          <div className="space-y-2">
            <div className="flex items-start gap-2 p-3 bg-muted/40 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-sm text-foreground">
                Pedido será fornecido conforme planilha preenchida. Favor atenção aos tipos de embalagens.
              </p>
            </div>
            <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-100 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-orange-800">
                <strong>Prazo para cancelamento ou redução de pedido:</strong> 2 dias úteis de antecedência, até às 09:00.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Order window status */}
          <div className="bg-card rounded-2xl p-6 border border-border/50 premium-shadow">
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" /> Status do Pedido
            </h2>

            {activeWindow ? (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-green-50 border border-green-200">
                  <p className="text-green-800 font-bold flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    Pedidos ABERTOS — {activeWindow.weekReference}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Prazo para Pedidos</p>
                  <p className="text-base font-bold text-foreground">{format(new Date(activeWindow.orderCloseDate), "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR })}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Período de Entregas</p>
                  <p className="text-base font-bold text-foreground">
                    {format(new Date(activeWindow.deliveryStartDate), "d 'de' MMM", { locale: ptBR })} – {format(new Date(activeWindow.deliveryEndDate), "d 'de' MMM", { locale: ptBR })}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-xl bg-muted/50 border border-border/50 text-center">
                <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="font-bold text-muted-foreground">Prazo de pedidos encerrado.</p>
                <p className="text-sm text-muted-foreground mt-1">Aguarde a abertura da próxima janela.</p>
              </div>
            )}
          </div>

          {/* Delivery day buttons */}
          <div className="bg-card rounded-2xl p-6 border border-border/50 premium-shadow">
            <h2 className="text-lg font-bold text-foreground mb-1 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" /> Seus Dias de Entrega
            </h2>
            <p className="text-xs text-muted-foreground mb-4">Clique em um dia para iniciar o pedido.</p>

            {allowedDays.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum dia de entrega configurado. Contate o administrador.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {allowedDays.map(day => (
                  <button
                    key={day}
                    data-testid={`button-day-${day}`}
                    onClick={() => handleDayClick(day)}
                    disabled={!activeWindow}
                    className="w-full flex items-center justify-between px-5 py-3.5 bg-primary/10 hover:bg-primary text-primary hover:text-white font-bold rounded-xl transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>{day}</span>
                    <ShoppingCart className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
