import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Truck, RefreshCw, AlertTriangle, Calendar, CheckCircle, XCircle, BarChart3 } from 'lucide-react';

interface DeliveryDay {
  date: string;
  count: number;
  totalValue: number;
  companies: string[];
}

interface RouteCapacity {
  routeId: number;
  routeName: string;
  status: string;
  hasVehicle: boolean;
  hasDriver: boolean;
}

interface LogisticsData {
  activeRoutes: number;
  totalRoutes: number;
  unassignedRoutes: number;
  deliverySchedule: DeliveryDay[];
  overloadedDays: DeliveryDay[];
  busiestDay: DeliveryDay | null;
  routeCapacity: RouteCapacity[];
  activeWindow: { weekReference: string } | null;
  totalActiveDeliveries: number;
  generatedAt: string;
}

const OVERLOAD_THRESHOLD = 5;

export default function AdminLogisticsIntelligence() {
  const { data, isLoading, refetch, isFetching } = useQuery<LogisticsData>({
    queryKey: ['/api/logistics-intelligence'],
    refetchInterval: 5 * 60 * 1000,
  });

  const schedule = data?.deliverySchedule || [];
  const maxCount = schedule.length > 0 ? Math.max(...schedule.map(d => d.count), 1) : 1;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Truck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Inteligência Logística</h1>
            <p className="text-sm text-muted-foreground">Agenda de entregas, rotas e capacidade de distribuição</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {data?.generatedAt && (
            <span className="text-xs text-muted-foreground">
              Atualizado às {new Date(data.generatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} data-testid="button-refresh-logistics" className="gap-2">
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-muted-foreground">
          <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin opacity-40" />
          <p>Analisando agenda logística...</p>
        </div>
      ) : data ? (
        <>
          {/* Overload Alerts */}
          {data.overloadedDays.length > 0 && (
            <div className="space-y-2">
              {data.overloadedDays.map(day => (
                <div key={day.date} className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-red-800 dark:text-red-400">Sobrecarga detectada: {day.date}</p>
                    <p className="text-sm text-red-700 dark:text-red-500 mt-0.5">
                      {day.count} entregas agendadas neste dia (limite recomendado: {OVERLOAD_THRESHOLD}).
                      Considere redistribuir entregas para reduzir risco de atrasos.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {data.unassignedRoutes > 0 && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-orange-800 dark:text-orange-400">Rotas sem configuração completa</p>
                <p className="text-sm text-orange-700 dark:text-orange-500 mt-0.5">
                  {data.unassignedRoutes} rota(s) sem motorista ou veículo atribuído. Configure antes da entrega.
                </p>
              </div>
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-card border rounded-2xl p-4 text-center" data-testid="card-active-routes">
              <p className="text-3xl font-bold text-primary">{data.activeRoutes}</p>
              <p className="text-xs text-muted-foreground mt-1">Rotas Ativas</p>
            </div>
            <div className="bg-card border rounded-2xl p-4 text-center" data-testid="card-total-deliveries">
              <p className="text-3xl font-bold text-foreground">{data.totalActiveDeliveries}</p>
              <p className="text-xs text-muted-foreground mt-1">Entregas Ativas</p>
            </div>
            <div className={`border rounded-2xl p-4 text-center ${data.unassignedRoutes > 0 ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200' : 'bg-card'}`} data-testid="card-unassigned-routes">
              <p className={`text-3xl font-bold ${data.unassignedRoutes > 0 ? 'text-orange-500' : 'text-green-500'}`}>{data.unassignedRoutes}</p>
              <p className="text-xs text-muted-foreground mt-1">Rotas Incompletas</p>
            </div>
            <div className={`border rounded-2xl p-4 text-center ${data.overloadedDays.length > 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-200' : 'bg-card'}`} data-testid="card-overloaded-days">
              <p className={`text-3xl font-bold ${data.overloadedDays.length > 0 ? 'text-destructive' : 'text-green-500'}`}>{data.overloadedDays.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Dias Sobrecarregados</p>
            </div>
          </div>

          {/* Delivery Schedule Chart */}
          {schedule.length > 0 && (
            <section className="bg-card border rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-foreground">Agenda de Entregas</h2>
                {data.activeWindow && <Badge variant="secondary" className="ml-1">{data.activeWindow.weekReference}</Badge>}
              </div>
              <div className="flex items-end gap-3 h-28">
                {schedule.slice(0, 7).map((day, i) => {
                  const heightPct = Math.max((day.count / maxCount) * 100, 4);
                  const isOverload = day.count >= OVERLOAD_THRESHOLD;
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs text-muted-foreground">{day.count}</span>
                      <div
                        className={`w-full rounded-t-lg ${isOverload ? 'bg-red-500' : 'bg-primary'}`}
                        style={{ height: `${heightPct}%` }}
                        data-testid={`bar-day-${i}`}
                        title={`${day.date}: ${day.count} entrega(s)`}
                      />
                      <span className="text-xs text-muted-foreground text-center leading-tight">{day.date.slice(0, 5)}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">🔴 Vermelho = sobrecarga ({OVERLOAD_THRESHOLD}+ entregas)</p>
            </section>
          )}

          {/* Delivery Schedule Table */}
          {schedule.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Detalhe por Dia
              </h2>
              <div className="bg-card border rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Data</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Entregas</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase hidden sm:table-cell">Valor Total</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase hidden md:table-cell">Empresas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.map((day, i) => (
                      <tr key={day.date} data-testid={`row-delivery-${i}`} className={`border-t border-border/50 ${day.count >= OVERLOAD_THRESHOLD ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                        <td className="px-4 py-3 font-medium text-foreground">{day.date}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={day.count >= OVERLOAD_THRESHOLD ? 'destructive' : 'secondary'}>
                            {day.count} {day.count >= OVERLOAD_THRESHOLD ? '⚠️' : ''}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell">
                          R$ {day.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                          {day.companies.slice(0, 3).join(', ')}{day.companies.length > 3 ? ` +${day.companies.length - 3}` : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Route Status */}
          {data.routeCapacity.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-bold text-foreground flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary" />
                Status das Rotas
              </h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {data.routeCapacity.map(route => (
                  <div key={route.routeId} data-testid={`card-route-${route.routeId}`} className="bg-card border rounded-xl p-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{route.routeName}</p>
                      <p className="text-xs text-muted-foreground">{route.status}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex items-center gap-1 text-xs">
                        {route.hasVehicle ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <XCircle className="w-3.5 h-3.5 text-red-400" />}
                        <span className="text-muted-foreground">Veículo</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        {route.hasDriver ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <XCircle className="w-3.5 h-3.5 text-red-400" />}
                        <span className="text-muted-foreground">Motorista</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {schedule.length === 0 && data.routeCapacity.length === 0 && (
            <div className="text-center py-12 space-y-2">
              <Truck className="w-12 h-12 mx-auto text-muted-foreground/30" />
              <p className="text-muted-foreground">Nenhuma entrega agendada no momento.</p>
            </div>
          )}

          {/* Flora tip */}
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex gap-3">
            <Truck className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-sm text-foreground/80">
              <strong>Flora IA:</strong> Pergunte — "Flora, como está a logística hoje", "Flora, quantas entregas temos", "Flora, analisar logística" para análise instantânea.
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-muted-foreground">Não foi possível carregar os dados logísticos.</div>
      )}
    </div>
  );
}
