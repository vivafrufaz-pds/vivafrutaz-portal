import { useState } from "react";
import { useOrders, useOrderDetail } from "@/hooks/use-ordering";
import { useCompanies } from "@/hooks/use-admin";
import { useProducts } from "@/hooks/use-catalog";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Modal } from "@/components/Modal";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Receipt, Search, ChevronDown, ChevronUp, MessageSquare, Package, FileText,
  XCircle, Edit3, AlertTriangle, CheckCircle, StickyNote, Save, Trash2
} from "lucide-react";
import { api } from "@shared/routes";

type Order = any;

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Ativo",
  CANCELLED: "Cancelado",
};

// ─── Admin Note Modal ─────────────────────────────────────────
function AdminNoteModal({
  order, onClose, onSave
}: { order: Order; onClose: () => void; onSave: (note: string) => Promise<void> }) {
  const [note, setNote] = useState(order.adminNote || "");
  const [saving, setSaving] = useState(false);
  return (
    <Modal isOpen onClose={onClose} title="Observação Administrativa" maxWidth="max-w-lg">
      <div className="space-y-4">
        <div className="p-3 bg-primary/5 rounded-xl border border-primary/20">
          <p className="text-sm font-bold text-primary">Pedido {order.orderCode || `#${order.id}`}</p>
        </div>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={5}
          placeholder="Ex: Produto enviado errado, aplicado desconto de 10%, aguardando reposição..."
          className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-primary outline-none resize-none"
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border-2 border-border rounded-xl font-bold text-muted-foreground hover:bg-muted transition-colors">
            Cancelar
          </button>
          <button
            onClick={async () => { setSaving(true); await onSave(note); onClose(); }}
            disabled={saving}
            className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar Observação"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Edit Items Modal ─────────────────────────────────────────
function EditItemsModal({
  order, products, onClose, onSave
}: { order: Order; products: any[]; onClose: () => void; onSave: (items: any[]) => Promise<void> }) {
  const { data: detail } = useOrderDetail(order.id);
  const [editItems, setEditItems] = useState<{ productId: number; quantity: number; unitPrice: number }[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);

  if (detail && !initialized) {
    setEditItems(detail.items.map((i: any) => ({
      productId: i.productId,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
    })));
    setInitialized(true);
  }

  const total = editItems.reduce((s, i) => s + (i.quantity * i.unitPrice), 0);

  const handleQtyChange = (idx: number, qty: number) => {
    setEditItems(prev => prev.map((item, i) => i === idx ? { ...item, quantity: Math.max(0, qty) } : item));
  };

  const handleRemove = (idx: number) => {
    setEditItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setSaving(true);
    const items = editItems
      .filter(i => i.quantity > 0)
      .map(i => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: String(i.unitPrice),
        totalPrice: String(i.quantity * i.unitPrice),
      }));
    await onSave(items);
    onClose();
  };

  return (
    <Modal isOpen onClose={onClose} title="Editar Itens do Pedido" maxWidth="max-w-2xl">
      <div className="space-y-4">
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-orange-800 font-medium">
            Alterações afetam quantidades e o total do pedido. Use para correções administrativas.
          </p>
        </div>

        {!initialized ? (
          <p className="text-center text-muted-foreground py-4">Carregando itens...</p>
        ) : (
          <div className="space-y-2">
            {editItems.map((item, idx) => {
              const product = products.find(p => p.id === Number(item.productId));
              return (
                <div key={idx} className="flex items-center gap-3 p-3 bg-muted/20 rounded-xl border border-border/50">
                  <div className="flex-1">
                    <p className="font-bold text-sm text-foreground">{product?.name || `Produto #${item.productId}`}</p>
                    <p className="text-xs text-muted-foreground">R$ {item.unitPrice.toFixed(2)} / {product?.unit}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min="0"
                      value={item.quantity}
                      onChange={e => handleQtyChange(idx, parseInt(e.target.value) || 0)}
                      className="w-20 text-center px-2 py-1.5 border-2 border-border rounded-lg font-bold outline-none focus:border-primary"
                    />
                    <span className="text-sm text-muted-foreground">{product?.unit}</span>
                    <p className="text-sm font-bold text-primary w-20 text-right">
                      R$ {(item.quantity * item.unitPrice).toFixed(2)}
                    </p>
                    <button onClick={() => handleRemove(idx)} className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="border-t border-border pt-4 flex justify-between items-center">
          <div>
            <p className="text-sm text-muted-foreground">Novo Total</p>
            <p className="text-2xl font-display font-bold text-primary">R$ {total.toFixed(2)}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2.5 border-2 border-border rounded-xl font-bold text-muted-foreground hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !initialized}
              className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Confirmar Alterações"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Cancel Confirmation Modal ─────────────────────────────────
function CancelModal({ order, onClose, onConfirm }: { order: Order; onClose: () => void; onConfirm: () => Promise<void> }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <Modal isOpen onClose={onClose} title="Cancelar Pedido" maxWidth="max-w-md">
      <div className="space-y-4">
        <div className="p-4 bg-red-50 rounded-xl border border-red-200 text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
          <p className="font-bold text-red-800">Tem certeza que deseja cancelar este pedido?</p>
          <p className="text-sm text-red-700 mt-1">{order.orderCode || `#${order.id}`}</p>
        </div>
        <p className="text-sm text-muted-foreground text-center">
          O pedido ficará marcado como cancelado e não será incluído nos relatórios de compras.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border-2 border-border rounded-xl font-bold text-muted-foreground hover:bg-muted transition-colors">
            Manter Pedido
          </button>
          <button
            onClick={async () => { setConfirming(true); await onConfirm(); onClose(); }}
            disabled={confirming}
            className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <XCircle className="w-4 h-4" /> {confirming ? "Cancelando..." : "Sim, Cancelar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Order Row ────────────────────────────────────────────────
function OrderRow({
  order, companyName, products, onNoteEdit, onEdit, onCancel, onRestore
}: {
  order: Order;
  companyName: string;
  products: any[];
  onNoteEdit: (order: Order) => void;
  onEdit: (order: Order) => void;
  onCancel: (order: Order) => void;
  onRestore: (order: Order) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { data: detail } = useOrderDetail(expanded ? order.id : undefined);
  const isCancelled = order.status === 'CANCELLED';

  return (
    <>
      <tr className={`transition-colors cursor-pointer ${isCancelled ? 'opacity-60 bg-red-50/30' : 'hover:bg-muted/10'}`}
        onClick={() => setExpanded(!expanded)}>
        <td className="px-5 py-4">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary flex-shrink-0" />
            <div>
              <p className="font-bold text-primary font-mono text-sm">{order.orderCode || `#${String(order.id).padStart(4,'0')}`}</p>
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${STATUS_BADGE[order.status] || STATUS_BADGE.ACTIVE}`}>
                {STATUS_LABEL[order.status] || order.status}
              </span>
            </div>
          </div>
        </td>
        <td className="px-5 py-4">
          <p className="font-bold text-sm text-foreground">{companyName}</p>
        </td>
        <td className="px-5 py-4">
          <div>
            <p className="text-sm font-medium text-foreground">{format(new Date(order.orderDate), "d MMM yyyy", { locale: ptBR })}</p>
            <p className="text-xs text-muted-foreground">{format(new Date(order.orderDate), "HH:mm")}</p>
          </div>
        </td>
        <td className="px-5 py-4">
          <span className="px-2.5 py-1 bg-orange-100 text-orange-800 rounded-lg text-xs font-bold">
            {format(new Date(order.deliveryDate), "EEE, d MMM", { locale: ptBR })}
          </span>
        </td>
        <td className="px-5 py-4">
          {order.orderNote ? (
            <span className="flex items-center gap-1 text-xs text-blue-600">
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="truncate max-w-[100px]">{order.orderNote}</span>
            </span>
          ) : <span className="text-muted-foreground text-sm">—</span>}
        </td>
        <td className="px-5 py-4">
          {order.adminNote ? (
            <span className="flex items-center gap-1 text-xs text-purple-600">
              <StickyNote className="w-3.5 h-3.5" />
              <span className="truncate max-w-[100px]">{order.adminNote}</span>
            </span>
          ) : <span className="text-muted-foreground text-sm">—</span>}
        </td>
        <td className="px-5 py-4 font-bold text-sm text-foreground">
          R$ {Number(order.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </td>
        <td className="px-5 py-4">
          {/* Action buttons */}
          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            {!isCancelled ? (
              <>
                <button
                  data-testid={`button-note-${order.id}`}
                  onClick={() => onNoteEdit(order)}
                  title="Obs. Admin"
                  className="p-1.5 text-muted-foreground hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                >
                  <StickyNote className="w-4 h-4" />
                </button>
                <button
                  data-testid={`button-edit-${order.id}`}
                  onClick={() => onEdit(order)}
                  title="Editar itens"
                  className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  data-testid={`button-cancel-${order.id}`}
                  onClick={() => onCancel(order)}
                  title="Cancelar"
                  className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                data-testid={`button-restore-${order.id}`}
                onClick={() => onRestore(order)}
                title="Restaurar"
                className="p-1.5 text-muted-foreground hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
            )}
            <button className="p-1.5 text-muted-foreground">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </td>
      </tr>

      {/* Expanded detail */}
      {expanded && (
        <tr>
          <td colSpan={8} className="px-5 py-0 bg-muted/10 border-b border-border/50">
            <div className="py-4 space-y-3">
              {order.orderNote && (
                <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <MessageSquare className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-0.5">Obs. do cliente</p>
                    <p className="text-sm text-blue-900">{order.orderNote}</p>
                  </div>
                </div>
              )}
              {order.adminNote && (
                <div className="flex items-start gap-2 p-3 bg-purple-50 rounded-xl border border-purple-100">
                  <StickyNote className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-0.5">Obs. Administrativa</p>
                    <p className="text-sm text-purple-900">{order.adminNote}</p>
                  </div>
                </div>
              )}
              {!detail ? (
                <p className="text-sm text-muted-foreground">Carregando itens...</p>
              ) : detail.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum item.</p>
              ) : (
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Package className="w-3.5 h-3.5" /> Itens
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {detail.items.map((item: any) => {
                      const product = products.find(p => p.id === Number(item.productId));
                      return (
                        <div key={item.id} className="bg-card rounded-xl p-3 border border-border/50 flex justify-between items-center">
                          <div>
                            <p className="font-bold text-sm text-foreground">{product?.name || `Produto #${item.productId}`}</p>
                            <p className="text-xs text-muted-foreground">{item.quantity} × R$ {Number(item.unitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          </div>
                          <p className="font-bold text-sm text-primary">R$ {Number(item.totalPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Main Page ─────────────────────────────────────────────────
export default function OrdersPage() {
  const { data: orders, isLoading } = useOrders();
  const { data: companies } = useCompanies();
  const { data: products } = useProducts();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [noteOrder, setNoteOrder] = useState<Order | null>(null);
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [cancelOrder, setCancelOrder] = useState<Order | null>(null);

  const filtered = orders?.filter(o => {
    const company = companies?.find(c => c.id === o.companyId);
    const code = (o as any).orderCode || '';
    const matchSearch = !search ||
      company?.companyName.toLowerCase().includes(search.toLowerCase()) ||
      code.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'ALL' || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const patchOrder = async (id: number, updates: any) => {
    const res = await fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to update order');
    queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
  };

  const saveNote = async (note: string) => {
    await patchOrder(noteOrder!.id, { adminNote: note });
    toast({ title: "Observação salva com sucesso!" });
  };

  const cancelOrderFn = async () => {
    await patchOrder(cancelOrder!.id, { status: 'CANCELLED' });
    toast({ title: "Pedido cancelado.", variant: "destructive" });
  };

  const restoreOrder = async (order: Order) => {
    await patchOrder(order.id, { status: 'ACTIVE' });
    toast({ title: "Pedido restaurado!" });
  };

  const saveItems = async (items: any[]) => {
    const res = await fetch(`/api/orders/${editOrder!.id}/items`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to update items');
    queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
    queryClient.invalidateQueries({ queryKey: [api.orders.get.path, editOrder!.id] });
    toast({ title: "Itens do pedido atualizados!" });
  };

  const counts = {
    all: orders?.length || 0,
    active: orders?.filter(o => o.status !== 'CANCELLED').length || 0,
    cancelled: orders?.filter(o => o.status === 'CANCELLED').length || 0,
  };

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Gestão de Pedidos</h1>
          <p className="text-muted-foreground mt-1">Altere, cancele e anote observações nos pedidos das empresas.</p>
        </div>
        <div className="flex gap-2">
          <div className="px-3 py-1.5 bg-green-100 text-green-700 rounded-xl text-sm font-bold">{counts.active} ativos</div>
          {counts.cancelled > 0 && <div className="px-3 py-1.5 bg-red-100 text-red-700 rounded-xl text-sm font-bold">{counts.cancelled} cancelados</div>}
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border/50 premium-shadow overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-border/50 flex flex-wrap gap-3 bg-muted/20">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              data-testid="input-search-orders"
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar empresa ou código VF-..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none text-sm"
            />
          </div>
          <div className="flex gap-2">
            {['ALL', 'ACTIVE', 'CANCELLED'].map(s => (
              <button key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                  filterStatus === s
                    ? 'bg-primary text-white border-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50'
                }`}>
                {s === 'ALL' ? 'Todos' : s === 'ACTIVE' ? 'Ativos' : 'Cancelados'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/30 border-b border-border/50 text-muted-foreground text-xs uppercase tracking-wider">
                <th className="px-5 py-4 font-semibold">Código</th>
                <th className="px-5 py-4 font-semibold">Empresa</th>
                <th className="px-5 py-4 font-semibold">Data</th>
                <th className="px-5 py-4 font-semibold">Entrega</th>
                <th className="px-5 py-4 font-semibold">Obs. Cliente</th>
                <th className="px-5 py-4 font-semibold">Obs. Admin</th>
                <th className="px-5 py-4 font-semibold">Total</th>
                <th className="px-5 py-4 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr><td colSpan={8} className="px-5 py-8 text-center text-muted-foreground">Carregando pedidos...</td></tr>
              ) : filtered?.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-8 text-center text-muted-foreground">Nenhum pedido encontrado</td></tr>
              ) : (
                filtered?.map(order => {
                  const company = companies?.find(c => c.id === order.companyId);
                  return (
                    <OrderRow
                      key={order.id}
                      order={order}
                      companyName={company?.companyName || 'Desconhecido'}
                      products={products || []}
                      onNoteEdit={setNoteOrder}
                      onEdit={setEditOrder}
                      onCancel={setCancelOrder}
                      onRestore={restoreOrder}
                    />
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {noteOrder && <AdminNoteModal order={noteOrder} onClose={() => setNoteOrder(null)} onSave={saveNote} />}
      {editOrder && <EditItemsModal order={editOrder} products={products || []} onClose={() => setEditOrder(null)} onSave={saveItems} />}
      {cancelOrder && <CancelModal order={cancelOrder} onClose={() => setCancelOrder(null)} onConfirm={cancelOrderFn} />}
    </Layout>
  );
}
