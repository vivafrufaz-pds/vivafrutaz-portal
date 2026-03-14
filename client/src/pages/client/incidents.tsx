import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { Layout } from '@/components/Layout';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, AlertTriangle, CheckCircle2, Clock, ImageIcon, MessageSquareReply } from 'lucide-react';
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

function IncidentForm({ onClose, companyId, companyName }: { onClose: () => void; companyId: number; companyName: string }) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    type: '',
    description: '',
    contactPhone: '',
    contactEmail: '',
  });
  const [photoBase64, setPhotoBase64] = useState<string | undefined>();
  const [photoMime, setPhotoMime] = useState<string | undefined>();
  const [photoName, setPhotoName] = useState<string | undefined>();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Imagem muito grande (máx. 5MB)', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const result = ev.target?.result as string;
      const parts = result.split(',');
      setPhotoBase64(parts[1]);
      setPhotoMime(file.type);
      setPhotoName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const createMut = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/client-incidents', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client-incidents'] });
      toast({ title: 'Ocorrência registrada com sucesso!' });
      onClose();
    },
    onError: () => toast({ title: 'Erro ao registrar ocorrência', variant: 'destructive' }),
  });

  const handleSubmit = () => {
    if (!form.type || !form.description) {
      return toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' });
    }
    createMut.mutate({
      companyId,
      companyName,
      ...form,
      photoBase64,
      photoMime,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Tipo de ocorrência *</Label>
        <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
          <SelectTrigger data-testid="select-incident-type">
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Descrição detalhada *</Label>
        <Textarea data-testid="input-incident-description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Descreva o problema com detalhes" rows={4} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Número de contato</Label>
          <Input data-testid="input-incident-phone" value={form.contactPhone} onChange={e => setForm(p => ({ ...p, contactPhone: e.target.value }))} placeholder="(11) 99999-9999" />
        </div>
        <div>
          <Label>Email</Label>
          <Input data-testid="input-incident-email" type="email" value={form.contactEmail} onChange={e => setForm(p => ({ ...p, contactEmail: e.target.value }))} placeholder="contato@empresa.com" />
        </div>
      </div>
      <div>
        <Label>Foto do problema (opcional)</Label>
        <div
          className="mt-1 border-2 border-dashed rounded-xl p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileRef.current?.click()}
          data-testid="upload-incident-photo"
        >
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          {photoName ? (
            <div className="flex items-center justify-center gap-2 text-sm text-primary font-medium">
              <ImageIcon className="w-4 h-4" />
              {photoName}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              <ImageIcon className="w-6 h-6 mx-auto mb-1 opacity-50" />
              Clique para anexar uma foto (máx. 5MB)
            </div>
          )}
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button data-testid="button-submit-incident" onClick={handleSubmit} disabled={createMut.isPending}>
          {createMut.isPending ? 'Enviando...' : 'Registrar Ocorrência'}
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function ClientIncidentsPage() {
  const { company, isLoading: authLoading } = useAuth();
  const [showForm, setShowForm] = useState(false);

  const { data: incidents = [], isLoading } = useQuery<ClientIncident[]>({
    queryKey: ['/api/client-incidents'],
  });

  if (!authLoading && !company) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center mb-4 mx-auto text-3xl">⚠️</div>
          <h2 className="text-xl font-bold text-foreground mb-2">Dados da empresa não encontrados.</h2>
          <p className="text-muted-foreground text-sm max-w-sm">Entre em contato com a equipe VivaFrutaz.</p>
        </div>
      </Layout>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ocorrências</h1>
          <p className="text-sm text-muted-foreground mt-1">Registre e acompanhe suas ocorrências</p>
        </div>
        <Button data-testid="button-new-incident" onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Registrar Ocorrência
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : incidents.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhuma ocorrência registrada</p>
          <p className="text-sm mt-1">Clique em "Registrar Ocorrência" para enviar um problema</p>
        </div>
      ) : (
        <div className="space-y-3">
          {incidents.map(inc => (
            <Card key={inc.id} data-testid={`card-incident-${inc.id}`} className="premium-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-foreground">{TYPE_LABELS[inc.type] || inc.type}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[inc.status]}`}>
                        {STATUS_LABEL[inc.status]}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{inc.description}</p>
                    {(inc as any).responseMessage && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-1.5 mb-1">
                          <MessageSquareReply className="w-3.5 h-3.5 text-blue-600" />
                          <p className="text-xs font-semibold text-blue-700">
                            Resposta oficial da VivaFrutaz
                            {(inc as any).respondedByName && <span className="font-normal text-blue-600"> — {(inc as any).respondedByName}</span>}
                          </p>
                        </div>
                        <p className="text-sm text-blue-900">{(inc as any).responseMessage}</p>
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-muted-foreground">
                      {new Date(inc.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      #{inc.id.toString().padStart(4, '0')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar Ocorrência</DialogTitle>
          </DialogHeader>
          {company && (
            <IncidentForm
              onClose={() => setShowForm(false)}
              companyId={company.id}
              companyName={company.companyName}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
