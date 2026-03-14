import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Eye, ImageIcon } from 'lucide-react';
import type { ClientIncident } from '@shared/schema';

const TYPE_LABELS: Record<string, string> = {
  DELIVERY_PROBLEM: 'Problema de entrega',
  DEFECTIVE_PRODUCT: 'Produto com defeito',
  MISSING_PRODUCT: 'Produto faltando',
  QUALITY: 'Qualidade do produto',
  COMPLAINT: 'Reclamação geral',
  OTHER: 'Outro',
};

const STATUS_LABEL: Record<string, string> = { OPEN: 'Aberta', ANALYZING: 'Em análise', RESOLVED: 'Resolvida' };
const STATUS_COLOR: Record<string, string> = {
  OPEN: 'bg-red-100 text-red-800',
  ANALYZING: 'bg-yellow-100 text-yellow-800',
  RESOLVED: 'bg-green-100 text-green-800',
};

function IncidentDetail({ incident, onClose }: { incident: ClientIncident; onClose: () => void }) {
  const { toast } = useToast();
  const [status, setStatus] = useState(incident.status);
  const [adminNote, setAdminNote] = useState(incident.adminNote || '');

  const updateMut = useMutation({
    mutationFn: (data: any) => apiRequest('PATCH', `/api/client-incidents/${incident.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client-incidents'] });
      toast({ title: 'Ocorrência atualizada!' });
      onClose();
    },
    onError: () => toast({ title: 'Erro ao atualizar ocorrência', variant: 'destructive' }),
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><span className="font-medium text-muted-foreground">Empresa:</span><p className="font-semibold">{incident.companyName}</p></div>
        <div><span className="font-medium text-muted-foreground">Tipo:</span><p className="font-semibold">{TYPE_LABELS[incident.type] || incident.type}</p></div>
        <div><span className="font-medium text-muted-foreground">Contato:</span><p>{incident.contactPhone || '—'}</p></div>
        <div><span className="font-medium text-muted-foreground">Email:</span><p>{incident.contactEmail || '—'}</p></div>
        <div className="col-span-2"><span className="font-medium text-muted-foreground">Data:</span><p>{new Date(incident.createdAt).toLocaleString('pt-BR')}</p></div>
      </div>
      <div>
        <Label className="text-muted-foreground font-medium text-sm">Descrição</Label>
        <div className="mt-1 p-3 bg-muted/40 rounded-lg text-sm">{incident.description}</div>
      </div>
      {incident.photoBase64 && (
        <div>
          <Label className="text-muted-foreground font-medium text-sm">Foto anexada</Label>
          <img
            src={`data:${incident.photoMime};base64,${incident.photoBase64}`}
            alt="Foto da ocorrência"
            className="mt-1 rounded-lg max-h-48 object-contain border"
          />
        </div>
      )}
      <div>
        <Label>Status</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger data-testid="select-incident-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="OPEN">Aberta</SelectItem>
            <SelectItem value="ANALYZING">Em análise</SelectItem>
            <SelectItem value="RESOLVED">Resolvida</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Nota / Resposta para o cliente</Label>
        <Textarea
          data-testid="input-admin-note"
          value={adminNote}
          onChange={e => setAdminNote(e.target.value)}
          placeholder="Escreva uma resposta ou nota interna..."
          rows={3}
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Fechar</Button>
        <Button
          data-testid="button-save-incident"
          onClick={() => updateMut.mutate({ status, adminNote })}
          disabled={updateMut.isPending}
        >
          {updateMut.isPending ? 'Salvando...' : 'Salvar'}
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function AdminClientIncidentsPage() {
  const [selected, setSelected] = useState<ClientIncident | undefined>();
  const [filterStatus, setFilterStatus] = useState('ALL');

  const { data: incidents = [], isLoading } = useQuery<ClientIncident[]>({
    queryKey: ['/api/client-incidents'],
  });

  const filtered = filterStatus === 'ALL' ? incidents : incidents.filter(i => i.status === filterStatus);

  const openCount = incidents.filter(i => i.status === 'OPEN').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ocorrências de Clientes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {openCount > 0 ? (
              <span className="text-red-600 font-medium">{openCount} ocorrência(s) em aberto</span>
            ) : (
              'Nenhuma ocorrência em aberto'
            )}
          </p>
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44" data-testid="select-filter-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas</SelectItem>
            <SelectItem value="OPEN">Abertas</SelectItem>
            <SelectItem value="ANALYZING">Em análise</SelectItem>
            <SelectItem value="RESOLVED">Resolvidas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhuma ocorrência encontrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(inc => (
            <Card key={inc.id} data-testid={`card-client-incident-${inc.id}`} className="premium-shadow hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelected(inc)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{inc.companyName}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[inc.status]}`}>
                        {STATUS_LABEL[inc.status]}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {TYPE_LABELS[inc.type] || inc.type}
                      </span>
                      {inc.photoBase64 && <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">{inc.description}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-muted-foreground">{new Date(inc.createdAt).toLocaleDateString('pt-BR')}</p>
                    <Button data-testid={`button-view-incident-${inc.id}`} size="sm" variant="ghost" className="h-7 px-2 mt-1" onClick={e => { e.stopPropagation(); setSelected(inc); }}>
                      <Eye className="w-3.5 h-3.5 mr-1" /> Ver
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={() => setSelected(undefined)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ocorrência #{selected?.id?.toString().padStart(4, '0')}</DialogTitle>
          </DialogHeader>
          {selected && <IncidentDetail incident={selected} onClose={() => setSelected(undefined)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
