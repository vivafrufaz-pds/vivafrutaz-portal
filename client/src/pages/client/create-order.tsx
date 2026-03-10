import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useActiveOrderWindow, useCreateOrder } from "@/hooks/use-ordering";
import { useProducts, useProductPrices } from "@/hooks/use-catalog";
import { Layout } from "@/components/Layout";
import { ShoppingCart, CheckCircle2, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";

export default function CreateOrderPage() {
  const { company } = useAuth();
  const { data: window, isLoading: windowLoading } = useActiveOrderWindow();
  const { data: products } = useProducts();
  const { data: prices } = useProductPrices();
  const createOrder = useCreateOrder();
  const [, setLocation] = useLocation();

  const [deliveryDate, setDeliveryDate] = useState("");
  const [cart, setCart] = useState<Record<number, number>>({});

  // Get custom pricing for this company
  const availableProducts = useMemo(() => {
    if (!products || !prices || !company) return [];
    return products.map(product => {
      const priceRecord = prices.find(p => p.productId === product.id && p.priceGroupId === company.priceGroupId);
      return {
        ...product,
        price: priceRecord ? Number(priceRecord.price) : null
      };
    }).filter(p => p.price !== null && p.active); // Only show products with assigned prices
  }, [products, prices, company]);

  const cartTotal = useMemo(() => {
    return Object.entries(cart).reduce((total, [productId, quantity]) => {
      const p = availableProducts.find(x => x.id === Number(productId));
      if (!p || !p.price) return total;
      return total + (p.price * quantity);
    }, 0);
  }, [cart, availableProducts]);

  const handleUpdateCart = (productId: number, qty: number) => {
    setCart(prev => {
      const next = { ...prev };
      if (qty <= 0) delete next[productId];
      else next[productId] = qty;
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!window || !company) return;
    const items = Object.entries(cart).map(([productId, quantity]) => {
      const p = availableProducts.find(x => x.id === Number(productId));
      return {
        productId: Number(productId),
        quantity,
        unitPrice: p!.price!,
        totalPrice: p!.price! * quantity
      };
    });

    await createOrder.mutateAsync({
      order: {
        companyId: company.id,
        deliveryDate: new Date(deliveryDate).toISOString(),
        weekReference: window.weekReference,
        totalValue: cartTotal,
        allowReplication: false
      },
      items
    });
    setLocation("/client/history");
  };

  if (windowLoading) return <Layout><div className="p-8">Loading...</div></Layout>;

  if (!window) {
    return (
      <Layout>
        <div className="bg-card rounded-2xl p-12 text-center border border-border/50 premium-shadow max-w-2xl mx-auto mt-12">
          <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-3xl font-display font-bold text-foreground">Orders Closed</h2>
          <p className="text-muted-foreground mt-2 text-lg">There is no active order window right now. Please check back later.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Create Order</h1>
        <p className="text-muted-foreground mt-1 text-lg">Week {window.weekReference}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Product List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-2xl border border-border/50 premium-shadow p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">1. Select Delivery Date</h2>
            <input 
              type="date" 
              required
              value={deliveryDate}
              onChange={e => setDeliveryDate(e.target.value)}
              className="w-full max-w-md px-4 py-3 rounded-xl border-2 border-border focus:border-primary outline-none font-medium" 
              min={new Date(window.deliveryStartDate).toISOString().split('T')[0]}
              max={new Date(window.deliveryEndDate).toISOString().split('T')[0]}
            />
            <p className="text-sm text-muted-foreground mt-2">Must be on your allowed days: {company?.allowedOrderDays.join(', ')}</p>
          </div>

          <div className="bg-card rounded-2xl border border-border/50 premium-shadow overflow-hidden">
            <div className="p-6 border-b border-border/50 bg-muted/20">
              <h2 className="text-xl font-bold text-foreground">2. Add Products</h2>
            </div>
            <div className="divide-y divide-border/50">
              {availableProducts.map(product => (
                <div key={product.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/10 transition-colors">
                  <div>
                    <h3 className="font-bold text-lg text-foreground">{product.name}</h3>
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">{product.category}</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="font-display font-bold text-xl text-primary">${product.price?.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground font-semibold">per {product.unit}</p>
                    </div>
                    <div className="flex items-center gap-2 bg-background border-2 border-border rounded-xl p-1">
                      <button 
                        onClick={() => handleUpdateCart(product.id, (cart[product.id] || 0) - 1)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-foreground font-bold"
                      >-</button>
                      <input 
                        type="number"
                        value={cart[product.id] || ''}
                        onChange={(e) => handleUpdateCart(product.id, parseInt(e.target.value) || 0)}
                        className="w-12 text-center font-bold bg-transparent outline-none"
                        placeholder="0"
                      />
                      <button 
                        onClick={() => handleUpdateCart(product.id, (cart[product.id] || 0) + 1)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 font-bold"
                      >+</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cart Summary */}
        <div className="lg:col-span-1">
          <div className="bg-card rounded-2xl border border-border/50 premium-shadow sticky top-8">
            <div className="p-6 border-b border-border/50 bg-primary text-primary-foreground rounded-t-2xl">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" /> Order Summary
              </h2>
            </div>
            <div className="p-6">
              {Object.keys(cart).length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Your cart is empty</p>
              ) : (
                <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                  {Object.entries(cart).map(([productId, qty]) => {
                    const p = availableProducts.find(x => x.id === Number(productId));
                    if (!p) return null;
                    return (
                      <div key={productId} className="flex justify-between items-center text-sm">
                        <div>
                          <p className="font-bold text-foreground">{p.name}</p>
                          <p className="text-muted-foreground">{qty} x ${p.price?.toFixed(2)}</p>
                        </div>
                        <p className="font-bold text-foreground">${(p.price! * qty).toFixed(2)}</p>
                      </div>
                    );
                  })}
                </div>
              )}
              
              <div className="border-t border-border/50 mt-6 pt-6">
                <div className="flex justify-between items-center mb-6">
                  <p className="text-lg font-bold text-foreground">Total</p>
                  <p className="text-3xl font-display font-bold text-primary">${cartTotal.toFixed(2)}</p>
                </div>
                <button 
                  onClick={handleSubmit}
                  disabled={!deliveryDate || cartTotal === 0 || createOrder.isPending}
                  className="w-full py-4 bg-secondary text-secondary-foreground font-bold text-lg rounded-xl shadow-lg shadow-secondary/25 hover:-translate-y-0.5 transition-transform disabled:opacity-50 disabled:transform-none flex justify-center items-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  {createOrder.isPending ? "Submitting..." : "Submit Order"}
                </button>
                {!deliveryDate && cartTotal > 0 && (
                  <p className="text-red-500 text-sm font-medium mt-3 text-center">Please select a delivery date first.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
