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
import { AlertTriangle, Eye, ImageIcon, MessageSquareReply, CheckCircle2 } from 'lucide-react';
import type { ClientIncident } from '@shared/schema';

const TYPE_LABELS: Record<string, string> = {
  DELIVERY_PROBLEM: 'Problema de entrega',
  DEFECTIVE_PRODUCT: 'Produto com defeito',
  MISSING_PRODUCT: 'Produto faltando',
  QUALITY: 'Qualidade do produto',
  COMPLAINT: 'Reclamação geral',
  OTHER: 'Outro',
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: 'Aberta',
  ANALYZING: 'Em análise',
  RESPONDED: 'Respondida',
  RESOLVED: 'Resolvida',
};
const STATUS_COLOR: Record<string, string> = {
  OPEN: 'bg-red-100 text-red-800',
  ANALYZING: 'bg-yellow-100 text-yellow-800',
  RESPONDED: 'bg-blue-100 text-blue-800',
  RESOLVED: 'bg-green-100 text-green-800',
};

function IncidentDetail({ incident, onClose }: { incident: ClientIncident; onClose: () => void }) {
  const { toast } = useToast();
  const [status, setStatus] = useState(incident.status);
  const [adminNote, setAdminNote] = useState(incident.adminNote || '');
  const [showRespondForm, setShowRespondForm] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');

  const updateMut = useMutation({
    mutationFn: (data: any) => apiRequest('PATCH', `/api/client-incidents/${incident.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client-incidents'] });
      toast({ title: 'Ocorrência atualizada!' });
      onClose();
    },
    onError: () => toast({ title: 'Erro ao atualizar ocorrência', variant: 'destructive' }),
  });

  const respondMut = useMutation({
    mutationFn: (data: any) => apiRequest('POST', `/api/client-incidents/${incident.id}/respond`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client-incidents'] });
      toast({ title: 'Resposta enviada ao cliente!' });
      onClose();
    },
    onError: () => toast({ title: 'Erro ao enviar resposta', variant: 'destructive' }),
  });

  const handleRespond = () => {
    if (!responseMessage.trim()) return toast({ title: 'Escreva a mensagem de resposta', variant: 'destructive' });
    respondMut.mutate({ responseMessage });
  };

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
        <Label className="text-muted-foreground font-medium text-sm">Descrição do cliente</Label>
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

      {/* Show existing response if already responded */}
      {(incident as any).responseMessage && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquareReply className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-semibold text-blue-700">Resposta enviada</span>
            {(incident as any).respondedByName && (
              <span className="text-xs text-blue-600">por {(incident as any).respondedByName}</span>
            )}
            {(incident as any).respondedAt && (
              <span className="text-xs text-blue-500 ml-auto">
                {new Date((incident as any).respondedAt).toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>
          <p className="text-sm text-blue-900">{(incident as any).responseMessage}</p>
        </div>
      )}

      {/* Respond to client section */}
      {!showRespondForm ? (
        <Button
          data-testid="button-respond-incident"
          variant="outline"
          className="w-full gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
          onClick={() => setShowRespondForm(true)}
        >
          <MessageSquareReply className="w-4 h-4" />
          {(incident as any).responseMessage ? 'Atualizar resposta ao cliente' : 'Responder ao cliente'}
        </Button>
      ) : (
        <div className="space-y-3 p-3 border border-blue-200 rounded-lg bg-blue-50/40">
          <Label className="text-sm font-semibold text-blue-800">Resposta oficial (visível ao cliente)</Label>
          <Textarea
            data-testid="input-response-message"
            value={responseMessage}
            onChange={e => setResponseMessage(e.target.value)}
            placeholder="Escreva a resposta que o cliente verá no portal..."
            rows={3}
            className="bg-white"
          />
          <div className="flex gap-2">
            <Button
              data-testid="button-send-response"
              size="sm"
              onClick={handleRespond}
              disabled={respondMut.isPending}
              className="gap-2"
            >
              <MessageSquareReply className="w-3.5 h-3.5" />
              {respondMut.isPending ? 'Enviando...' : 'Enviar resposta'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowRespondForm(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* Status and note section */}
      <div className="border-t pt-4 space-y-3">
        <div>
          <Label>Status da ocorrência</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger data-testid="select-incident-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OPEN">Aberta</SelectItem>
              <SelectItem value="ANALYZING">Em análise</SelectItem>
              <SelectItem value="RESPONDED">Respondida</SelectItem>
              <SelectItem value="RESOLVED">Resolvida</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Nota interna (não visível ao cliente)</Label>
          <Textarea
            data-testid="input-admin-note"
            value={adminNote}
            onChange={e => setAdminNote(e.target.value)}
            placeholder="Notas internas sobre esta ocorrência..."
            rows={2}
          />
        </div>
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
  const respondedCount = incidents.filter(i => i.status === 'RESPONDED').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ocorrências de Clientes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {openCount > 0 ? (
              <span className="text-red-600 font-medium">{openCount} em aberto</span>
            ) : (
              'Nenhuma em aberto'
            )}
            {respondedCount > 0 && <span className="text-blue-600 font-medium ml-3">{respondedCount} respondida(s)</span>}
          </p>
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48" data-testid="select-filter-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas</SelectItem>
            <SelectItem value="OPEN">Abertas</SelectItem>
            <SelectItem value="ANALYZING">Em análise</SelectItem>
            <SelectItem value="RESPONDED">Respondidas</SelectItem>
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
          {filtered.map(inc => {
            const hasResponse = !!(inc as any).responseMessage;
            return (
              <Card key={inc.id} data-testid={`card-client-incident-${inc.id}`} className="premium-shadow hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelected(inc)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{inc.companyName}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[inc.status] || 'bg-muted text-muted-foreground'}`}>
                          {STATUS_LABEL[inc.status] || inc.status}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {TYPE_LABELS[inc.type] || inc.type}
                        </span>
                        {inc.photoBase64 && <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />}
                        {hasResponse && (
                          <span className="flex items-center gap-1 text-xs text-blue-600">
                            <MessageSquareReply className="w-3 h-3" /> Respondida
                          </span>
                        )}
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
            );
          })}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={() => setSelected(undefined)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ocorrência #{selected?.id?.toString().padStart(4, '0')}</DialogTitle>
          </DialogHeader>
          {selected && <IncidentDetail incident={selected} onClose={() => setSelected(undefined)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
