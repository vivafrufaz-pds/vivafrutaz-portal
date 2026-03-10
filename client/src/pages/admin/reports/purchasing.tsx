import { usePurchasingReport } from "@/hooks/use-ordering";
import { Layout } from "@/components/Layout";
import { BarChart3, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PurchasingReportPage() {
  const { data: report, isLoading } = usePurchasingReport();
  const { toast } = useToast();

  const handleExport = () => {
    toast({ title: "Export Started", description: "Your PDF is downloading (Mock feature)" });
  };

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Purchasing Report</h1>
          <p className="text-muted-foreground mt-1">Aggregated product quantities needed for procurement.</p>
        </div>
        <button 
          onClick={handleExport}
          className="flex items-center gap-2 px-6 py-3 bg-card border-2 border-border text-foreground font-bold rounded-xl hover:border-primary hover:text-primary transition-all"
        >
          <Download className="w-5 h-5" /> Export PDF
        </button>
      </div>

      <div className="bg-card rounded-2xl border border-border/50 premium-shadow overflow-hidden">
        <div className="p-6 border-b border-border/50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <BarChart3 className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Aggregate Demands</h2>
        </div>
        
        <table className="w-full text-left">
          <thead>
            <tr className="bg-muted/30 text-muted-foreground text-sm uppercase tracking-wider">
              <th className="px-6 py-4 font-semibold">Product Name</th>
              <th className="px-6 py-4 font-semibold text-right">Total Quantity Needed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {isLoading ? (
              <tr><td colSpan={2} className="px-6 py-8 text-center text-muted-foreground">Generating report...</td></tr>
            ) : report?.length === 0 ? (
              <tr><td colSpan={2} className="px-6 py-8 text-center text-muted-foreground">No active demands</td></tr>
            ) : (
              report?.map((row, i) => (
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
    </Layout>
  );
}
