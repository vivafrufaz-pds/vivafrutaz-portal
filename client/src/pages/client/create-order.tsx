import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useActiveOrderWindow, useCreateOrder, useCompanyOrders, useOrderDetail } from "@/hooks/use-ordering";
import { useProducts } from "@/hooks/use-catalog";
import { Layout } from "@/components/Layout";
import { ShoppingCart, CheckCircle2, AlertCircle, RotateCcw } from "lucide-react";
import { useLocation } from "wouter";

const DAY_OPTIONS = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira"];

const DAY_EN_TO_NUM: Record<string, number> = {
  "Segunda-feira": 1,
  "Terça-feira": 2,
  "Quarta-feira": 3,
  "Quinta-feira": 4,
  "Sexta-feira": 5,
};

const DAY_NORMALIZE: Record<string, string> = {
  "Monday": "Segunda-feira",
  "Tuesday": "Terça-feira",
  "Wednesday": "Quarta-feira",
  "Thursday": "Quinta-feira",
  "Friday": "Sexta-feira",
};

function getNextDayDate(dayName: string, deliveryStart: Date, deliveryEnd: Date): string {
  const targetNum = DAY_EN_TO_NUM[dayName];
  if (!targetNum) return "";
  const d = new Date(deliveryStart);
  for (let i = 0; i <= 14; i++) {
    const test = new Date(d);
    test.setDate(d.getDate() + i);
    const jsDay = test.getDay();
    const isoDay = jsDay === 0 ? 7 : jsDay;
    if (isoDay === targetNum && test <= deliveryEnd) {
      return test.toISOString().split('T')[0];
    }
  }
  return "";
}

export default function CreateOrderPage() {
  const { company } = useAuth();
  const { data: activeWindow, isLoading: windowLoading } = useActiveOrderWindow();
  const { data: products } = useProducts();
  const createOrder = useCreateOrder();
  const { data: companyOrders } = useCompanyOrders(company?.id);
  const [, setLocation] = useLocation();

  const urlDay = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('day') || '';

  const [selectedDay, setSelectedDay] = useState<string>(urlDay);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [replicating, setReplicating] = useState(false);

  useEffect(() => {
    if (urlDay) setSelectedDay(urlDay);
  }, [urlDay]);

  // Auto-set delivery date based on selected day + active window
  const deliveryDate = useMemo(() => {
    if (!activeWindow || !selectedDay) return "";
    return getNextDayDate(selectedDay, new Date(activeWindow.deliveryStartDate), new Date(activeWindow.deliveryEndDate));
  }, [activeWindow, selectedDay]);

  const lastOrder = companyOrders?.[0];
  const lastOrderId = lastOrder?.id;

  const { data: lastOrderDetail } = useOrderDetail(lastOrderId);

  const getAllowedDays = (): string[] => {
    const days = company?.allowedOrderDays;
    if (!days) return [];
    if (Array.isArray(days)) return (days as any[]).map(d => DAY_NORMALIZE[String(d)] || String(d));
    return [];
  };

  const allowedDays = getAllowedDays();

  const availableProducts = useMemo(() => {
    if (!products || !company) return [];
    const adminFee = Number(company.adminFee || 0);
    return products
      .filter(p => p.active && p.basePrice)
      .map(product => {
        const base = Number(product.basePrice);
        const finalPrice = base * (1 + adminFee / 100);
        return {
          ...product,
          price: Math.round(finalPrice * 100) / 100,
        };
      });
  }, [products, company]);

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

  const handleReplicateLastOrder = () => {
    if (!lastOrderDetail?.items) return;
    setReplicating(true);
    const newCart: Record<number, number> = {};
    for (const item of lastOrderDetail.items) {
      newCart[Number(item.productId)] = item.quantity;
    }
    setCart(newCart);
    setTimeout(() => setReplicating(false), 600);
  };

  const handleSubmit = async () => {
    if (!activeWindow || !company || !deliveryDate) return;
    const items = Object.entries(cart).map(([productId, quantity]) => {
      const p = availableProducts.find(x => x.id === Number(productId));
      return {
        productId: Number(productId),
        quantity,
        unitPrice: String(p!.price!),
        totalPrice: String(p!.price! * quantity)
      };
    });

    await createOrder.mutateAsync({
      order: {
        companyId: company.id,
        deliveryDate: new Date(deliveryDate).toISOString(),
        weekReference: activeWindow.weekReference,
        totalValue: String(cartTotal),
        allowReplication: false
      },
      items
    });
    setLocation("/client/history");
  };

  if (windowLoading) return <Layout><div className="p-8 text-center text-muted-foreground">Carregando...</div></Layout>;

  if (!activeWindow) {
    return (
      <Layout>
        <div className="bg-card rounded-2xl p-12 text-center border border-border/50 premium-shadow max-w-2xl mx-auto mt-12">
          <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-3xl font-display font-bold text-foreground">Pedidos Encerrados</h2>
          <p className="text-muted-foreground mt-2 text-lg">Prazo de pedidos encerrado para esta semana. Volte em breve.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            {selectedDay ? `Pedido para entrega na ${selectedDay}` : "Novo Pedido"}
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">{activeWindow.weekReference}</p>
        </div>
        {lastOrderDetail && (
          <button
            data-testid="button-replicate-order"
            onClick={handleReplicateLastOrder}
            disabled={replicating}
            className="flex items-center gap-2 px-5 py-3 bg-secondary/10 hover:bg-secondary/20 text-secondary font-bold rounded-xl transition-all border-2 border-secondary/30 hover:border-secondary/50"
          >
            <RotateCcw className={`w-4 h-4 ${replicating ? 'animate-spin' : ''}`} />
            Replicar pedido da última semana
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Day selector */}
          <div className="bg-card rounded-2xl border border-border/50 premium-shadow p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">1. Selecione o Dia de Entrega</h2>
            <div className="flex flex-wrap gap-3">
              {allowedDays.filter(d => DAY_OPTIONS.includes(d)).map(day => (
                <button
                  key={day}
                  data-testid={`button-select-day-${day}`}
                  onClick={() => setSelectedDay(day)}
                  className={`px-5 py-2.5 rounded-xl font-bold text-sm border-2 transition-all ${
                    selectedDay === day 
                      ? 'bg-primary text-white border-primary shadow-lg shadow-primary/25' 
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
            {selectedDay && deliveryDate && (
              <p className="mt-3 text-sm text-primary font-semibold">
                ✓ Data de entrega: {new Date(deliveryDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            )}
            {selectedDay && !deliveryDate && (
              <p className="mt-3 text-sm text-red-500 font-semibold">
                ✗ Esse dia não está disponível na janela de entrega atual.
              </p>
            )}
          </div>

          {/* Products */}
          <div className="bg-card rounded-2xl border border-border/50 premium-shadow overflow-hidden">
            <div className="p-6 border-b border-border/50 bg-muted/20">
              <h2 className="text-lg font-bold text-foreground">2. Adicionar Produtos</h2>
            </div>
            {availableProducts.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Nenhum produto disponível no momento. Contate o administrador.
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {availableProducts.map(product => (
                  <div key={product.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/10 transition-colors">
                    <div>
                      <h3 className="font-bold text-lg text-foreground">{product.name}</h3>
                      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">{product.category}</p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="font-display font-bold text-xl text-primary">R$ {product.price?.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground font-semibold">por {product.unit}</p>
                      </div>
                      <div className="flex items-center gap-2 bg-background border-2 border-border rounded-xl p-1">
                        <button 
                          data-testid={`button-decrease-${product.id}`}
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
                          data-testid={`button-increase-${product.id}`}
                          onClick={() => handleUpdateCart(product.id, (cart[product.id] || 0) + 1)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 font-bold"
                        >+</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cart Summary */}
        <div className="lg:col-span-1">
          <div className="bg-card rounded-2xl border border-border/50 premium-shadow sticky top-8">
            <div className="p-6 border-b border-border/50 bg-primary text-primary-foreground rounded-t-2xl">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" /> Resumo do Pedido
              </h2>
            </div>
            <div className="p-6">
              {Object.keys(cart).length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Seu carrinho está vazio</p>
              ) : (
                <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                  {Object.entries(cart).map(([productId, qty]) => {
                    const p = availableProducts.find(x => x.id === Number(productId));
                    if (!p) return null;
                    return (
                      <div key={productId} className="flex justify-between items-center text-sm">
                        <div>
                          <p className="font-bold text-foreground">{p.name}</p>
                          <p className="text-muted-foreground">{qty} x R$ {p.price?.toFixed(2)}</p>
                        </div>
                        <p className="font-bold text-foreground">R$ {(p.price! * qty).toFixed(2)}</p>
                      </div>
                    );
                  })}
                </div>
              )}
              
              <div className="border-t border-border/50 mt-6 pt-6">
                <div className="flex justify-between items-center mb-6">
                  <p className="text-lg font-bold text-foreground">Total</p>
                  <p className="text-3xl font-display font-bold text-primary">R$ {cartTotal.toFixed(2)}</p>
                </div>
                <button 
                  data-testid="button-submit-order"
                  onClick={handleSubmit}
                  disabled={!selectedDay || !deliveryDate || cartTotal === 0 || createOrder.isPending}
                  className="w-full py-4 bg-secondary text-secondary-foreground font-bold text-lg rounded-xl shadow-lg shadow-secondary/25 hover:-translate-y-0.5 transition-transform disabled:opacity-50 disabled:transform-none flex justify-center items-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  {createOrder.isPending ? "Enviando..." : "Confirmar Pedido"}
                </button>
                {!selectedDay && (
                  <p className="text-red-500 text-sm font-medium mt-3 text-center">Selecione um dia de entrega primeiro.</p>
                )}
                {selectedDay && !deliveryDate && (
                  <p className="text-red-500 text-sm font-medium mt-3 text-center">Dia indisponível na janela de entrega.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
