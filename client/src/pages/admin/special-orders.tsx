import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCompanies } from "@/hooks/use-admin";
import { Layout } from "@/components/Layout";
import { Modal } from "@/components/Modal";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Star, Building2, CheckCircle, XCircle, Clock, Eye, Calendar } from "lucide-react";

type SpecialOrderRequest = {
  id: number; companyId: number; requestedDay: string; description: string;
  quantity: string; observations: string | null; status: string;
  adminNote: string | null; createdAt: string; resolvedAt: string | null;
};

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: "Pendente", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  APPROVED: { label: "Aprovado", color: "bg-green-100 text-green-700", icon: CheckCircle },
  REJECTED: { label: "Recusado", color: "bg-red-100 text-red-700", icon: XCircle },
};

export default function SpecialOrdersAdminPage() {
  const { data: companies } = useCompanies();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reviewing, setReviewing] = useState<SpecialOrderRequest | null>(null);
  const [adminNote, setAdminNote] = useState("");

  const { data: requests, isLoading } = useQuery({
    queryKey: ['/api/special-order-requests'],
    queryFn: async () => {
      const res = await fetch('/api/special-order-requests', { credentials: 'include' });
      return res.json() as Promise<SpecialOrderRequest[]>;
    },
    refetchInterval: 30000,
  });

  const resolve = useMutation({
    mutationFn: async ({ id, status, adminNote }: { id: number; status: string; adminNote: string }) => {
      const res = await fetch(`/api/special-order-requests/${id}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminNote }),
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['/api/special-order-requests'] });
      toast({ title: vars.status === 'APPROVED' ? "Pedido pontual aprovado!" : "Pedido recusado." });
      setReviewing(null);
      setAdminNote("");
    },
    onError: () => toast({ title: "Erro ao processar", variant: "destructive" }),
  });

  const pending = requests?.filter(r => r.status === 'PENDING') || [];

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Pedidos Pontuais</h1>
        <p className="text-muted-foreground mt-1">Solicitações especiais fora da rotina semanal.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Pendentes", value: pending.length, color: "text-yellow-600", bg: "bg-yellow-100", icon: Clock },
          { label: "Aprovados", value: requests?.filter(r => r.status === 'APPROVED').length || 0, color: "text-green-600", bg: "bg-green-100", icon: CheckCircle },
          { label: "Recusados", value: requests?.filter(r => r.status === 'REJECTED').length || 0, color: "text-red-600", bg: "bg-red-100", icon: XCircle },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className="bg-card rounded-2xl p-5 border border-border/50 premium-shadow flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center`}>
              <Icon className={`w-6 h-6 ${color}`} />
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
              <p className="text-2xl font-display font-bold text-foreground">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border/50 premium-shadow overflow-hidden">
        <div className="p-5 border-b border-border/50 bg-muted/20 flex items-center gap-3">
          <Star className="w-5 h-5 text-secondary" />
          <h2 className="font-bold text-foreground">Todas as Solicitações</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/30 border-b border-border/50 text-muted-foreground text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Cliente</th>
                <th className="px-6 py-4 font-semibold">Dia</th>
                <th className="px-6 py-4 font-semibold">Descrição</th>
                <th className="px-6 py-4 font-semibold">Qtd.</th>
                <th className="px-6 py-4 font-semibold">Data</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">Carregando...</td></tr>
              ) : !requests?.length ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                  <Star className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p>Nenhum pedido pontual recebido.</p>
                </td></tr>
              ) : (
                requests.map(req => {
                  const company = companies?.find(c => c.id === req.companyId);
                  const status = STATUS_MAP[req.status] || { label: req.status, color: 'bg-muted text-muted-foreground', icon: Clock };
                  const StatusIcon = status.icon;
                  return (
                    <tr key={req.id} className={`hover:bg-muted/10 transition-colors ${req.status === 'PENDING' ? 'border-l-4 border-yellow-400' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-bold text-foreground text-sm">{company?.companyName || `#${req.companyId}`}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-1 text-sm font-medium">
                          <Calendar className="w-3.5 h-3.5 text-primary" /> {req.requestedDay}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground max-w-xs truncate">{req.description}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{req.quantity}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {format(new Date(req.createdAt), "d MMM yyyy", { locale: ptBR })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${status.color}`}>
                          <StatusIcon className="w-3 h-3" /> {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {req.status === 'PENDING' ? (
                          <button onClick={() => { setReviewing(req); setAdminNote(""); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-xl font-bold text-xs hover:bg-primary/90 transition-colors">
                            <Eye className="w-3.5 h-3.5" /> Revisar
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">{req.adminNote || "—"}</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review modal */}
      {reviewing && (
        <Modal isOpen onClose={() => setReviewing(null)} title="Revisar Pedido Pontual" maxWidth="max-w-lg">
          <div className="space-y-4">
            {(() => {
              const company = companies?.find(c => c.id === reviewing.companyId);
              return (
                <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
                  <p className="font-bold text-foreground">{company?.companyName}</p>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground font-semibold">Dia desejado:</span>
                      <p className="font-bold text-foreground mt-0.5">{reviewing.requestedDay}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground font-semibold">Quantidade:</span>
                      <p className="font-bold text-foreground mt-0.5">{reviewing.quantity}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground font-semibold">Descrição:</span>
                      <p className="text-foreground mt-0.5">{reviewing.description}</p>
                    </div>
                    {reviewing.observations && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground font-semibold">Observações:</span>
                        <p className="text-foreground mt-0.5 italic">{reviewing.observations}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
            <div>
              <label className="block text-sm font-semibold mb-1.5">Mensagem para o cliente</label>
              <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} rows={3}
                placeholder="Informe o cliente sobre a aprovação, data confirmada, preço estimado, ou motivo da recusa..."
                className="w-full px-4 py-2.5 rounded-xl border-2 border-border focus:border-primary outline-none resize-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => resolve.mutate({ id: reviewing.id, status: 'REJECTED', adminNote: adminNote || 'Pedido pontual recusado.' })}
                disabled={resolve.isPending}
                className="flex-1 py-2.5 border-2 border-red-300 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50">
                <XCircle className="w-4 h-4 inline mr-1" /> Recusar
              </button>
              <button onClick={() => resolve.mutate({ id: reviewing.id, status: 'APPROVED', adminNote: adminNote || 'Pedido pontual aprovado!' })}
                disabled={resolve.isPending}
                className="flex-1 py-2.5 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50">
                <CheckCircle className="w-4 h-4 inline mr-1" /> Aprovar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  );
}
