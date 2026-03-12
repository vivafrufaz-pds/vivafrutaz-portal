import { useState } from "react";
import { useProducts, useCreateProduct, useUpdateProduct } from "@/hooks/use-catalog";
import { Layout } from "@/components/Layout";
import { Modal } from "@/components/Modal";
import { Plus, Package, Edit2, DollarSign, CheckCircle, XCircle } from "lucide-react";
import type { Product } from "@shared/schema";

const UNITS = [
  { value: "kg", label: "Quilograma (kg)" },
  { value: "caixa", label: "Caixa" },
  { value: "unidade", label: "Unidade" },
  { value: "pallet", label: "Pallet" },
  { value: "bandeja", label: "Bandeja" },
];

const emptyForm = {
  name: "",
  category: "",
  unit: "kg",
  active: true,
  basePrice: "",
};

function productToForm(p: Product): typeof emptyForm {
  return {
    name: p.name,
    category: p.category,
    unit: p.unit,
    active: p.active,
    basePrice: p.basePrice ? String(p.basePrice) : "",
  };
}

export default function ProductsPage() {
  const { data: products, isLoading } = useProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const openCreate = () => {
    setEditingProduct(null);
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData(productToForm(product));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const set = (field: string, value: any) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      name: formData.name,
      category: formData.category,
      unit: formData.unit,
      active: formData.active,
      basePrice: formData.basePrice ? String(formData.basePrice) : null,
    };

    if (editingProduct) {
      await updateProduct.mutateAsync({ id: editingProduct.id, data: payload });
    } else {
      await createProduct.mutateAsync(payload);
    }
    closeModal();
  };

  const isPending = createProduct.isPending || updateProduct.isPending;

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Catálogo de Produtos</h1>
          <p className="text-muted-foreground mt-1">Gerencie frutas, unidades e preços base internos.</p>
        </div>
        <button
          data-testid="button-add-product"
          onClick={openCreate}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"
        >
          <Plus className="w-5 h-5" /> Novo Produto
        </button>
      </div>

      {/* Products grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isLoading ? (
          <div className="col-span-full p-8 text-center text-muted-foreground">Carregando produtos...</div>
        ) : products?.length === 0 ? (
          <div className="col-span-full p-8 text-center text-muted-foreground">Nenhum produto cadastrado.</div>
        ) : products?.map(product => (
          <div key={product.id} className="bg-card rounded-2xl p-6 border border-border/50 premium-shadow flex flex-col items-center text-center group relative">
            {/* Edit button */}
            <button
              data-testid={`button-edit-product-${product.id}`}
              onClick={() => openEdit(product)}
              className="absolute top-3 right-3 p-2 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
            >
              <Edit2 className="w-4 h-4" />
            </button>

            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${product.active ? 'bg-secondary/10' : 'bg-muted'}`}>
              <Package className={`w-8 h-8 ${product.active ? 'text-secondary' : 'text-muted-foreground'}`} />
            </div>

            <h3 className="text-lg font-bold text-foreground">{product.name}</h3>
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mt-1">{product.category}</p>

            <div className="mt-3 inline-block px-3 py-1 bg-muted rounded-lg text-sm font-bold text-foreground">
              Por {product.unit}
            </div>

            {/* Base price badge */}
            {product.basePrice ? (
              <div className="mt-3 flex items-center gap-1.5 px-4 py-2 bg-primary/10 rounded-xl">
                <DollarSign className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-primary">
                  R$ {Number(product.basePrice).toFixed(2)} <span className="font-normal text-primary/70">(base)</span>
                </span>
              </div>
            ) : (
              <div className="mt-3 px-4 py-2 bg-orange-50 rounded-xl border border-orange-200">
                <p className="text-xs font-bold text-orange-600">Preço base não definido</p>
              </div>
            )}

            <span className={`mt-3 text-xs font-bold px-2 py-0.5 rounded-full ${product.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {product.active ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        ))}
      </div>

      {/* Modal Create / Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingProduct ? `Editar: ${editingProduct.name}` : "Novo Produto"}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold mb-1">Nome do Produto *</label>
            <input required value={formData.name} onChange={e => set("name", e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none"
              placeholder="ex: Banana Nanica" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Categoria *</label>
              <input required value={formData.category} onChange={e => set("category", e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none"
                placeholder="ex: Frutas" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Unidade *</label>
              <select value={formData.unit} onChange={e => set("unit", e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none">
                {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
          </div>

          {/* Base Price — internal only */}
          <div className="p-4 rounded-xl border-2 border-primary/20 bg-primary/5">
            <label className="flex items-center gap-2 text-sm font-bold text-primary mb-2">
              <DollarSign className="w-4 h-4" />
              Preço Base Interno (R$)
            </label>
            <input
              type="number" step="0.01" min="0"
              value={formData.basePrice}
              onChange={e => set("basePrice", e.target.value)}
              placeholder="0,00"
              className="w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none text-lg font-bold"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Preço interno da VivaFrutaz. O preço final ao cliente = preço base × (1 + taxa administrativa / 100).
            </p>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-semibold mb-2">Status</label>
            <div className="flex gap-3">
              <button type="button" onClick={() => set("active", true)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm border-2 transition-all ${formData.active ? 'bg-green-600 text-white border-green-600' : 'border-border text-muted-foreground hover:border-green-400'}`}>
                <CheckCircle className="w-4 h-4" /> Ativo
              </button>
              <button type="button" onClick={() => set("active", false)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm border-2 transition-all ${!formData.active ? 'bg-red-600 text-white border-red-600' : 'border-border text-muted-foreground hover:border-red-400'}`}>
                <XCircle className="w-4 h-4" /> Inativo
              </button>
            </div>
          </div>

          <button type="submit" disabled={isPending}
            className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow-lg hover:-translate-y-0.5 transition-transform disabled:opacity-50">
            {isPending ? "Salvando..." : editingProduct ? "Salvar Alterações" : "Adicionar Produto"}
          </button>
        </form>
      </Modal>
    </Layout>
  );
}
