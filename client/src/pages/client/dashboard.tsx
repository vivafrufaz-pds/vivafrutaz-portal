import { useAuth } from "@/hooks/use-auth";
import { useActiveOrderWindow } from "@/hooks/use-ordering";
import { Layout } from "@/components/Layout";
import { Link } from "wouter";
import { ShoppingCart, CalendarDays, ArrowRight } from "lucide-react";
import { format } from "date-fns";

export default function ClientDashboard() {
  const { company } = useAuth();
  const { data: window } = useActiveOrderWindow();

  return (
    <Layout>
      <div className="space-y-8">
        <div className="bg-gradient-to-r from-primary to-primary/80 rounded-3xl p-8 sm:p-12 text-primary-foreground shadow-xl shadow-primary/20 relative overflow-hidden">
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-[-10%] left-[10%] w-48 h-48 bg-black/10 rounded-full blur-2xl" />
          
          <div className="relative z-10 max-w-2xl">
            <h1 className="text-4xl sm:text-5xl font-display font-extrabold tracking-tight">
              Hello, {company?.contactName}!
            </h1>
            <p className="mt-4 text-lg sm:text-xl text-primary-foreground/90 font-medium">
              Welcome to your {company?.companyName} portal. Let's restock your fresh supply.
            </p>
            
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link href="/client/order" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-primary font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all">
                <ShoppingCart className="w-5 h-5" /> Start New Order
              </Link>
              <Link href="/client/history" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary-foreground/10 hover:bg-primary-foreground/20 text-white font-bold rounded-xl transition-all">
                View History <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card rounded-2xl p-8 border border-border/50 premium-shadow">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
                <CalendarDays className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Current Status</h2>
            </div>
            
            {window ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-green-50 border border-green-200">
                  <p className="text-green-800 font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Orders are OPEN for Week {window.weekReference}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Order Deadline:</p>
                  <p className="text-lg font-bold text-foreground">{format(new Date(window.orderCloseDate), 'EEEE, MMM d at h:mm a')}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Delivery Window:</p>
                  <p className="text-lg font-bold text-foreground">{format(new Date(window.deliveryStartDate), 'MMM d')} - {format(new Date(window.deliveryEndDate), 'MMM d')}</p>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-muted/50 border border-border/50 text-center">
                <p className="font-bold text-muted-foreground text-lg">Orders are currently closed.</p>
                <p className="text-sm text-muted-foreground mt-2">We will notify you when the next window opens.</p>
              </div>
            )}
          </div>

          <div className="bg-card rounded-2xl p-8 border border-border/50 premium-shadow">
            <h2 className="text-xl font-bold text-foreground mb-4">Your Delivery Days</h2>
            <div className="flex flex-wrap gap-2">
              {company?.allowedOrderDays.map(day => (
                <span key={day} className="px-4 py-2 bg-primary/10 text-primary font-bold rounded-lg">
                  {day}
                </span>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-6 leading-relaxed">
              These are your approved delivery days. When placing an order, you can select any of these days that fall within the active delivery window.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
