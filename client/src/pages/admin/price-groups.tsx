import { useState } from "react";
import { usePriceGroups, useCreatePriceGroup } from "@/hooks/use-admin";
import { useProducts, useProductPrices, useUpdateProductPrice } from "@/hooks/use-catalog";
import { Layout } from "@/components/Layout";
import { Modal } from "@/components/Modal";
import { Plus, Tag } from "lucide-react";

export default function PriceGroupsPage() {
  const { data: priceGroups } = usePriceGroups();
  const { data: products } = useProducts();
  const { data: prices } = useProductPrices();
  const createGroup = useCreatePriceGroup();
  const updatePrice = useUpdateProductPrice();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");

  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    await createGroup.mutateAsync({ groupName, description });
    setIsModalOpen(false);
    setGroupName("");
    setDescription("");
  };

  const handlePriceChange = (productId: number, priceStr: string) => {
    if (!selectedGroup || !priceStr) return;
    const existingPrice = prices?.find(p => p.productId === productId && p.priceGroupId === selectedGroup);
    updatePrice.mutate({
      id: existingPrice?.id,
      productId,
      priceGroupId: selectedGroup,
      price: priceStr
    });
  };

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Price Groups</h1>
          <p className="text-muted-foreground mt-1">Manage dynamic pricing tiers for clients.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"
        >
          <Plus className="w-5 h-5" /> New Group
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Groups Sidebar */}
        <div className="lg:col-span-1 space-y-3">
          {priceGroups?.map(group => (
            <button
              key={group.id}
              onClick={() => setSelectedGroup(group.id)}
              className={`w-full text-left p-4 rounded-2xl border transition-all ${
                selectedGroup === group.id 
                  ? 'border-primary bg-primary/5 shadow-md' 
                  : 'border-border/50 bg-card hover:border-border'
              }`}
            >
              <div className="flex items-center gap-3">
                <Tag className={`w-5 h-5 ${selectedGroup === group.id ? 'text-primary' : 'text-muted-foreground'}`} />
                <div>
                  <h3 className="font-bold text-foreground">{group.groupName}</h3>
                  <p className="text-xs text-muted-foreground truncate">{group.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Pricing Table */}
        <div className="lg:col-span-3">
          {selectedGroup ? (
            <div className="bg-card rounded-2xl border border-border/50 premium-shadow overflow-hidden">
              <div className="p-6 border-b border-border/50 bg-muted/20">
                <h2 className="text-xl font-bold text-foreground">
                  Editing Prices: {priceGroups?.find(g => g.id === selectedGroup)?.groupName}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">Prices are auto-saved on change.</p>
              </div>
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-muted/30 text-muted-foreground text-sm uppercase tracking-wider">
                      <th className="px-6 py-4 font-semibold">Product</th>
                      <th className="px-6 py-4 font-semibold">Unit</th>
                      <th className="px-6 py-4 font-semibold">Price ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {products?.map(product => {
                      const currentPrice = prices?.find(p => p.productId === product.id && p.priceGroupId === selectedGroup)?.price;
                      return (
                        <tr key={product.id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-6 py-4 font-bold text-foreground">{product.name}</td>
                          <td className="px-6 py-4 text-muted-foreground uppercase text-sm">{product.unit}</td>
                          <td className="px-6 py-4">
                            <input 
                              type="number" 
                              step="0.01"
                              defaultValue={currentPrice || ""}
                              onBlur={(e) => handlePriceChange(product.id, e.target.value)}
                              className="w-32 px-3 py-2 rounded-lg border-2 border-border focus:border-primary outline-none text-foreground font-medium"
                              placeholder="0.00"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[300px] flex items-center justify-center border-2 border-dashed border-border/50 rounded-2xl text-muted-foreground font-medium">
              Select a price group to edit prices
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Price Group">
        <form onSubmit={handleCreateGroup} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Group Name</label>
            <input required value={groupName} onChange={e => setGroupName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none" placeholder="e.g. VIP Clients" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none" placeholder="Optional notes" />
          </div>
          <button type="submit" disabled={createGroup.isPending} className="w-full py-3 mt-4 bg-primary text-white font-bold rounded-xl shadow-lg hover:-translate-y-0.5 transition-transform disabled:opacity-50">
            {createGroup.isPending ? "Creating..." : "Create Group"}
          </button>
        </form>
      </Modal>
    </Layout>
  );
}
