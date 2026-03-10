import { useAuth } from "@/hooks/use-auth";
import { useCompanyOrders } from "@/hooks/use-ordering";
import { Layout } from "@/components/Layout";
import { format } from "date-fns";
import { Receipt, Calendar, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function OrderHistoryPage() {
  const { company } = useAuth();
  const { data: orders, isLoading } = useCompanyOrders(company?.id);

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Order History</h1>
          <p className="text-muted-foreground mt-1">Review your past deliveries and invoices.</p>
        </div>
        <Link href="/client/order" className="px-6 py-3 bg-primary/10 text-primary font-bold rounded-xl hover:bg-primary/20 transition-colors">
          New Order
        </Link>
      </div>

      <div className="grid gap-6">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading history...</div>
        ) : orders?.length === 0 ? (
          <div className="bg-card rounded-2xl p-12 text-center border border-border/50">
            <Receipt className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-foreground">No Orders Yet</h3>
            <p className="text-muted-foreground mt-2">You haven't placed any orders with us.</p>
          </div>
        ) : (
          orders?.sort((a,b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()).map(order => (
            <div key={order.id} className="bg-card rounded-2xl border border-border/50 premium-shadow p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center font-display font-bold text-xl">
                  #{order.id.toString().padStart(4, '0')}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Total: ${Number(order.totalValue).toFixed(2)}</h3>
                  <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground mt-2">
                    <span className="flex items-center gap-1"><Calendar className="w-4 h-4"/> Ordered: {format(new Date(order.orderDate), 'MMM d, yyyy')}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 w-full md:w-auto">
                <div className="bg-muted px-4 py-2 rounded-xl flex-1 md:flex-none">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Delivery Date</p>
                  <p className="font-bold text-foreground">{format(new Date(order.deliveryDate), 'EEEE, MMM d')}</p>
                </div>
                <button className="p-3 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-white transition-all group">
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </Layout>
  );
}
