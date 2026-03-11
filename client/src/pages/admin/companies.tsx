import { useState } from "react";
import { useCompanies, useCreateCompany, usePriceGroups } from "@/hooks/use-admin";
import { Layout } from "@/components/Layout";
import { Modal } from "@/components/Modal";
import { Plus, Building2, Mail, Hash } from "lucide-react";

const DAYS_OPTIONS = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira"];

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
    allowedOrderDays: [] as string[],
    active: true,
  });

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      allowedOrderDays: prev.allowedOrderDays.includes(day)
        ? prev.allowedOrderDays.filter(d => d !== day)
        : [...prev.allowedOrderDays, day]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createCompany.mutateAsync({
      ...formData,
      priceGroupId: formData.priceGroupId ? Number(formData.priceGroupId) : null,
      allowedOrderDays: formData.allowedOrderDays,
    });
    setIsModalOpen(false);
    setFormData({ companyName: "", contactName: "", email: "", password: "", priceGroupId: "", allowedOrderDays: [], active: true });
  };

  const getDays = (company: any): string[] => {
    const days = company.allowedOrderDays;
    if (!days) return [];
    if (Array.isArray(days)) return days.map(String);
    return [];
  };

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Empresas</h1>
          <p className="text-muted-foreground mt-1">Gerencie contas e acessos de clientes B2B.</p>
        </div>
        <button 
          data-testid="button-add-company"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"
        >
          <Plus className="w-5 h-5" /> Nova Empresa
        </button>
      </div>

      <div className="bg-card rounded-2xl border border-border/50 premium-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-border/50 text-muted-foreground text-sm uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Empresa</th>
                <th className="px-6 py-4 font-semibold">Contato</th>
                <th className="px-6 py-4 font-semibold">Grupo de Preço</th>
                <th className="px-6 py-4 font-semibold">Dias Permitidos</th>
                <th className="px-6 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Carregando...</td></tr>
              ) : companies?.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Nenhuma empresa cadastrada</td></tr>
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
                        {priceGroups?.find(pg => pg.id === company.priceGroupId)?.groupName || 'Nenhum'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {getDays(company).map((day: string) => (
                          <span key={day} className="px-2 py-0.5 text-xs font-bold bg-primary/10 text-primary rounded-lg">{day}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${company.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {company.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Adicionar Nova Empresa">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Nome da Empresa</label>
              <input required value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Nome do Contato</label>
              <input required value={formData.contactName} onChange={e => setFormData({...formData, contactName: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Email (Login)</label>
              <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Senha</label>
              <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Grupo de Preço</label>
            <select value={formData.priceGroupId} onChange={e => setFormData({...formData, priceGroupId: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none">
              <option value="">Selecionar Grupo</option>
              {priceGroups?.map(pg => <option key={pg.id} value={pg.id}>{pg.groupName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Dias de Entrega Permitidos</label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OPTIONS.map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                    formData.allowedOrderDays.includes(day)
                      ? 'bg-primary text-white border-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" disabled={createCompany.isPending} className="w-full py-3 mt-4 bg-primary text-white font-bold rounded-xl shadow-lg hover:-translate-y-0.5 transition-transform disabled:opacity-50">
            {createCompany.isPending ? "Salvando..." : "Criar Empresa"}
          </button>
        </form>
      </Modal>
    </Layout>
  );
}
