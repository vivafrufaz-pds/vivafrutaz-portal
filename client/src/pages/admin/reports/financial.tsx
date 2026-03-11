import { useFinancialReport } from "@/hooks/use-ordering";
import { Layout } from "@/components/Layout";
import { PieChart, TrendingUp, Award, Building2 } from "lucide-react";

export default function FinancialReportPage() {
  const { data: report, isLoading } = useFinancialReport();

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Painel Financeiro</h1>
          <p className="text-muted-foreground mt-1">Métricas de receita e melhores desempenhos.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center p-8 text-muted-foreground font-medium">Carregando dados financeiros...</div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card rounded-2xl p-8 border border-border/50 premium-shadow flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-green-500/10 text-green-600 flex items-center justify-center">
                <TrendingUp className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Receita Semanal</p>
                <p className="text-4xl font-display font-bold text-foreground mt-1">
                  R$ {report?.weeklyRevenue?.toFixed(2) || '0,00'}
                </p>
              </div>
            </div>
            <div className="bg-card rounded-2xl p-8 border border-border/50 premium-shadow flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <TrendingUp className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Receita Mensal</p>
                <p className="text-4xl font-display font-bold text-foreground mt-1">
                  R$ {report?.monthlyRevenue?.toFixed(2) || '0,00'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-card rounded-2xl border border-border/50 premium-shadow overflow-hidden">
              <div className="p-6 border-b border-border/50 bg-muted/20 flex items-center gap-3">
                <Award className="w-5 h-5 text-secondary" />
                <h3 className="text-lg font-bold text-foreground">Maiores Clientes</h3>
              </div>
              <ul className="divide-y divide-border/50">
                {report?.topCompanies?.map((c, i) => (
                  <li key={i} className="p-4 flex items-center justify-between hover:bg-muted/10 transition-colors">
                    <span className="font-bold text-foreground flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">{i+1}</span>
                      {c.companyName}
                    </span>
                    <span className="font-bold text-primary">R$ {c.totalSpent.toFixed(2)}</span>
                  </li>
                ))}
                {(!report?.topCompanies || report.topCompanies.length === 0) && (
                  <li className="p-8 text-center text-muted-foreground">Sem dados suficientes</li>
                )}
              </ul>
            </div>

            <div className="bg-card rounded-2xl border border-border/50 premium-shadow overflow-hidden">
              <div className="p-6 border-b border-border/50 bg-muted/20 flex items-center gap-3">
                <PieChart className="w-5 h-5 text-secondary" />
                <h3 className="text-lg font-bold text-foreground">Frutas Mais Vendidas</h3>
              </div>
              <ul className="divide-y divide-border/50">
                {report?.topSellingFruits?.map((f, i) => (
                  <li key={i} className="p-4 flex items-center justify-between hover:bg-muted/10 transition-colors">
                    <span className="font-bold text-foreground flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">{i+1}</span>
                      {f.productName}
                    </span>
                    <span className="font-bold text-primary">{f.totalSold} un</span>
                  </li>
                ))}
                {(!report?.topSellingFruits || report.topSellingFruits.length === 0) && (
                  <li className="p-8 text-center text-muted-foreground">Sem dados suficientes</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
