import { useOrders } from "@/hooks/use-ordering";
import { useCompanies } from "@/hooks/use-admin";
import { Layout } from "@/components/Layout";
import { format } from "date-fns";
import { Receipt, Search } from "lucide-react";

export default function OrdersPage() {
  const { data: orders, isLoading } = useOrders();
  const { data: companies } = useCompanies();

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">All Orders</h1>
          <p className="text-muted-foreground mt-1">Review all client orders and delivery schedules.</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border/50 premium-shadow overflow-hidden">
        <div className="p-4 border-b border-border/50 flex gap-4 bg-muted/20">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input 
              placeholder="Search orders..." 
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/30 text-muted-foreground text-sm uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Order ID</th>
                <th className="px-6 py-4 font-semibold">Company</th>
                <th className="px-6 py-4 font-semibold">Order Date</th>
                <th className="px-6 py-4 font-semibold">Delivery Date</th>
                <th className="px-6 py-4 font-semibold">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Loading orders...</td></tr>
              ) : orders?.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No orders yet</td></tr>
              ) : (
                orders?.map(order => {
                  const company = companies?.find(c => c.id === order.companyId);
                  return (
                    <tr key={order.id} className="hover:bg-muted/10 transition-colors cursor-pointer">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 font-bold text-primary">
                          <Receipt className="w-4 h-4" /> #{order.id.toString().padStart(4, '0')}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-foreground">{company?.companyName || 'Unknown'}</td>
                      <td className="px-6 py-4 text-muted-foreground font-medium">{format(new Date(order.orderDate), 'MMM d, yyyy')}</td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-lg text-sm font-bold">
                          {format(new Date(order.deliveryDate), 'MMM d, yyyy')}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-foreground">${Number(order.totalValue).toFixed(2)}</td>
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
