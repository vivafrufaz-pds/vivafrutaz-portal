import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { HardDrive, Plus, Download, RefreshCw, CheckCircle, WifiOff } from "lucide-react";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

export default function BackupsPage() {
  const { data: backups, isLoading, refetch } = useQuery<{ filename: string; size: number; createdAt: string }[]>({
    queryKey: ['/api/admin/backups'],
  });
  const { data: mailerStatus } = useQuery<{ configured: boolean; smtp: string | null; from: string }>({
    queryKey: ['/api/admin/mailer-status'],
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createBackup = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/backups', { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/backups'] });
      toast({ title: `Backup criado: ${data.filename}` });
    },
    onError: () => toast({ title: "Erro ao criar backup.", variant: "destructive" }),
  });

  const downloadBackup = (filename: string) => {
    const a = document.createElement('a');
    a.href = `/api/admin/backups/${filename}`;
    a.download = filename;
    a.click();
  };

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Backup do Sistema</h1>
          <p className="text-muted-foreground mt-1">Backups automáticos diários às 03h. Mantidos os últimos 30.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="flex items-center gap-2 px-4 py-2.5 border-2 border-border rounded-xl text-sm font-bold hover:bg-muted transition-colors">
            <RefreshCw className="w-4 h-4" /> Atualizar
          </button>
          <button
            data-testid="button-create-backup"
            onClick={() => createBackup.mutate()}
            disabled={createBackup.isPending}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-sm hover:-translate-y-0.5 transition-transform shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> {createBackup.isPending ? "Gerando..." : "Gerar Agora"}
          </button>
        </div>
      </div>

      {/* Email Status Card */}
      <div className={`mb-6 p-5 rounded-2xl border-2 flex items-center gap-4 ${mailerStatus?.configured ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
        {mailerStatus?.configured
          ? <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
          : <WifiOff className="w-6 h-6 text-orange-500 flex-shrink-0" />}
        <div>
          <p className="font-bold text-sm text-foreground">
            {mailerStatus?.configured ? "E-mails automáticos ativos" : "E-mails automáticos não configurados"}
          </p>
          <p className="text-xs text-muted-foreground">
            {mailerStatus?.configured
              ? `Servidor: ${mailerStatus.smtp} · Remetente: ${mailerStatus.from}`
              : "Configure as variáveis SMTP_HOST, SMTP_USER e SMTP_PASS para ativar o envio de e-mails automáticos."}
          </p>
        </div>
      </div>

      {/* Backups list */}
      <div className="bg-card rounded-2xl border border-border/50 premium-shadow overflow-hidden">
        <div className="p-6 border-b border-border/50 bg-muted/20 flex items-center gap-3">
          <HardDrive className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Histórico de Backups</h3>
          <span className="ml-auto text-sm text-muted-foreground font-medium">{backups?.length || 0} arquivo(s)</span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando...</div>
        ) : !backups || backups.length === 0 ? (
          <div className="p-12 text-center">
            <HardDrive className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="font-bold text-foreground">Nenhum backup encontrado</p>
            <p className="text-muted-foreground text-sm mt-1">Clique em "Gerar Agora" para criar o primeiro backup.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {backups.map((b) => (
              <li key={b.filename} data-testid={`row-backup-${b.filename}`}
                className="p-4 flex items-center justify-between hover:bg-muted/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <HardDrive className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-sm">{b.filename}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(b.createdAt)} · {formatBytes(b.size)}</p>
                  </div>
                </div>
                <button
                  data-testid={`button-download-backup-${b.filename}`}
                  onClick={() => downloadBackup(b.filename)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-border text-sm font-bold hover:border-primary/50 hover:bg-primary/5 transition-colors"
                >
                  <Download className="w-4 h-4" /> Baixar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
}
