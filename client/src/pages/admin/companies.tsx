import { useState } from "react";
import { useCompanies, useCreateCompany, useUpdateCompany, usePriceGroups } from "@/hooks/use-admin";
import { Layout } from "@/components/Layout";
import { Modal } from "@/components/Modal";
import {
  Plus, Building2, Mail, Hash, Phone, Clock, Edit2,
  CheckCircle, XCircle, CalendarDays, CreditCard, DollarSign,
  FileText, Settings, User, Percent
} from "lucide-react";
import type { Company } from "@shared/schema";

const DAYS_OPTIONS = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira"];

type TabKey = "basico" | "config" | "financeiro";

const TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: "basico", label: "Dados Básicos", icon: User },
  { key: "config", label: "Configurações", icon: Settings },
  { key: "financeiro", label: "Financeiro", icon: CreditCard },
];

const emptyForm = {
  companyName: "",
  contactName: "",
  email: "",
  password: "",
  phone: "",
  priceGroupId: "",
  allowedOrderDays: [] as string[],
  active: true,
  clientType: "mensal",
  minWeeklyBilling: "",
  deliveryTime: "",
  adminFee: "0",
  billingTerm: "",
  billingType: "",
  billingFormat: "",
  paymentDates: "",
  financialNotes: "",
};

function companyToForm(c: Company): typeof emptyForm {
  return {
    companyName: c.companyName,
    contactName: c.contactName,
    email: c.email,
    password: "",
    phone: c.phone || "",
    priceGroupId: c.priceGroupId ? String(c.priceGroupId) : "",
    allowedOrderDays: Array.isArray(c.allowedOrderDays) ? (c.allowedOrderDays as any[]).map(String) : [],
    active: c.active,
    clientType: c.clientType || "mensal",
    minWeeklyBilling: c.minWeeklyBilling ? String(c.minWeeklyBilling) : "",
    deliveryTime: c.deliveryTime || "",
    adminFee: c.adminFee ? String(c.adminFee) : "0",
    billingTerm: c.billingTerm || "",
    billingType: c.billingType || "",
    billingFormat: c.billingFormat || "",
    paymentDates: c.paymentDates || "",
    financialNotes: c.financialNotes || "",
  };
}

const getBillingLabel = (type: string | null) => {
  const map: Record<string, string> = { boleto: "Boleto", deposito: "Depósito", pix: "PIX" };
  return type ? (map[type] || type) : "—";
};
const getBillingFormatLabel = (f: string | null) => {
  const map: Record<string, string> = { diario: "Diário", semanal: "Semanal", mensal: "Mensal" };
  return f ? (map[f] || f) : "—";
};

export default function CompaniesPage() {
  const { data: companies, isLoading } = useCompanies();
  const { data: priceGroups } = usePriceGroups();
  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("basico");
  const [formData, setFormData] = useState(emptyForm);

  const openCreate = () => {
    setEditingCompany(null);
    setFormData(emptyForm);
    setActiveTab("basico");
    setIsModalOpen(true);
  };

  const openEdit = (company: Company) => {
    setEditingCompany(company);
    setFormData(companyToForm(company));
    setActiveTab("basico");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCompany(null);
  };

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      allowedOrderDays: prev.allowedOrderDays.includes(day)
        ? prev.allowedOrderDays.filter(d => d !== day)
        : [...prev.allowedOrderDays, day]
    }));
  };

  const set = (field: string, value: any) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: any = {
      companyName: formData.companyName,
      contactName: formData.contactName,
      email: formData.email,
      priceGroupId: formData.priceGroupId ? Number(formData.priceGroupId) : null,
      allowedOrderDays: formData.allowedOrderDays,
      active: formData.active,
      phone: formData.phone || null,
      clientType: formData.clientType || null,
      minWeeklyBilling: formData.minWeeklyBilling ? String(formData.minWeeklyBilling) : null,
      deliveryTime: formData.deliveryTime || null,
      adminFee: formData.adminFee ? String(formData.adminFee) : "0",
      billingTerm: formData.billingTerm || null,
      billingType: formData.billingType || null,
      billingFormat: formData.billingFormat || null,
      paymentDates: formData.paymentDates || null,
      financialNotes: formData.financialNotes || null,
    };

    if (editingCompany) {
      if (formData.password) payload.password = formData.password;
      await updateCompany.mutateAsync({ id: editingCompany.id, data: payload });
    } else {
      payload.password = formData.password;
      await createCompany.mutateAsync(payload);
    }
    closeModal();
  };

  const getDays = (c: Company): string[] => {
    if (!c.allowedOrderDays) return [];
    if (Array.isArray(c.allowedOrderDays)) return (c.allowedOrderDays as any[]).map(String);
    return [];
  };

  const isPending = createCompany.isPending || updateCompany.isPending;

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Empresas</h1>
          <p className="text-muted-foreground mt-1">Cadastro completo de clientes corporativos.</p>
        </div>
        <button
          data-testid="button-add-company"
          onClick={openCreate}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"
        >
          <Plus className="w-5 h-5" /> Nova Empresa
        </button>
      </div>

      {/* Company cards/table */}
      <div className="bg-card rounded-2xl border border-border/50 premium-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/30 border-b border-border/50 text-muted-foreground text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Empresa</th>
                <th className="px-6 py-4 font-semibold">Contato</th>
                <th className="px-6 py-4 font-semibold">Grupo de Preço</th>
                <th className="px-6 py-4 font-semibold">Horário</th>
                <th className="px-6 py-4 font-semibold">Tipo</th>
                <th className="px-6 py-4 font-semibold">Faturamento</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">Carregando...</td></tr>
              ) : companies?.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">Nenhuma empresa cadastrada</td></tr>
              ) : (
                companies?.map(company => (
                  <tr key={company.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground">{company.companyName}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3" /> {company.email}
                          </p>
                          {company.phone && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {company.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-foreground">{company.contactName}</td>
                    <td className="px-6 py-4">
                      {company.priceGroupId ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-secondary/10 text-secondary text-xs font-bold">
                          <Hash className="w-3 h-3" />
                          {priceGroups?.find(pg => pg.id === company.priceGroupId)?.groupName || 'Nenhum'}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {company.deliveryTime ? (
                        <span className="flex items-center gap-1 text-sm font-bold text-foreground">
                          <Clock className="w-4 h-4 text-primary" /> {company.deliveryTime}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${company.clientType === 'pontual' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                        {company.clientType === 'pontual' ? 'Pontual' : 'Mensal'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {company.billingType ? (
                        <div className="text-sm">
                          <p className="font-semibold text-foreground">{getBillingLabel(company.billingType)}</p>
                          <p className="text-muted-foreground text-xs">{getBillingFormatLabel(company.billingFormat)}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${company.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {company.active ? <><CheckCircle className="w-3 h-3" /> Ativo</> : <><XCircle className="w-3 h-3" /> Inativo</>}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        data-testid={`button-edit-${company.id}`}
                        onClick={() => openEdit(company)}
                        className="p-2 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingCompany ? `Editar: ${editingCompany.companyName}` : "Nova Empresa"}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSubmit}>
          {/* Tab Nav */}
          <div className="flex border-b border-border/50 mb-6 -mx-0">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
                    activeTab === tab.key
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4" /> {tab.label}
                </button>
              );
            })}
          </div>

          {/* ─── Tab: Dados Básicos ─── */}
          {activeTab === "basico" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Nome da Empresa *</label>
                  <input required value={formData.companyName} onChange={e => set("companyName", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Contato Responsável *</label>
                  <input required value={formData.contactName} onChange={e => set("contactName", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Email (Login) *</label>
                  <input required type="email" value={formData.email} onChange={e => set("email", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Telefone</label>
                  <input type="tel" value={formData.phone} onChange={e => set("phone", e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">
                    {editingCompany ? "Nova Senha (deixe em branco para manter)" : "Senha *"}
                  </label>
                  <input type="password" value={formData.password} onChange={e => set("password", e.target.value)}
                    required={!editingCompany}
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Grupo de Preço</label>
                  <select value={formData.priceGroupId} onChange={e => set("priceGroupId", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none">
                    <option value="">Selecionar grupo</option>
                    {priceGroups?.map(pg => <option key={pg.id} value={pg.id}>{pg.groupName}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Dias de Entrega Permitidos</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OPTIONS.map(day => (
                    <button key={day} type="button" onClick={() => toggleDay(day)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                        formData.allowedOrderDays.includes(day)
                          ? 'bg-primary text-white border-primary'
                          : 'border-border text-muted-foreground hover:border-primary/50'
                      }`}>
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── Tab: Configurações ─── */}
          {activeTab === "config" && (
            <div className="space-y-5">
              {/* Status */}
              <div className="p-4 rounded-xl border-2 border-border bg-muted/20">
                <p className="text-sm font-semibold mb-3 text-foreground">Status da Empresa</p>
                <div className="flex gap-3">
                  <button type="button" onClick={() => set("active", true)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm border-2 transition-all ${formData.active ? 'bg-green-600 text-white border-green-600' : 'border-border text-muted-foreground hover:border-green-400'}`}>
                    <CheckCircle className="w-4 h-4" /> Ativa
                  </button>
                  <button type="button" onClick={() => set("active", false)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm border-2 transition-all ${!formData.active ? 'bg-red-600 text-white border-red-600' : 'border-border text-muted-foreground hover:border-red-400'}`}>
                    <XCircle className="w-4 h-4" /> Inativa
                  </button>
                </div>
              </div>

              {/* Tipo de cliente */}
              <div className="p-4 rounded-xl border-2 border-border bg-muted/20">
                <p className="text-sm font-semibold mb-3 text-foreground">Tipo de Cliente</p>
                <div className="flex gap-3">
                  {[{ value: "mensal", label: "Mensal" }, { value: "pontual", label: "Pontual" }].map(opt => (
                    <button key={opt.value} type="button" onClick={() => set("clientType", opt.value)}
                      className={`px-5 py-2.5 rounded-xl font-bold text-sm border-2 transition-all ${formData.clientType === opt.value ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">
                    <span className="flex items-center gap-1"><DollarSign className="w-4 h-4 text-primary" /> Faturamento Mínimo Semanal (R$)</span>
                  </label>
                  <input type="number" step="0.01" min="0" value={formData.minWeeklyBilling}
                    onChange={e => set("minWeeklyBilling", e.target.value)}
                    placeholder="0,00"
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none" />
                  <p className="text-xs text-muted-foreground mt-1">Mínimo esperado por semana. Pode ter exceções por cliente.</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">
                    <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-primary" /> Horário de Entrega</span>
                  </label>
                  <input type="time" value={formData.deliveryTime}
                    onChange={e => set("deliveryTime", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none" />
                  <p className="text-xs text-muted-foreground mt-1">Aparece nos pedidos e relatórios. Ex: 08:30</p>
                </div>
              </div>

              {/* Taxa administrativa */}
              <div className="p-4 rounded-xl border-2 border-secondary/30 bg-secondary/5">
                <label className="flex items-center gap-2 text-sm font-bold text-secondary mb-3">
                  <Percent className="w-4 h-4" />
                  Taxa Administrativa (%)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="number" step="0.1" min="0" max="100"
                    value={formData.adminFee}
                    onChange={e => set("adminFee", e.target.value)}
                    className="w-32 px-4 py-2.5 rounded-xl border-2 border-border focus:border-secondary outline-none text-xl font-bold text-center"
                    placeholder="0"
                  />
                  <div className="flex gap-2">
                    {["0", "5", "10", "12", "15", "20"].map(v => (
                      <button key={v} type="button" onClick={() => set("adminFee", v)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-bold border-2 transition-all ${formData.adminFee === v ? 'bg-secondary text-white border-secondary' : 'border-border text-muted-foreground hover:border-secondary/50'}`}>
                        {v}%
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Aplicada automaticamente sobre o preço base de todos os produtos.
                  Clientes não visualizam esta taxa.
                </p>
                {formData.adminFee && Number(formData.adminFee) > 0 && (
                  <p className="text-xs font-bold text-secondary mt-1">
                    Ex: produto R$ 10,00 → cliente vê R$ {(10 * (1 + Number(formData.adminFee) / 100)).toFixed(2)}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ─── Tab: Financeiro ─── */}
          {activeTab === "financeiro" && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-4">
                {/* Prazo de faturamento */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Prazo de Faturamento</label>
                  <div className="flex flex-col gap-2">
                    {["15", "30", "45"].map(opt => (
                      <button key={opt} type="button" onClick={() => set("billingTerm", opt)}
                        className={`px-4 py-2 rounded-xl font-bold text-sm border-2 transition-all text-left ${formData.billingTerm === opt ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}>
                        {opt} dias
                      </button>
                    ))}
                    <button type="button" onClick={() => set("billingTerm", "")}
                      className={`px-4 py-2 rounded-xl font-bold text-sm border-2 transition-all text-left ${!formData.billingTerm ? 'bg-muted border-border text-foreground' : 'border-border text-muted-foreground hover:border-border'}`}>
                      Não definido
                    </button>
                  </div>
                </div>

                {/* Tipo de faturamento */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Tipo de Faturamento</label>
                  <div className="flex flex-col gap-2">
                    {[
                      { value: "boleto", label: "Boleto" },
                      { value: "deposito", label: "Depósito" },
                      { value: "pix", label: "PIX" },
                    ].map(opt => (
                      <button key={opt.value} type="button" onClick={() => set("billingType", opt.value)}
                        className={`px-4 py-2 rounded-xl font-bold text-sm border-2 transition-all text-left ${formData.billingType === opt.value ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}>
                        {opt.label}
                      </button>
                    ))}
                    <button type="button" onClick={() => set("billingType", "")}
                      className={`px-4 py-2 rounded-xl font-bold text-sm border-2 transition-all text-left ${!formData.billingType ? 'bg-muted border-border text-foreground' : 'border-border text-muted-foreground hover:border-border'}`}>
                      Não definido
                    </button>
                  </div>
                </div>

                {/* Formato de faturamento */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Formato de Faturamento</label>
                  <div className="flex flex-col gap-2">
                    {[
                      { value: "diario", label: "Diário" },
                      { value: "semanal", label: "Semanal" },
                      { value: "mensal", label: "Mensal" },
                    ].map(opt => (
                      <button key={opt.value} type="button" onClick={() => set("billingFormat", opt.value)}
                        className={`px-4 py-2 rounded-xl font-bold text-sm border-2 transition-all text-left ${formData.billingFormat === opt.value ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}>
                        {opt.label}
                      </button>
                    ))}
                    <button type="button" onClick={() => set("billingFormat", "")}
                      className={`px-4 py-2 rounded-xl font-bold text-sm border-2 transition-all text-left ${!formData.billingFormat ? 'bg-muted border-border text-foreground' : 'border-border text-muted-foreground hover:border-border'}`}>
                      Não definido
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">
                  <span className="flex items-center gap-1"><CalendarDays className="w-4 h-4 text-primary" /> Datas de Pagamento</span>
                </label>
                <input type="text" value={formData.paymentDates}
                  onChange={e => set("paymentDates", e.target.value)}
                  placeholder="Ex: 5, 15, 25 de cada mês"
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none" />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">
                  <span className="flex items-center gap-1"><FileText className="w-4 h-4 text-primary" /> Observação Financeira</span>
                </label>
                <textarea value={formData.financialNotes}
                  onChange={e => set("financialNotes", e.target.value)}
                  rows={4}
                  placeholder="Informações adicionais sobre o faturamento deste cliente..."
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none resize-none" />
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/50">
            <div className="flex gap-2">
              {TABS.map(tab => {
                const Icon = tab.icon;
                return (
                  <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
                    className={`p-2 rounded-lg transition-colors ${activeTab === tab.key ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}>
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={closeModal}
                className="px-5 py-2.5 rounded-xl border-2 border-border font-bold text-muted-foreground hover:bg-muted transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={isPending}
                className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl shadow-lg hover:-translate-y-0.5 transition-transform disabled:opacity-50">
                {isPending ? "Salvando..." : editingCompany ? "Salvar Alterações" : "Criar Empresa"}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
