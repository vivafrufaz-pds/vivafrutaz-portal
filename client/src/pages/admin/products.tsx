import { useState } from "react";
import { useProducts, useCreateProduct } from "@/hooks/use-catalog";
import { Layout } from "@/components/Layout";
import { Modal } from "@/components/Modal";
import { Plus, Package } from "lucide-react";

export default function ProductsPage() {
  const { data: products, isLoading } = useProducts();
  const createProduct = useCreateProduct();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    unit: "kg",
    active: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createProduct.mutateAsync(formData);
    setIsModalOpen(false);
    setFormData({ name: "", category: "", unit: "kg", active: true });
  };

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Catálogo de Produtos</h1>
          <p className="text-muted-foreground mt-1">Gerencie frutas e unidades disponíveis.</p>
        </div>
        <button 
          data-testid="button-add-product"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"
        >
          <Plus className="w-5 h-5" /> Novo Produto
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isLoading ? (
          <div className="col-span-full p-8 text-center text-muted-foreground">Carregando produtos...</div>
        ) : products?.length === 0 ? (
          <div className="col-span-full p-8 text-center text-muted-foreground">Nenhum produto cadastrado.</div>
        ) : products?.map(product => (
          <div key={product.id} className="bg-card rounded-2xl p-6 border border-border/50 premium-shadow flex flex-col items-center text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${product.active ? 'bg-secondary/10' : 'bg-muted'}`}>
              <Package className={`w-8 h-8 ${product.active ? 'text-secondary' : 'text-muted-foreground'}`} />
            </div>
            <h3 className="text-lg font-bold text-foreground">{product.name}</h3>
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mt-1">{product.category}</p>
            <div className="mt-3 inline-block px-3 py-1 bg-muted rounded-lg text-sm font-bold text-foreground">
              Por {product.unit}
            </div>
            <span className={`mt-2 text-xs font-bold px-2 py-0.5 rounded-full ${product.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {product.active ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Adicionar Novo Produto">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Nome do Produto</label>
            <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none" placeholder="ex: Caixas de Banana" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Categoria</label>
              <input required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none" placeholder="ex: Frutas" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Unidade</label>
              <select value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none">
                <option value="kg">Quilograma (kg)</option>
                <option value="caixa">Caixa</option>
                <option value="unidade">Unidade</option>
                <option value="pallet">Pallet</option>
              </select>
            </div>
          </div>
          <button type="submit" disabled={createProduct.isPending} className="w-full py-3 mt-4 bg-primary text-white font-bold rounded-xl shadow-lg hover:-translate-y-0.5 transition-transform disabled:opacity-50">
            {createProduct.isPending ? "Salvando..." : "Adicionar Produto"}
          </button>
        </form>
      </Modal>
    </Layout>
  );
}
