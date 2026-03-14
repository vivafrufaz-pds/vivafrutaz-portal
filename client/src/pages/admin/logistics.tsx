import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, Truck, User, Wrench, MapPin, Download, CheckCircle2, Clock, XCircle } from 'lucide-react';
import type { LogisticsDriver, LogisticsVehicle, LogisticsRoute, LogisticsMaintenance } from '@shared/schema';

const STATUS_COLOR: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};
const STATUS_LABEL: Record<string, string> = { SCHEDULED: 'Agendado', IN_PROGRESS: 'Em andamento', COMPLETED: 'Concluído', CANCELLED: 'Cancelado' };
const MAINT_TYPE: Record<string, string> = { PREVENTIVE: 'Preventiva', CORRECTIVE: 'Corretiva', INSPECTION: 'Inspeção' };
const VEHICLE_TYPE: Record<string, string> = { VAN: 'Van', TRUCK: 'Caminhão', MOTORCYCLE: 'Moto', CAR: 'Carro' };

// ─── CSV/Excel export helper ─────────────────────────────────────────────────
function exportToCSV(rows: any[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(';'),
    ...rows.map(r => headers.map(h => `"${r[h] ?? ''}"`).join(';'))
  ].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Motoristas Tab ──────────────────────────────────────────────────────────
function DriversTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<LogisticsDriver | undefined>();
  const [form, setForm] = useState({ name: '', cpf: '', phone: '', email: '', licenseNumber: '', notes: '' });

  const { data: drivers = [], isLoading } = useQuery<LogisticsDriver[]>({ queryKey: ['/api/logistics/drivers'] });

  const saveMut = useMutation({
    mutationFn: (data: any) => editItem
      ? apiRequest('PATCH', `/api/logistics/drivers/${editItem.id}`, data)
      : apiRequest('POST', '/api/logistics/drivers', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/logistics/drivers'] }); toast({ title: editItem ? 'Motorista atualizado!' : 'Motorista adicionado!' }); setShowForm(false); },
    onError: (e: any) => toast({ title: e?.message || 'Erro ao salvar', variant: 'destructive' }),
  });

  const delMut = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/logistics/drivers/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/logistics/drivers'] }); toast({ title: 'Motorista excluído' }); },
    onError: () => toast({ title: 'Erro ao excluir', variant: 'destructive' }),
  });

  const openCreate = () => { setEditItem(undefined); setForm({ name: '', cpf: '', phone: '', email: '', licenseNumber: '', notes: '' }); setShowForm(true); };
  const openEdit = (d: LogisticsDriver) => { setEditItem(d); setForm({ name: d.name, cpf: d.cpf || '', phone: d.phone || '', email: d.email || '', licenseNumber: d.licenseNumber || '', notes: d.notes || '' }); setShowForm(true); };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{drivers.length} motoristas cadastrados</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportToCSV(drivers.map(d => ({ Nome: d.name, CPF: d.cpf, Telefone: d.phone, Email: d.email, CNH: d.licenseNumber, Ativo: d.active ? 'Sim' : 'Não' })), 'motoristas.csv')}>
            <Download className="w-4 h-4 mr-1" /> Exportar
          </Button>
          <Button size="sm" onClick={openCreate} data-testid="button-new-driver">
            <Plus className="w-4 h-4 mr-1" /> Motorista
          </Button>
        </div>
      </div>
      {isLoading ? <div className="h-32 bg-muted rounded-xl animate-pulse" /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {drivers.map(d => (
            <Card key={d.id} data-testid={`card-driver-${d.id}`} className="premium-shadow">
              <CardContent className="p-4 flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-sm">{d.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${d.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{d.active ? 'Ativo' : 'Inativo'}</span>
                  </div>
                  {d.phone && <p className="text-xs text-muted-foreground">📞 {d.phone}</p>}
                  {d.licenseNumber && <p className="text-xs text-muted-foreground">CNH: {d.licenseNumber}</p>}
                  {d.cpf && <p className="text-xs text-muted-foreground">CPF: {d.cpf}</p>}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(d)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-600" onClick={() => delMut.mutate(d.id)} disabled={delMut.isPending}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {!isLoading && drivers.length === 0 && <p className="col-span-3 text-center text-muted-foreground py-8">Nenhum motorista cadastrado</p>}
        </div>
      )}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? 'Editar Motorista' : 'Novo Motorista'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input data-testid="input-driver-name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>CPF</Label><Input value={form.cpf} onChange={e => setForm(p => ({ ...p, cpf: e.target.value }))} /></div>
              <div><Label>CNH</Label><Input value={form.licenseNumber} onChange={e => setForm(p => ({ ...p, licenseNumber: e.target.value }))} /></div>
              <div><Label>Telefone</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
            </div>
            <div><Label>Observações</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button data-testid="button-save-driver" onClick={() => { if (!form.name) { toast({ title: 'Nome obrigatório', variant: 'destructive' }); return; } saveMut.mutate(form); }} disabled={saveMut.isPending}>
              {saveMut.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Veículos Tab ────────────────────────────────────────────────────────────
function VehiclesTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<LogisticsVehicle | undefined>();
  const [form, setForm] = useState({ plate: '', model: '', brand: '', year: '', type: 'VAN', capacity: '', notes: '' });

  const { data: vehicles = [], isLoading } = useQuery<LogisticsVehicle[]>({ queryKey: ['/api/logistics/vehicles'] });

  const saveMut = useMutation({
    mutationFn: (data: any) => editItem
      ? apiRequest('PATCH', `/api/logistics/vehicles/${editItem.id}`, data)
      : apiRequest('POST', '/api/logistics/vehicles', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/logistics/vehicles'] }); toast({ title: editItem ? 'Veículo atualizado!' : 'Veículo adicionado!' }); setShowForm(false); },
    onError: (e: any) => toast({ title: e?.message || 'Erro ao salvar', variant: 'destructive' }),
  });

  const delMut = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/logistics/vehicles/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/logistics/vehicles'] }); toast({ title: 'Veículo excluído' }); },
    onError: () => toast({ title: 'Erro ao excluir', variant: 'destructive' }),
  });

  const openCreate = () => { setEditItem(undefined); setForm({ plate: '', model: '', brand: '', year: '', type: 'VAN', capacity: '', notes: '' }); setShowForm(true); };
  const openEdit = (v: LogisticsVehicle) => { setEditItem(v); setForm({ plate: v.plate, model: v.model, brand: v.brand, year: v.year?.toString() || '', type: v.type, capacity: v.capacity || '', notes: v.notes || '' }); setShowForm(true); };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{vehicles.length} veículos cadastrados</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportToCSV(vehicles.map(v => ({ Placa: v.plate, Modelo: v.model, Marca: v.brand, Ano: v.year, Tipo: VEHICLE_TYPE[v.type] || v.type, Capacidade: v.capacity, Ativo: v.active ? 'Sim' : 'Não' })), 'veiculos.csv')}>
            <Download className="w-4 h-4 mr-1" /> Exportar
          </Button>
          <Button size="sm" onClick={openCreate} data-testid="button-new-vehicle">
            <Plus className="w-4 h-4 mr-1" /> Veículo
          </Button>
        </div>
      </div>
      {isLoading ? <div className="h-32 bg-muted rounded-xl animate-pulse" /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {vehicles.map(v => (
            <Card key={v.id} data-testid={`card-vehicle-${v.id}`} className="premium-shadow">
              <CardContent className="p-4 flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-sm font-mono">{v.plate}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${v.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{v.active ? 'Ativo' : 'Inativo'}</span>
                  </div>
                  <p className="text-sm">{v.brand} {v.model} {v.year && `(${v.year})`}</p>
                  <p className="text-xs text-muted-foreground">{VEHICLE_TYPE[v.type] || v.type}{v.capacity && ` — ${v.capacity}`}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(v)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-600" onClick={() => delMut.mutate(v.id)} disabled={delMut.isPending}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {!isLoading && vehicles.length === 0 && <p className="col-span-3 text-center text-muted-foreground py-8">Nenhum veículo cadastrado</p>}
        </div>
      )}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? 'Editar Veículo' : 'Novo Veículo'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Placa *</Label><Input data-testid="input-vehicle-plate" value={form.plate} onChange={e => setForm(p => ({ ...p, plate: e.target.value.toUpperCase() }))} placeholder="ABC-1234" /></div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(VEHICLE_TYPE).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Marca *</Label><Input value={form.brand} onChange={e => setForm(p => ({ ...p, brand: e.target.value }))} /></div>
              <div><Label>Modelo *</Label><Input data-testid="input-vehicle-model" value={form.model} onChange={e => setForm(p => ({ ...p, model: e.target.value }))} /></div>
              <div><Label>Ano</Label><Input type="number" value={form.year} onChange={e => setForm(p => ({ ...p, year: e.target.value }))} /></div>
              <div><Label>Capacidade</Label><Input value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))} placeholder="ex: 1000kg" /></div>
            </div>
            <div><Label>Observações</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button data-testid="button-save-vehicle" onClick={() => { if (!form.plate || !form.model || !form.brand) { toast({ title: 'Placa, modelo e marca obrigatórios', variant: 'destructive' }); return; } saveMut.mutate(form); }} disabled={saveMut.isPending}>
              {saveMut.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Rotas Tab ───────────────────────────────────────────────────────────────
function RoutesTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<LogisticsRoute | undefined>();
  const [filterDriver, setFilterDriver] = useState('ALL');
  const [filterDate, setFilterDate] = useState('');
  const [form, setForm] = useState({ name: '', driverId: '', driverName: '', vehicleId: '', vehiclePlate: '', deliveryDate: '', notes: '', companyNames: '', startTime: '', endTime: '' });

  const { data: routes = [], isLoading } = useQuery<LogisticsRoute[]>({ queryKey: ['/api/logistics/routes'] });
  const { data: drivers = [] } = useQuery<LogisticsDriver[]>({ queryKey: ['/api/logistics/drivers'] });
  const { data: vehicles = [] } = useQuery<LogisticsVehicle[]>({ queryKey: ['/api/logistics/vehicles'] });

  const saveMut = useMutation({
    mutationFn: (data: any) => editItem
      ? apiRequest('PATCH', `/api/logistics/routes/${editItem.id}`, data)
      : apiRequest('POST', '/api/logistics/routes', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/logistics/routes'] }); toast({ title: editItem ? 'Rota atualizada!' : 'Rota criada!' }); setShowForm(false); },
    onError: (e: any) => toast({ title: e?.message || 'Erro', variant: 'destructive' }),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => apiRequest('PATCH', `/api/logistics/routes/${id}`, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/logistics/routes'] }); toast({ title: 'Status atualizado!' }); },
  });

  const delMut = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/logistics/routes/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/logistics/routes'] }); toast({ title: 'Rota excluída' }); },
  });

  const openCreate = () => { setEditItem(undefined); setForm({ name: '', driverId: '', driverName: '', vehicleId: '', vehiclePlate: '', deliveryDate: '', notes: '', companyNames: '', startTime: '', endTime: '' }); setShowForm(true); };
  const openEdit = (r: LogisticsRoute) => { setEditItem(r); setForm({ name: r.name, driverId: r.driverId?.toString() || '', driverName: r.driverName || '', vehicleId: r.vehicleId?.toString() || '', vehiclePlate: r.vehiclePlate || '', deliveryDate: r.deliveryDate || '', notes: r.notes || '', companyNames: r.companyNames || '', startTime: r.startTime || '', endTime: r.endTime || '' }); setShowForm(true); };

  const filtered = routes.filter(r => {
    if (filterDriver !== 'ALL' && r.driverId?.toString() !== filterDriver) return false;
    if (filterDate && r.deliveryDate !== filterDate) return false;
    return true;
  });

  const exportRoutes = () => exportToCSV(filtered.map(r => ({ Rota: r.name, Motorista: r.driverName, Veículo: r.vehiclePlate, 'Data Entrega': r.deliveryDate, Status: STATUS_LABEL[r.status], Empresas: r.companyNames, Início: r.startTime, Fim: r.endTime })), 'rotas.csv');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 justify-between items-end">
        <div className="flex gap-3 flex-wrap items-end">
          <div>
            <Label className="text-xs">Motorista</Label>
            <Select value={filterDriver} onValueChange={setFilterDriver}>
              <SelectTrigger className="w-40 h-8" data-testid="select-filter-driver">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                {drivers.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Data</Label>
            <Input type="date" className="h-8 w-40" value={filterDate} onChange={e => setFilterDate(e.target.value)} data-testid="input-filter-date" />
          </div>
          {(filterDriver !== 'ALL' || filterDate) && <Button variant="ghost" size="sm" className="h-8" onClick={() => { setFilterDriver('ALL'); setFilterDate(''); }}>Limpar</Button>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportRoutes}><Download className="w-4 h-4 mr-1" /> Exportar</Button>
          <Button size="sm" onClick={openCreate} data-testid="button-new-route"><Plus className="w-4 h-4 mr-1" /> Rota</Button>
        </div>
      </div>
      {isLoading ? <div className="h-32 bg-muted rounded-xl animate-pulse" /> : filtered.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground"><MapPin className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>Nenhuma rota encontrada</p></div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <Card key={r.id} data-testid={`card-route-${r.id}`} className="premium-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-sm">{r.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {r.driverName && <span>👤 {r.driverName}</span>}
                      {r.vehiclePlate && <span>🚛 {r.vehiclePlate}</span>}
                      {r.deliveryDate && <span>📅 {new Date(r.deliveryDate).toLocaleDateString('pt-BR')}</span>}
                      {r.startTime && <span>⏰ {r.startTime}{r.endTime && ` – ${r.endTime}`}</span>}
                    </div>
                    {r.companyNames && <p className="text-xs text-muted-foreground">🏢 {r.companyNames}</p>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(r)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-600" onClick={() => delMut.mutate(r.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                    {r.status !== 'COMPLETED' && r.status !== 'CANCELLED' && (
                      <Select value={r.status} onValueChange={s => statusMut.mutate({ id: r.id, status: s })}>
                        <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editItem ? 'Editar Rota' : 'Nova Rota'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome da rota *</Label><Input data-testid="input-route-name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Motorista</Label>
                <Select value={form.driverId} onValueChange={v => { const d = drivers.find(d => d.id.toString() === v); setForm(p => ({ ...p, driverId: v, driverName: d?.name || '' })); }}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {drivers.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Veículo</Label>
                <Select value={form.vehicleId} onValueChange={v => { const vh = vehicles.find(vh => vh.id.toString() === v); setForm(p => ({ ...p, vehicleId: v, vehiclePlate: vh?.plate || '' })); }}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {vehicles.map(v => <SelectItem key={v.id} value={v.id.toString()}>{v.plate} — {v.model}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Data Entrega</Label><Input type="date" value={form.deliveryDate} onChange={e => setForm(p => ({ ...p, deliveryDate: e.target.value }))} /></div>
              <div>
                <Label>Horário Início</Label>
                <Input type="time" value={form.startTime} onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))} />
              </div>
            </div>
            <div><Label>Empresas na rota</Label><Input value={form.companyNames} onChange={e => setForm(p => ({ ...p, companyNames: e.target.value }))} placeholder="ex: Empresa A, Empresa B" /></div>
            <div><Label>Observações</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button data-testid="button-save-route" onClick={() => { if (!form.name) { toast({ title: 'Nome obrigatório', variant: 'destructive' }); return; } saveMut.mutate({ ...form, driverId: form.driverId && form.driverId !== 'none' ? parseInt(form.driverId) : undefined, vehicleId: form.vehicleId && form.vehicleId !== 'none' ? parseInt(form.vehicleId) : undefined, deliveryDate: form.deliveryDate || undefined }); }} disabled={saveMut.isPending}>
              {saveMut.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Manutenção Tab ──────────────────────────────────────────────────────────
function MaintenanceTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<LogisticsMaintenance | undefined>();
  const [form, setForm] = useState({ vehicleId: '', vehiclePlate: '', type: 'PREVENTIVE', description: '', cost: '', scheduledDate: '', notes: '' });

  const { data: maintenances = [], isLoading } = useQuery<LogisticsMaintenance[]>({ queryKey: ['/api/logistics/maintenance'] });
  const { data: vehicles = [] } = useQuery<LogisticsVehicle[]>({ queryKey: ['/api/logistics/vehicles'] });

  const saveMut = useMutation({
    mutationFn: (data: any) => editItem
      ? apiRequest('PATCH', `/api/logistics/maintenance/${editItem.id}`, data)
      : apiRequest('POST', '/api/logistics/maintenance', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/logistics/maintenance'] }); toast({ title: editItem ? 'Manutenção atualizada!' : 'Manutenção criada!' }); setShowForm(false); },
    onError: (e: any) => toast({ title: e?.message || 'Erro', variant: 'destructive' }),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => apiRequest('PATCH', `/api/logistics/maintenance/${id}`, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/logistics/maintenance'] }); toast({ title: 'Status atualizado!' }); },
  });

  const delMut = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/logistics/maintenance/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/logistics/maintenance'] }); toast({ title: 'Manutenção excluída' }); },
  });

  const openCreate = () => { setEditItem(undefined); setForm({ vehicleId: '', vehiclePlate: '', type: 'PREVENTIVE', description: '', cost: '', scheduledDate: '', notes: '' }); setShowForm(true); };
  const openEdit = (m: LogisticsMaintenance) => { setEditItem(m); setForm({ vehicleId: m.vehicleId?.toString() || '', vehiclePlate: m.vehiclePlate || '', type: m.type, description: m.description, cost: m.cost?.toString() || '', scheduledDate: m.scheduledDate || '', notes: m.notes || '' }); setShowForm(true); };

  const exportMaint = () => exportToCSV(maintenances.map(m => ({ Veículo: m.vehiclePlate, Tipo: MAINT_TYPE[m.type] || m.type, Descrição: m.description, Custo: m.cost, 'Data Agendada': m.scheduledDate, Status: STATUS_LABEL[m.status] })), 'manutencao.csv');

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{maintenances.length} registros de manutenção</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportMaint}><Download className="w-4 h-4 mr-1" /> Exportar</Button>
          <Button size="sm" onClick={openCreate} data-testid="button-new-maintenance"><Plus className="w-4 h-4 mr-1" /> Manutenção</Button>
        </div>
      </div>
      {isLoading ? <div className="h-32 bg-muted rounded-xl animate-pulse" /> : maintenances.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground"><Wrench className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>Nenhuma manutenção registrada</p></div>
      ) : (
        <div className="space-y-3">
          {maintenances.map(m => (
            <Card key={m.id} data-testid={`card-maintenance-${m.id}`} className="premium-shadow">
              <CardContent className="p-4 flex items-start justify-between gap-3">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Wrench className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-sm">{MAINT_TYPE[m.type] || m.type}</span>
                    {m.vehiclePlate && <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{m.vehiclePlate}</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[m.status]}`}>{STATUS_LABEL[m.status]}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{m.description}</p>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    {m.scheduledDate && <span>📅 {new Date(m.scheduledDate).toLocaleDateString('pt-BR')}</span>}
                    {m.cost && <span>💰 R$ {parseFloat(m.cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(m)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-600" onClick={() => delMut.mutate(m.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                  {m.status !== 'COMPLETED' && (
                    <Select value={m.status} onValueChange={s => statusMut.mutate({ id: m.id, status: s })}>
                      <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SCHEDULED" className="text-xs">Agendado</SelectItem>
                        <SelectItem value="IN_PROGRESS" className="text-xs">Em andamento</SelectItem>
                        <SelectItem value="COMPLETED" className="text-xs">Concluído</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? 'Editar Manutenção' : 'Nova Manutenção'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Veículo</Label>
                <Select value={form.vehicleId} onValueChange={v => { const vh = vehicles.find(x => x.id.toString() === v); setForm(p => ({ ...p, vehicleId: v, vehiclePlate: vh?.plate || '' })); }}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {vehicles.map(v => <SelectItem key={v.id} value={v.id.toString()}>{v.plate}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo *</Label>
                <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(MAINT_TYPE).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Data Agendada</Label><Input type="date" value={form.scheduledDate} onChange={e => setForm(p => ({ ...p, scheduledDate: e.target.value }))} /></div>
              <div><Label>Custo (R$)</Label><Input type="number" step="0.01" value={form.cost} onChange={e => setForm(p => ({ ...p, cost: e.target.value }))} placeholder="0,00" /></div>
            </div>
            <div><Label>Descrição *</Label><Textarea data-testid="input-maintenance-desc" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
            <div><Label>Observações</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button data-testid="button-save-maintenance" onClick={() => { if (!form.type || !form.description) { toast({ title: 'Tipo e descrição obrigatórios', variant: 'destructive' }); return; } saveMut.mutate({ ...form, vehicleId: form.vehicleId && form.vehicleId !== 'none' ? parseInt(form.vehicleId) : undefined, cost: form.cost || undefined, scheduledDate: form.scheduledDate || undefined }); }} disabled={saveMut.isPending}>
              {saveMut.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function LogisticsPage() {
  const { data: drivers = [] } = useQuery<LogisticsDriver[]>({ queryKey: ['/api/logistics/drivers'] });
  const { data: vehicles = [] } = useQuery<LogisticsVehicle[]>({ queryKey: ['/api/logistics/vehicles'] });
  const { data: routes = [] } = useQuery<LogisticsRoute[]>({ queryKey: ['/api/logistics/routes'] });

  const activeRoutes = routes.filter(r => r.status === 'IN_PROGRESS').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Logística</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie motoristas, veículos, rotas e manutenção</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Motoristas', value: drivers.filter(d => d.active).length, icon: User, color: 'text-blue-600' },
          { label: 'Veículos Ativos', value: vehicles.filter(v => v.active).length, icon: Truck, color: 'text-green-600' },
          { label: 'Rotas Hoje', value: routes.length, icon: MapPin, color: 'text-orange-600' },
          { label: 'Em Andamento', value: activeRoutes, icon: Clock, color: 'text-purple-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="premium-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={`w-8 h-8 ${color}`} />
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="routes">
        <TabsList>
          <TabsTrigger value="routes" data-testid="tab-routes">Rotas</TabsTrigger>
          <TabsTrigger value="drivers" data-testid="tab-drivers">Motoristas</TabsTrigger>
          <TabsTrigger value="vehicles" data-testid="tab-vehicles">Veículos</TabsTrigger>
          <TabsTrigger value="maintenance" data-testid="tab-maintenance">Manutenção</TabsTrigger>
        </TabsList>
        <TabsContent value="routes" className="mt-4"><RoutesTab /></TabsContent>
        <TabsContent value="drivers" className="mt-4"><DriversTab /></TabsContent>
        <TabsContent value="vehicles" className="mt-4"><VehiclesTab /></TabsContent>
        <TabsContent value="maintenance" className="mt-4"><MaintenanceTab /></TabsContent>
      </Tabs>
    </div>
  );
}
