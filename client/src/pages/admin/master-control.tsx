import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Users, KeyRound, Shield, Lock, Unlock, Eye, EyeOff, Activity, RotateCcw } from 'lucide-react';
import type { User } from '@shared/schema';

const ROLES = ['MASTER', 'ADMIN', 'DIRECTOR', 'DEVELOPER', 'OPERATIONS_MANAGER', 'PURCHASE_MANAGER', 'FINANCEIRO', 'LOGISTICS'];
const ROLE_LABELS: Record<string, string> = {
  MASTER: 'Master',
  ADMIN: 'Administrador',
  DIRECTOR: 'Diretor',
  DEVELOPER: 'Desenvolvedor',
  OPERATIONS_MANAGER: 'Gerente de Operações',
  PURCHASE_MANAGER: 'Gerente de Compras',
  FINANCEIRO: 'Financeiro',
  LOGISTICS: 'Logística',
};

export default function MasterControl() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [resetPasswordId, setResetPasswordId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/master/users'],
  });

  const { data: logs = [] } = useQuery<any[]>({
    queryKey: ['/api/master/logs'],
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: any }) =>
      apiRequest('PATCH', `/api/master/users/${id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master/users'] });
      toast({ title: 'Usuário atualizado com sucesso' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ userId, newPassword }: { userId: number; newPassword: string }) =>
      apiRequest('POST', '/api/master/reset-password', { userId, newPassword }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master/users'] });
      toast({ title: 'Senha resetada com sucesso' });
      setResetPasswordId(null);
      setNewPassword('');
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const unlockMutation = useMutation({
    mutationFn: (userId: number) => apiRequest('POST', '/api/master/unlock-user', { userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master/users'] });
      toast({ title: 'Conta desbloqueada' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  if (user?.role !== 'MASTER') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-16 h-16 text-destructive mx-auto mb-4" />
          <p className="text-xl font-bold text-foreground">Acesso Restrito</p>
          <p className="text-muted-foreground mt-1">Esta área é exclusiva para usuários MASTER.</p>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  const masterLogs = logs.filter(l => l.action?.startsWith('MASTER_'));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-lg">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Controle Master</h1>
          <p className="text-sm text-muted-foreground">Acesso administrativo total ao sistema VivaFrutaz</p>
        </div>
        <Badge className="ml-auto bg-purple-100 text-purple-800 border-purple-200">
          MASTER ACCESS
        </Badge>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl dark:bg-amber-900/20 dark:border-amber-800">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>Atenção:</strong> Todas as ações realizadas neste painel são registradas automaticamente no log de auditoria do sistema.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total de Usuários', value: users.length, icon: Users, color: 'text-blue-600 bg-blue-50' },
          { label: 'Ativos', value: users.filter(u => u.active).length, icon: Activity, color: 'text-green-600 bg-green-50' },
          { label: 'Bloqueados', value: users.filter(u => u.isLocked).length, icon: Lock, color: 'text-red-600 bg-red-50' },
          { label: 'Ações Master', value: masterLogs.length, icon: Shield, color: 'text-purple-600 bg-purple-50' },
        ].map(stat => (
          <div key={stat.label} className="bg-card rounded-xl border border-border/50 p-4">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* User Management */}
      <div className="bg-card rounded-2xl border border-border/50">
        <div className="p-5 border-b border-border/50 flex items-center gap-3">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-foreground">Gestão de Usuários</h2>
          <div className="ml-auto">
            <Input
              placeholder="Buscar usuário..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-56 h-8 text-sm"
              data-testid="input-master-user-search"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando usuários...</div>
        ) : (
          <div className="divide-y divide-border/50">
            {filteredUsers.map(u => (
              <div key={u.id} className="p-4 flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground text-sm">{u.name}</p>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${u.role === 'MASTER' ? 'bg-purple-50 text-purple-700 border-purple-200' : ''}`}
                      data-testid={`badge-role-${u.id}`}
                    >
                      {ROLE_LABELS[u.role] || u.role}
                    </Badge>
                    {u.isLocked && <Badge variant="destructive" className="text-[10px]">Bloqueado</Badge>}
                    {!u.active && <Badge variant="secondary" className="text-[10px]">Inativo</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{u.email}</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Change role - protect from downgrading other MASTER users */}
                  {!(u.role === 'MASTER' && u.id !== user.id) && (
                    <Select
                      value={u.role}
                      onValueChange={role => updateUserMutation.mutate({ id: u.id, updates: { role } })}
                    >
                      <SelectTrigger
                        className="h-8 text-xs w-44"
                        data-testid={`select-role-${u.id}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map(r => (
                          <SelectItem key={r} value={r} data-testid={`option-role-${r}-${u.id}`}>
                            {ROLE_LABELS[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Toggle active */}
                  <Button
                    type="button"
                    size="sm"
                    variant={u.active ? 'outline' : 'secondary'}
                    className="h-8 text-xs"
                    onClick={() => updateUserMutation.mutate({ id: u.id, updates: { active: !u.active } })}
                    disabled={u.id === user.id}
                    data-testid={`button-toggle-active-${u.id}`}
                  >
                    {u.active ? 'Desativar' : 'Ativar'}
                  </Button>

                  {/* Unlock */}
                  {u.isLocked && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => unlockMutation.mutate(u.id)}
                      data-testid={`button-unlock-${u.id}`}
                    >
                      <Unlock className="w-3 h-3 mr-1" />
                      Desbloquear
                    </Button>
                  )}

                  {/* Reset password */}
                  {resetPasswordId === u.id ? (
                    <div className="flex items-center gap-1">
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Nova senha"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          className="h-8 text-xs w-32 pr-7"
                          data-testid={`input-new-password-${u.id}`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                        >
                          {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => resetPasswordMutation.mutate({ userId: u.id, newPassword })}
                        disabled={!newPassword || resetPasswordMutation.isPending}
                        data-testid={`button-confirm-reset-${u.id}`}
                      >
                        Confirmar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs"
                        onClick={() => { setResetPasswordId(null); setNewPassword(''); }}
                        data-testid={`button-cancel-reset-${u.id}`}
                      >
                        ✕
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => { setResetPasswordId(u.id); setNewPassword(''); }}
                      data-testid={`button-reset-password-${u.id}`}
                    >
                      <KeyRound className="w-3 h-3 mr-1" />
                      Resetar Senha
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Nenhum usuário encontrado
              </div>
            )}
          </div>
        )}
      </div>

      {/* Master Action Logs */}
      {masterLogs.length > 0 && (
        <div className="bg-card rounded-2xl border border-border/50">
          <div className="p-5 border-b border-border/50 flex items-center gap-3">
            <Activity className="w-5 h-5 text-purple-500" />
            <h2 className="font-bold text-foreground">Log de Ações Master</h2>
            <Badge variant="outline" className="ml-auto">{masterLogs.length} ação{masterLogs.length !== 1 ? 'ões' : ''}</Badge>
          </div>
          <div className="divide-y divide-border/50 max-h-64 overflow-y-auto">
            {masterLogs.slice(0, 50).map((log: any) => (
              <div key={log.id} className="px-5 py-3 flex items-start gap-3">
                <RotateCcw className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{log.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {log.userEmail} • {log.createdAt ? new Date(log.createdAt).toLocaleString('pt-BR') : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
