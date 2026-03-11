import { useState, useMemo } from "react";
import { usePurchasingReport } from "@/hooks/use-ordering";
import { useCompanies } from "@/hooks/use-admin";
import { useProducts } from "@/hooks/use-catalog";
import { Layout } from "@/components/Layout";
import { BarChart3, Download, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PurchasingReportPage() {
  const { data: report, isLoading } = usePurchasingReport();
  const { data: companies } = useCompanies();
  const { data: products } = useProducts();
  const { toast } = useToast();

  const [filterCompany, setFilterCompany] = useState("");
  const [filterProduct, setFilterProduct] = useState("");
  const [filterWeek, setFilterWeek] = useState("");

  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2];

  const filtered = useMemo(() => {
    if (!report) return [];
    return report.filter(row => {
      if (filterProduct && String(row.productId) !== filterProduct) return false;
      return true;
    });
  }, [report, filterProduct]);

  const handleExportExcel = () => {
    toast({ title: "Exportar Excel", description: "Funcionalidade de exportação iniciada." });
  };

  const handleExportPDF = () => {
    toast({ title: "Exportar PDF", description: "Gerando PDF do relatório..." });
  };

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Relatório de Compras</h1>
          <p className="text-muted-foreground mt-1">Quantidades agregadas de produtos para abastecimento.</p>
        </div>
        <div className="flex gap-3">
          <button 
            data-testid="button-export-excel"
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-5 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors shadow-lg"
          >
            <Download className="w-4 h-4" /> Exportar Excel
          </button>
          <button 
            data-testid="button-export-pdf"
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-5 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg"
          >
            <Download className="w-4 h-4" /> Exportar PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-2xl border border-border/50 premium-shadow p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-foreground">Filtros</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase">Empresa</label>
            <select 
              data-testid="filter-company"
              value={filterCompany} 
              onChange={e => setFilterCompany(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border-2 border-border focus:border-primary outline-none text-sm"
            >
              <option value="">Todas</option>
              {companies?.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase">Produto</label>
            <select 
              data-testid="filter-product"
              value={filterProduct} 
              onChange={e => setFilterProduct(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border-2 border-border focus:border-primary outline-none text-sm"
            >
              <option value="">Todos</option>
              {products?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase">Semana</label>
            <input 
              data-testid="filter-week"
              type="text"
              value={filterWeek}
              onChange={e => setFilterWeek(e.target.value)}
              placeholder="ex: Semana 42"
              className="w-full px-3 py-2 rounded-xl border-2 border-border focus:border-primary outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase">Mês</label>
            <select 
              data-testid="filter-month"
              className="w-full px-3 py-2 rounded-xl border-2 border-border focus:border-primary outline-none text-sm"
            >
              <option value="">Todos</option>
              {months.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase">Ano</label>
            <select 
              data-testid="filter-year"
              className="w-full px-3 py-2 rounded-xl border-2 border-border focus:border-primary outline-none text-sm"
            >
              <option value="">Todos</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Report Table */}
      <div className="bg-card rounded-2xl border border-border/50 premium-shadow overflow-hidden">
        <div className="p-6 border-b border-border/50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <BarChart3 className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Demanda Total por Produto</h2>
        </div>
        
        <table className="w-full text-left">
          <thead>
            <tr className="bg-muted/30 text-muted-foreground text-sm uppercase tracking-wider">
              <th className="px-6 py-4 font-semibold">Produto</th>
              <th className="px-6 py-4 font-semibold text-right">Quantidade Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {isLoading ? (
              <tr><td colSpan={2} className="px-6 py-8 text-center text-muted-foreground">Gerando relatório...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={2} className="px-6 py-8 text-center text-muted-foreground">Sem dados para os filtros selecionados</td></tr>
            ) : (
              filtered.map((row, i) => (
                <tr key={i} className="hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-4 font-bold text-foreground text-lg">{row.productName}</td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-2xl font-display font-bold text-primary mr-2">{row.totalQuantity}</span>
                    <span className="text-muted-foreground font-medium uppercase tracking-widest text-sm">{row.unit}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary cards */}
      {filtered.length > 0 && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card rounded-2xl p-6 border border-border/50 premium-shadow text-center">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Total por Semana</p>
            <p className="text-3xl font-bold text-primary">{filtered.reduce((a, r) => a + r.totalQuantity, 0)}</p>
            <p className="text-sm text-muted-foreground mt-1">unidades</p>
          </div>
          <div className="bg-card rounded-2xl p-6 border border-border/50 premium-shadow text-center">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Produtos Diferentes</p>
            <p className="text-3xl font-bold text-secondary">{filtered.length}</p>
            <p className="text-sm text-muted-foreground mt-1">produtos</p>
          </div>
          <div className="bg-card rounded-2xl p-6 border border-border/50 premium-shadow text-center">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Maior Demanda</p>
            <p className="text-xl font-bold text-foreground">{filtered.sort((a,b) => b.totalQuantity - a.totalQuantity)[0]?.productName}</p>
            <p className="text-sm text-muted-foreground mt-1">{filtered.sort((a,b) => b.totalQuantity - a.totalQuantity)[0]?.totalQuantity} unidades</p>
          </div>
        </div>
      )}
    </Layout>
  );
}
