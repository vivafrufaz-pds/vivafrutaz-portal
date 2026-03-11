import { useAuth } from "@/hooks/use-auth";
import { useActiveOrderWindow, useCompanyOrders } from "@/hooks/use-ordering";
import { Layout } from "@/components/Layout";
import { Link, useLocation } from "wouter";
import { ShoppingCart, History, AlertCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const DAY_MAP: Record<string, string> = {
  "Segunda-feira": "Segunda-feira",
  "Terça-feira": "Terça-feira",
  "Quarta-feira": "Quarta-feira",
  "Quinta-feira": "Quinta-feira",
  "Sexta-feira": "Sexta-feira",
  // backward compat English
  "Monday": "Segunda-feira",
  "Tuesday": "Terça-feira",
  "Wednesday": "Quarta-feira",
  "Thursday": "Quinta-feira",
  "Friday": "Sexta-feira",
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

  const handleDayClick = (day: string) => {
    setLocation(`/client/order?day=${encodeURIComponent(day)}`);
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Welcome header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 rounded-3xl p-8 sm:p-12 text-primary-foreground shadow-xl shadow-primary/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-[-10%] left-[10%] w-48 h-48 bg-black/10 rounded-full blur-2xl" />
          
          <div className="relative z-10 max-w-2xl">
            <h1 className="text-4xl sm:text-5xl font-display font-extrabold tracking-tight">
              Olá, {company?.contactName}!
            </h1>
            {isFirstOrder ? (
              <p className="mt-4 text-lg sm:text-xl text-primary-foreground/90 font-medium">
                Crie seu primeiro pedido de frutas. 🍎
              </p>
            ) : (
              <p className="mt-4 text-lg sm:text-xl text-primary-foreground/90 font-medium">
                Bem-vindo ao portal da {company?.companyName}. Vamos reabastecer seu estoque de frutas frescas.
              </p>
            )}
            
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link href="/client/order" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-primary font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all">
                <ShoppingCart className="w-5 h-5" /> Novo Pedido
              </Link>
              <Link href="/client/history" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary-foreground/10 hover:bg-primary-foreground/20 text-white font-bold rounded-xl transition-all">
                <History className="w-5 h-5" /> Ver Histórico
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Order window status */}
          <div className="bg-card rounded-2xl p-8 border border-border/50 premium-shadow">
            <h2 className="text-xl font-bold text-foreground mb-4">Status do Pedido</h2>
            
            {activeWindow ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <p className="text-green-800 dark:text-green-400 font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    Pedidos ABERTOS — {activeWindow.weekReference}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Prazo para Pedidos:</p>
                  <p className="text-lg font-bold text-foreground">{format(new Date(activeWindow.orderCloseDate), "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR })}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Período de Entregas:</p>
                  <p className="text-lg font-bold text-foreground">
                    {format(new Date(activeWindow.deliveryStartDate), "d 'de' MMM", { locale: ptBR })} - {format(new Date(activeWindow.deliveryEndDate), "d 'de' MMM", { locale: ptBR })}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-muted/50 border border-border/50 text-center">
                <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="font-bold text-muted-foreground text-lg">Prazo de pedidos encerrado para esta semana.</p>
                <p className="text-sm text-muted-foreground mt-2">Aguarde a abertura da próxima janela de pedidos.</p>
              </div>
            )}
          </div>

          {/* Delivery day buttons */}
          <div className="bg-card rounded-2xl p-8 border border-border/50 premium-shadow">
            <h2 className="text-xl font-bold text-foreground mb-2">Seus Dias de Entrega</h2>
            <p className="text-sm text-muted-foreground mb-6">Clique em um dia para iniciar o pedido.</p>
            
            {allowedDays.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum dia de entrega configurado. Contate o administrador.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {allowedDays.map(day => (
                  <button
                    key={day}
                    data-testid={`button-day-${day}`}
                    onClick={() => handleDayClick(day)}
                    disabled={!activeWindow}
                    className="w-full flex items-center justify-between px-6 py-4 bg-primary/10 hover:bg-primary text-primary hover:text-white font-bold rounded-xl transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>{day}</span>
                    <ShoppingCart className="w-5 h-5 opacity-60 group-hover:opacity-100 transition-opacity" />
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
