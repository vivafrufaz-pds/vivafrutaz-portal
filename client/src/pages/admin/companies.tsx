import { useState } from "react";
import { useCompanies, useCreateCompany, usePriceGroups } from "@/hooks/use-admin";
import { Layout } from "@/components/Layout";
import { Modal } from "@/components/Modal";
import { Plus, Building2, Mail, Hash } from "lucide-react";

export default function CompaniesPage() {
  const { data: companies, isLoading } = useCompanies();
  const { data: priceGroups } = usePriceGroups();
  const createCompany = useCreateCompany();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    companyName: "",
    contactName: "",
    email: "",
    password: "",
    priceGroupId: "",
    allowedOrderDays: "Monday,Wednesday,Friday",
    active: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createCompany.mutateAsync({
      ...formData,
      priceGroupId: formData.priceGroupId ? Number(formData.priceGroupId) : null,
      allowedOrderDays: formData.allowedOrderDays.split(",").map(d => d.trim()),
    });
    setIsModalOpen(false);
  };

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Companies</h1>
          <p className="text-muted-foreground mt-1">Manage B2B client accounts and access.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"
        >
          <Plus className="w-5 h-5" /> Add Client
        </button>
      </div>

      <div className="bg-card rounded-2xl border border-border/50 premium-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-border/50 text-muted-foreground text-sm uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Company</th>
                <th className="px-6 py-4 font-semibold">Contact</th>
                <th className="px-6 py-4 font-semibold">Price Group</th>
                <th className="px-6 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : companies?.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">No companies found</td></tr>
              ) : (
                companies?.map(company => (
                  <tr key={company.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground">{company.companyName}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3" /> {company.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-foreground">{company.contactName}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-secondary/10 text-secondary text-xs font-bold">
                        <Hash className="w-3 h-3" />
                        {priceGroups?.find(pg => pg.id === company.priceGroupId)?.groupName || 'None'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${company.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {company.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Client">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Company Name</label>
              <input required value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Contact Name</label>
              <input required value={formData.contactName} onChange={e => setFormData({...formData, contactName: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Email (Login)</label>
              <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Password</label>
              <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Price Group</label>
            <select value={formData.priceGroupId} onChange={e => setFormData({...formData, priceGroupId: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none">
              <option value="">Select Group</option>
              {priceGroups?.map(pg => <option key={pg.id} value={pg.id}>{pg.groupName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Allowed Order Days (comma separated)</label>
            <input required value={formData.allowedOrderDays} onChange={e => setFormData({...formData, allowedOrderDays: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none" placeholder="Monday, Tuesday" />
          </div>
          <button type="submit" disabled={createCompany.isPending} className="w-full py-3 mt-4 bg-primary text-white font-bold rounded-xl shadow-lg hover:-translate-y-0.5 transition-transform disabled:opacity-50">
            {createCompany.isPending ? "Saving..." : "Create Company"}
          </button>
        </form>
      </Modal>
    </Layout>
  );
}
