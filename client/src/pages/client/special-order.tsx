import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Star, Plus, Clock, CheckCircle, XCircle, Send, Calendar } from "lucide-react";

const DAYS = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira"];

type SpecialOrderRequest = {
  id: number; companyId: number; requestedDay: string; description: string;
  quantity: string; observations: string | null; status: string;
  adminNote: string | null; createdAt: string; resolvedAt: string | null;
};

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: "Aguardando aprovação", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  APPROVED: { label: "Aprovado", color: "bg-green-100 text-green-700", icon: CheckCircle },
  REJECTED: { label: "Recusado", color: "bg-red-100 text-red-700", icon: XCircle },
};

export default function SpecialOrderPage() {
  const { company } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ requestedDay: "", description: "", quantity: "", observations: "" });

  const { data: requests, isLoading } = useQuery({
    queryKey: ['/api/special-order-requests/company', company?.id],
    queryFn: async () => {
      const res = await fetch(`/api/special-order-requests/company/${company?.id}`, { credentials: 'include' });
      return res.json() as Promise<SpecialOrderRequest[]>;
    },
    enabled: !!company?.id,
  });

  const submit = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/special-order-requests', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, companyId: company!.id }),
      });
      if (!res.ok) throw new Error('Erro ao enviar');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/special-order-requests/company', company?.id] });
      toast({ title: "Pedido pontual enviado! Aguarde a aprovação da VivaFrutaz." });
      setShowForm(false);
      setForm({ requestedDay: "", description: "", quantity: "", observations: "" });
    },
    onError: () => toast({ title: "Erro ao enviar solicitação.", variant: "destructive" }),
  });

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Pedido Pontual</h1>
          <p className="text-muted-foreground mt-1">Solicite pedidos especiais fora da rotina semanal.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          data-testid="button-new-special-order"
          className="flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground font-bold rounded-xl hover:-translate-y-0.5 transition-all shadow-lg shadow-secondary/20">
          <Plus className="w-4 h-4" /> Nova Solicitação
        </button>
      </div>

      {/* Info banner */}
      <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-2xl flex items-start gap-3">
        <Star className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-foreground">O que é um Pedido Pontual?</p>
          <p className="text-sm text-muted-foreground mt-1">
            Pedidos pontuais são solicitações especiais fora da rotina habitual — eventos, demandas extras, produtos específicos.
            A equipe VivaFrutaz irá analisar e entrar em contato para confirmar.
          </p>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-card rounded-2xl border-2 border-secondary/30 premium-shadow p-6 mb-8">
          <h2 className="text-lg font-bold text-foreground mb-5 flex items-center gap-2">
            <Send className="w-5 h-5 text-secondary" /> Nova Solicitação de Pedido Pontual
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5">Dia Desejado *</label>
              <select required value={form.requestedDay} onChange={e => setForm({ ...form, requestedDay: e.target.value })}
                data-testid="select-requested-day"
                className="w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none">
                <option value="">Selecione um dia...</option>
                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">Quantidade Aproximada *</label>
              <input required value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })}
                data-testid="input-quantity"
                placeholder="Ex: 20kg, 3 caixas, 50 unidades..."
                className="w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold mb-1.5">Descrição do Pedido *</label>
              <textarea required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                data-testid="input-description"
                rows={3} placeholder="Descreva os produtos ou o pedido especial em detalhes..."
                className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-primary outline-none resize-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold mb-1.5">Observações</label>
              <textarea value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })}
                rows={2} placeholder="Informações adicionais (opcional)..."
                className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-primary outline-none resize-none" />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button type="button" onClick={() => setShowForm(false)}
              className="px-5 py-2.5 border-2 border-border text-muted-foreground font-bold rounded-xl hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button type="button"
              onClick={() => { if (!form.requestedDay || !form.description || !form.quantity) { toast({ title: "Preencha todos os campos obrigatórios.", variant: "destructive" }); return; } submit.mutate(); }}
              disabled={submit.isPending}
              data-testid="button-submit-special-order"
              className="px-8 py-2.5 bg-secondary text-secondary-foreground font-bold rounded-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 flex items-center gap-2">
              <Send className="w-4 h-4" />
              {submit.isPending ? "Enviando..." : "Enviar Solicitação"}
            </button>
          </div>
        </div>
      )}

      {/* Requests list */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando solicitações...</div>
        ) : !requests?.length ? (
          <div className="bg-card rounded-2xl p-12 text-center border border-border/50">
            <Star className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-foreground">Nenhuma Solicitação</h3>
            <p className="text-muted-foreground mt-2">Você ainda não fez solicitações de pedidos pontuais.</p>
            <button onClick={() => setShowForm(true)} className="mt-5 px-6 py-3 bg-secondary text-secondary-foreground font-bold rounded-xl hover:bg-secondary/90 transition-colors">
              Fazer primeira solicitação
            </button>
          </div>
        ) : (
          requests.map(req => {
            const status = STATUS_MAP[req.status] || { label: req.status, color: 'bg-muted text-muted-foreground', icon: Clock };
            const StatusIcon = status.icon;
            return (
              <div key={req.id} className="bg-card rounded-2xl border border-border/50 premium-shadow p-5">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span className="font-bold text-foreground">{req.requestedDay}</span>
                      <span className={`ml-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${status.color}`}>
                        <StatusIcon className="w-3 h-3" /> {status.label}
                      </span>
                    </div>
                    <p className="text-foreground">{req.description}</p>
                    <p className="text-sm text-muted-foreground mt-1">Quantidade: {req.quantity}</p>
                    {req.observations && <p className="text-sm text-muted-foreground mt-1 italic">{req.observations}</p>}
                    {req.adminNote && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                        <p className="text-sm font-bold text-blue-800">Resposta VivaFrutaz:</p>
                        <p className="text-sm text-blue-700 mt-0.5">{req.adminNote}</p>
                      </div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-muted-foreground">{format(new Date(req.createdAt), "d 'de' MMM yyyy", { locale: ptBR })}</p>
                    {req.resolvedAt && <p className="text-xs text-muted-foreground mt-0.5">Resolvido: {format(new Date(req.resolvedAt), "d 'de' MMM", { locale: ptBR })}</p>}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Layout>
  );
}
