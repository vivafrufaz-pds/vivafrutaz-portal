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
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, AlertTriangle, CheckCircle2, Clock, ImageIcon, MessageSquareReply, Trash2, Camera } from 'lucide-react';
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

const MAX_PHOTOS = 5;
const MAX_SIZE_MB = 5;

interface PhotoEntry {
  base64: string;
  mime: string;
  name: string;
  preview: string;
}

function IncidentForm({ onClose, companyId, companyName }: { onClose: () => void; companyId: number; companyName: string }) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    type: '',
    description: '',
    contactPhone: '',
    contactEmail: '',
  });
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remaining = MAX_PHOTOS - photos.length;
    const toProcess = files.slice(0, remaining);

    if (files.length > remaining) {
      toast({ title: `Máximo de ${MAX_PHOTOS} fotos permitido. Apenas as primeiras ${remaining} foram adicionadas.`, variant: 'destructive' });
    }

    toProcess.forEach(file => {
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        toast({ title: `"${file.name}" excede ${MAX_SIZE_MB}MB e foi ignorado.`, variant: 'destructive' });
        return;
      }
      const reader = new FileReader();
      reader.onload = ev => {
        const result = ev.target?.result as string;
        const [header, base64] = result.split(',');
        const mime = header.match(/:(.*?);/)?.[1] || file.type;
        setPhotos(prev => prev.length < MAX_PHOTOS
          ? [...prev, { base64, mime, name: file.name, preview: result }]
          : prev
        );
      };
      reader.readAsDataURL(file);
    });
    if (fileRef.current) fileRef.current.value = '';
  };

  const removePhoto = (idx: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const createMut = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/client-incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || 'Erro ao registrar ocorrência');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client-incidents'] });
      toast({ title: 'Ocorrência registrada com sucesso. Nossa equipe irá analisar.' });
      onClose();
    },
    onError: (err: any) => toast({
      title: 'Erro ao registrar ocorrência',
      description: err?.message || 'Tente novamente.',
      variant: 'destructive',
    }),
  });

  const handleSubmit = () => {
    if (!form.type || !form.description.trim()) {
      return toast({ title: 'Preencha os campos obrigatórios: tipo e descrição.', variant: 'destructive' });
    }
    const photosJson = photos.length > 0 ? JSON.stringify(photos.map(p => ({ base64: p.base64, mime: p.mime, name: p.name }))) : undefined;
    createMut.mutate({
      companyId,
      companyName,
      ...form,
      photosJson,
      photoBase64: photos[0]?.base64,
      photoMime: photos[0]?.mime,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Tipo de ocorrência *</Label>
        <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
          <SelectTrigger data-testid="select-incident-type" className="mt-1">
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
        <Textarea
          data-testid="input-incident-description"
          value={form.description}
          onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
          placeholder="Descreva o problema com detalhes"
          rows={4}
          className="mt-1"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Número de contato</Label>
          <Input
            data-testid="input-incident-phone"
            value={form.contactPhone}
            onChange={e => setForm(p => ({ ...p, contactPhone: e.target.value }))}
            placeholder="(11) 99999-9999"
            className="mt-1"
          />
        </div>
        <div>
          <Label>Email</Label>
          <Input
            data-testid="input-incident-email"
            type="email"
            value={form.contactEmail}
            onChange={e => setForm(p => ({ ...p, contactEmail: e.target.value }))}
            placeholder="contato@empresa.com"
            className="mt-1"
          />
        </div>
      </div>

      {/* Photos section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Fotos do problema (opcional, máx. {MAX_PHOTOS})</Label>
          <span className="text-xs text-muted-foreground">{photos.length}/{MAX_PHOTOS}</span>
        </div>

        {/* Thumbnails grid */}
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {photos.map((p, idx) => (
              <div key={idx} className="relative group rounded-xl overflow-hidden border-2 border-border aspect-square bg-muted">
                <img
                  src={p.preview}
                  alt={p.name}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(idx)}
                  data-testid={`button-remove-photo-${idx}`}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remover foto"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1.5 py-0.5 truncate">
                  {p.name}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add photos button */}
        {photos.length < MAX_PHOTOS && (
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/2 transition-colors"
            data-testid="upload-incident-photo"
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/jpg,image/jpeg,image/png"
              multiple
              className="hidden"
              onChange={handleFiles}
            />
            <Camera className="w-6 h-6 mx-auto mb-1.5 text-muted-foreground/60" />
            <p className="text-sm font-medium text-muted-foreground">
              {photos.length === 0 ? 'Clique para adicionar fotos' : 'Adicionar mais fotos'}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-0.5">JPG, PNG · máx. {MAX_SIZE_MB}MB por foto</p>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={createMut.isPending}>Cancelar</Button>
        <Button
          data-testid="button-submit-incident"
          onClick={handleSubmit}
          disabled={createMut.isPending}
        >
          {createMut.isPending ? 'Enviando...' : 'Registrar Ocorrência'}
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function ClientIncidentsPage() {
  const { company, isLoading: authLoading } = useAuth();
  const [showForm, setShowForm] = useState(false);

  const { data: incidents = [], isLoading, isError } = useQuery<ClientIncident[]>({
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
      ) : isError ? (
        <div className="text-center py-16 text-muted-foreground">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Não foi possível carregar os dados no momento.</p>
          <p className="text-sm mt-1">Tente novamente em alguns instantes.</p>
        </div>
      ) : incidents.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhuma ocorrência registrada</p>
          <p className="text-sm mt-1">Clique em "Registrar Ocorrência" para enviar um problema</p>
        </div>
      ) : (
        <div className="space-y-3">
          {incidents.map(inc => {
            let parsedPhotos: Array<{ base64: string; mime: string; name: string }> = [];
            try {
              if ((inc as any).photosJson) parsedPhotos = JSON.parse((inc as any).photosJson);
            } catch {}

            return (
              <Card key={inc.id} data-testid={`card-incident-${inc.id}`} className="premium-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-foreground">{TYPE_LABELS[inc.type] || inc.type}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[inc.status] || 'bg-muted text-muted-foreground'}`}>
                          {STATUS_LABEL[inc.status] || inc.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{inc.description}</p>

                      {/* Photo thumbnails (read-only) */}
                      {parsedPhotos.length > 0 && (
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          {parsedPhotos.map((ph, i) => (
                            <img
                              key={i}
                              src={`data:${ph.mime};base64,${ph.base64}`}
                              alt={ph.name}
                              className="w-12 h-12 object-cover rounded-lg border border-border"
                            />
                          ))}
                        </div>
                      )}
                      {/* Legacy single photo */}
                      {parsedPhotos.length === 0 && inc.photoBase64 && (
                        <img
                          src={`data:${inc.photoMime};base64,${inc.photoBase64}`}
                          alt="Foto"
                          className="w-12 h-12 object-cover rounded-lg border border-border mt-2"
                        />
                      )}

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
            );
          })}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
