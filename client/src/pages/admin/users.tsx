import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Modal } from "@/components/Modal";
import { useToast } from "@/hooks/use-toast";
import { UserCircle, Plus, Pencil, Trash2, Shield, ShieldCheck, DollarSign, Code } from "lucide-react";

type AdminUser = { id: number; name: string; email: string; password: string; role: string; };

const ROLES = [
  { value: "ADMIN", label: "Administrador", desc: "Acesso total ao sistema", icon: Shield, color: "text-red-600 bg-red-100" },
  { value: "OPERATIONS_MANAGER", label: "Gerente de Operações", desc: "Janelas de pedido e pedidos", icon: ShieldCheck, color: "text-blue-600 bg-blue-100" },
  { value: "PURCHASE_MANAGER", label: "Financeiro / Compras", desc: "Relatórios, compras e exportações", icon: DollarSign, color: "text-green-600 bg-green-100" },
  { value: "DEVELOPER", label: "Desenvolvedor", desc: "Acesso total + logs do sistema", icon: Code, color: "text-purple-600 bg-purple-100" },
];

const blank = { name: "", email: "", password: "", role: "ADMIN" };

export default function UsersAdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<{ open: boolean; editing: AdminUser | null }>({ open: false, editing: null });
  const [form, setForm] = useState(blank);
  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const res = await fetch('/api/users', { credentials: 'include' });
      return res.json() as Promise<AdminUser[]>;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const isEdit = !!modal.editing;
      const url = isEdit ? `/api/users/${modal.editing!.id}` : '/api/users';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || 'Erro'); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({ title: modal.editing ? "Usuário atualizado!" : "Usuário criado!" });
      setModal({ open: false, editing: null });
      setForm(blank);
    },
    onError: (e: any) => toast({ title: e.message || "Erro ao salvar", variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/users/${id}`, { method: 'DELETE', credentials: 'include' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({ title: "Usuário removido." });
      setConfirmDelete(null);
    },
  });

  const openCreate = () => { setForm(blank); setModal({ open: true, editing: null }); };
  const openEdit = (u: AdminUser) => { setForm({ name: u.name, email: u.email, password: '', role: u.role }); setModal({ open: true, editing: u }); };

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Usuários do Sistema</h1>
          <p className="text-muted-foreground mt-1">Gerencie os membros da equipe e suas permissões.</p>
        </div>
        <button onClick={openCreate} data-testid="button-new-user"
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/25 hover:-translate-y-0.5 transition-all">
          <Plus className="w-5 h-5" /> Novo Usuário
        </button>
      </div>

      {/* Role reference */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {ROLES.map(r => {
          const Icon = r.icon;
          return (
            <div key={r.value} className="bg-card rounded-xl p-4 border border-border/50 flex items-start gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${r.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">{r.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>
                <p className="text-xs font-bold text-muted-foreground/60 mt-1">
                  {users?.filter(u => u.role === r.value).length || 0} usuário(s)
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Users table */}
      <div className="bg-card rounded-2xl border border-border/50 premium-shadow overflow-hidden">
        <div className="p-5 border-b border-border/50 bg-muted/20 flex items-center gap-3">
          <UserCircle className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-foreground">Equipe Cadastrada</h2>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="bg-muted/30 border-b border-border/50 text-muted-foreground text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-semibold">Nome</th>
              <th className="px-6 py-4 font-semibold">Email</th>
              <th className="px-6 py-4 font-semibold">Perfil</th>
              <th className="px-6 py-4 font-semibold"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {isLoading ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">Carregando...</td></tr>
            ) : users?.map(u => {
              const role = ROLES.find(r => r.value === u.role);
              const Icon = role?.icon || UserCircle;
              return (
                <tr key={u.id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${role?.color || 'bg-muted text-muted-foreground'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-foreground">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${role?.color || 'bg-muted text-muted-foreground'}`}>
                      <Icon className="w-3 h-3" /> {role?.label || u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openEdit(u)}
                        className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setConfirmDelete(u)}
                        className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={modal.open} onClose={() => setModal({ open: false, editing: null })}
        title={modal.editing ? `Editar Usuário — ${modal.editing.name}` : "Novo Usuário"} maxWidth="max-w-lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-semibold mb-1.5">Nome completo *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none" placeholder="Nome do membro" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">Email *</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none" placeholder="email@vivafrutaz.com" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">{modal.editing ? "Nova Senha (opcional)" : "Senha *"}</label>
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none" placeholder={modal.editing ? "Deixe em branco para manter" : "••••••••"} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Perfil de Acesso *</label>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map(r => {
                const Icon = r.icon;
                return (
                  <button key={r.value} type="button" onClick={() => setForm({ ...form, role: r.value })}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${form.role === r.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${r.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className={`text-xs font-bold ${form.role === r.value ? 'text-primary' : 'text-foreground'}`}>{r.label}</p>
                      <p className="text-xs text-muted-foreground">{r.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <button onClick={() => { if (!form.name || !form.email || (!modal.editing && !form.password)) { toast({ title: "Preencha todos os campos obrigatórios.", variant: "destructive" }); return; } save.mutate(); }}
            disabled={save.isPending}
            className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:-translate-y-0.5 transition-transform disabled:opacity-50">
            {save.isPending ? "Salvando..." : modal.editing ? "Salvar Alterações" : "Criar Usuário"}
          </button>
        </div>
      </Modal>

      {/* Delete confirmation */}
      {confirmDelete && (
        <Modal isOpen onClose={() => setConfirmDelete(null)} title="Confirmar Exclusão" maxWidth="max-w-sm">
          <div className="space-y-4 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <Trash2 className="w-8 h-8 text-red-600" />
            </div>
            <p className="text-foreground">Tem certeza que deseja remover o usuário <strong>{confirmDelete.name}</strong>? Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 border-2 border-border font-bold rounded-xl">Cancelar</button>
              <button onClick={() => del.mutate(confirmDelete.id)} disabled={del.isPending}
                className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50">
                {del.isPending ? "Removendo..." : "Remover"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  );
}
