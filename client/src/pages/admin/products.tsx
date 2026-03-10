import { useState } from "react";
import { useProducts, useCreateProduct } from "@/hooks/use-catalog";
import { Layout } from "@/components/Layout";
import { Modal } from "@/components/Modal";
import { Plus, PackageOpen } from "lucide-react";

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
          <h1 className="text-3xl font-display font-bold text-foreground">Product Catalog</h1>
          <p className="text-muted-foreground mt-1">Manage available fruits and units.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"
        >
          <Plus className="w-5 h-5" /> Add Product
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isLoading ? (
          <div className="col-span-full p-8 text-center text-muted-foreground">Loading products...</div>
        ) : products?.map(product => (
          <div key={product.id} className="bg-card rounded-2xl p-6 border border-border/50 premium-shadow flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mb-4">
              <PackageOpen className="w-8 h-8 text-secondary" />
            </div>
            <h3 className="text-lg font-bold text-foreground">{product.name}</h3>
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mt-1">{product.category}</p>
            <div className="mt-4 inline-block px-3 py-1 bg-muted rounded-lg text-sm font-bold text-foreground">
              Per {product.unit}
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Product">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Product Name</label>
            <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none" placeholder="e.g. Fuji Apples" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Category</label>
              <input required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none" placeholder="e.g. Apples" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Unit</label>
              <select value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none">
                <option value="kg">Kilogram (kg)</option>
                <option value="box">Box</option>
                <option value="piece">Piece</option>
                <option value="pallet">Pallet</option>
              </select>
            </div>
          </div>
          <button type="submit" disabled={createProduct.isPending} className="w-full py-3 mt-4 bg-primary text-white font-bold rounded-xl shadow-lg hover:-translate-y-0.5 transition-transform disabled:opacity-50">
            {createProduct.isPending ? "Saving..." : "Add Product"}
          </button>
        </form>
      </Modal>
    </Layout>
  );
}
