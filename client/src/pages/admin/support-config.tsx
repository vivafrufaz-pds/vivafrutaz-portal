import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Phone, Mail, MessageSquare, Save, Receipt } from 'lucide-react';
import type { CompanyConfig } from '@shared/schema';

export default function SupportConfigPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    companyName: '',
    fantasyName: '',
    address: '',
    city: '',
    state: '',
    cep: '',
    phone: '',
    email: '',
    cnpj: '',
    stateRegistration: '',
    defaultCfop: '',
    defaultNatureza: '',
    supportPhone: '',
    supportEmail: '',
    supportMessage: '',
  });

  const { data: config, isLoading } = useQuery<CompanyConfig>({
    queryKey: ['/api/company-config'],
    queryFn: async () => {
      const res = await fetch('/api/company-config', { credentials: 'include' });
      if (!res.ok) throw new Error('Erro ao carregar configuração');
      return res.json();
    },
  });

  useEffect(() => {
    if (config) {
      setFormData({
        companyName: config.companyName || '',
        fantasyName: (config as any).fantasyName || '',
        address: config.address || '',
        city: config.city || '',
        state: config.state || '',
        cep: (config as any).cep || '',
        phone: config.phone || '',
        email: config.email || '',
        cnpj: config.cnpj || '',
        stateRegistration: (config as any).stateRegistration || '',
        defaultCfop: (config as any).defaultCfop || '',
        defaultNatureza: (config as any).defaultNatureza || '',
        supportPhone: config.supportPhone || '',
        supportEmail: config.supportEmail || '',
        supportMessage: config.supportMessage || '',
      });
    }
  }, [config]);

  const saveMut = useMutation({
    mutationFn: (data: typeof formData) =>
      apiRequest('PATCH', '/api/company-config', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/company-config'] });
      toast({ title: 'Configurações salvas com sucesso!' });
    },
    onError: () => toast({ title: 'Erro ao salvar', variant: 'destructive' }),
  });

  if (!user || !['ADMIN', 'DIRECTOR', 'DEVELOPER'].includes(user.role)) {
    return <Layout><div className="p-4 text-red-600">Acesso negado</div></Layout>;
  }

  return (
    <Layout>
      <div className="space-y-6 p-6 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold text-primary">Configuração de Suporte</h1>
          <p className="text-gray-600 mt-2">Gerenciar informações de suporte e dados da empresa para DANFE</p>
        </div>

        {isLoading ? (
          <div>Carregando...</div>
        ) : (
          <Card className="premium-shadow">
            <CardContent className="pt-6 space-y-6">
              {/* Company Info */}
              <div>
                <h2 className="text-lg font-semibold mb-4">Informações da Empresa</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="companyName">Razão Social</Label>
                    <Input
                      id="companyName"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      data-testid="input-company-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fantasyName">Nome Fantasia</Label>
                    <Input
                      id="fantasyName"
                      value={formData.fantasyName}
                      onChange={(e) => setFormData({ ...formData, fantasyName: e.target.value })}
                      data-testid="input-fantasy-name"
                      placeholder="VivaFrutaz"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input
                      id="cnpj"
                      value={formData.cnpj}
                      onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                      data-testid="input-cnpj"
                      placeholder="XX.XXX.XXX/0001-XX"
                    />
                  </div>
                  <div>
                    <Label htmlFor="stateRegistration">Inscrição Estadual (IE)</Label>
                    <Input
                      id="stateRegistration"
                      value={formData.stateRegistration}
                      onChange={(e) => setFormData({ ...formData, stateRegistration: e.target.value })}
                      data-testid="input-state-registration"
                      placeholder="000.000.000.000"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="address">Endereço Completo</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      data-testid="input-address"
                      placeholder="Rua, número, complemento"
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      data-testid="input-city"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">Estado (UF)</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      data-testid="input-state"
                      placeholder="SP"
                      maxLength={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cep">CEP</Label>
                    <Input
                      id="cep"
                      value={formData.cep}
                      onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                      data-testid="input-cep"
                      placeholder="00000-000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      data-testid="input-phone"
                      placeholder="(11) 1234-5678"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      data-testid="input-email"
                    />
                  </div>
                </div>

                {/* Fiscal Section */}
                <div className="mt-4 p-4 rounded-xl border-2 border-violet-200 bg-violet-50">
                  <h3 className="text-sm font-bold text-violet-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Receipt className="w-4 h-4" /> Padrões Fiscais (NF-e / DANFE)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="defaultCfop" className="text-violet-700">CFOP Padrão</Label>
                      <Input
                        id="defaultCfop"
                        value={formData.defaultCfop}
                        onChange={(e) => setFormData({ ...formData, defaultCfop: e.target.value })}
                        data-testid="input-default-cfop"
                        placeholder="5102"
                        className="border-violet-200 focus:border-violet-400"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Código Fiscal de Operações padrão (ex: 5102)</p>
                    </div>
                    <div>
                      <Label htmlFor="defaultNatureza" className="text-violet-700">Natureza da Operação</Label>
                      <Input
                        id="defaultNatureza"
                        value={formData.defaultNatureza}
                        onChange={(e) => setFormData({ ...formData, defaultNatureza: e.target.value })}
                        data-testid="input-default-natureza"
                        placeholder="Venda de mercadoria adquirida"
                        className="border-violet-200 focus:border-violet-400"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Texto que aparece no campo Natureza da Operação</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Support Info */}
              <div className="border-t pt-6">
                <h2 className="text-lg font-semibold mb-4">Informações de Suporte</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Label htmlFor="supportPhone">Telefone/WhatsApp de Suporte</Label>
                      <Input
                        id="supportPhone"
                        value={formData.supportPhone}
                        onChange={(e) => setFormData({ ...formData, supportPhone: e.target.value })}
                        data-testid="input-support-phone"
                        placeholder="(11) 1234-5678"
                      />
                    </div>
                    <Phone className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Label htmlFor="supportEmail">E-mail de Suporte</Label>
                      <Input
                        id="supportEmail"
                        type="email"
                        value={formData.supportEmail}
                        onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })}
                        data-testid="input-support-email"
                        placeholder="suporte@vivafrutaz.com"
                      />
                    </div>
                    <Mail className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="md:col-span-2 flex items-start gap-2">
                    <div className="flex-1">
                      <Label htmlFor="supportMessage">Mensagem Padrão de Ajuda (Opcional)</Label>
                      <Textarea
                        id="supportMessage"
                        value={formData.supportMessage}
                        onChange={(e) => setFormData({ ...formData, supportMessage: e.target.value })}
                        data-testid="input-support-message"
                        placeholder="Se precisar de ajuda, entre em contato com nosso suporte..."
                        rows={3}
                        className="resize-none"
                      />
                    </div>
                    <MessageSquare className="w-4 h-4 text-gray-400 mt-8" />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end gap-2 border-t pt-6">
                <Button
                  onClick={() => setFormData(config as any)}
                  variant="outline"
                  disabled={saveMut.isPending}
                  data-testid="button-reset"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => saveMut.mutate(formData)}
                  disabled={saveMut.isPending}
                  data-testid="button-save-config"
                  className="gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saveMut.isPending ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
