import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLocation, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { 
  Leaf, LayoutDashboard, Users, Package, Tag, 
  CalendarDays, ShoppingCart, BarChart3, PieChart, LogOut, Receipt,
  ShieldCheck, Factory, FolderOpen, KeyRound, Star, UserCog, HardDrive, FlaskConical,
  ClipboardList, AlertTriangle, Building2, Truck, FileText, TrendingUp, UserCircle, Megaphone, TrendingDown, ShoppingBag, Warehouse, Mail, Settings, Brain, GraduationCap, DollarSign, Route
} from 'lucide-react';

import { VirtualAssistant } from './VirtualAssistant';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, company, isStaff, isClient, logout } = useAuth();
  const [location] = useLocation();

  const { data: testModeData } = useQuery<{ enabled: boolean }>({
    queryKey: ['/api/settings/test-mode'],
    staleTime: 30000,
    enabled: isStaff,
  });
  const testModeActive = testModeData?.enabled ?? false;

  const { data: logoData } = useQuery<{ logoBase64: string; logoType: string }>({
    queryKey: ['/api/company-config/logo'],
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const adminLinks = [
    { href: '/admin', label: 'Painel', icon: LayoutDashboard, roles: ['ADMIN', 'DIRECTOR', 'LOGISTICS'], tabKey: 'dashboard' },
    { href: '/admin/companies', label: 'Empresas', icon: Users, roles: ['ADMIN', 'DIRECTOR'], tabKey: 'companies' },
    { href: '/admin/products', label: 'Produtos', icon: Package, roles: ['ADMIN', 'DIRECTOR'], tabKey: 'products' },
    { href: '/admin/categories', label: 'Categorias', icon: FolderOpen, roles: ['ADMIN', 'DIRECTOR'], tabKey: 'categories' },
    { href: '/admin/price-groups', label: 'Grupos de Preço', icon: Tag, roles: ['ADMIN', 'DIRECTOR'], tabKey: 'price-groups' },
    { href: '/admin/order-windows', label: 'Janelas de Pedido', icon: CalendarDays, roles: ['ADMIN', 'OPERATIONS_MANAGER', 'DIRECTOR'], tabKey: 'order-windows' },
    { href: '/admin/order-exceptions', label: 'Exceções de Pedido', icon: ShieldCheck, roles: ['ADMIN', 'DIRECTOR'], tabKey: 'order-exceptions' },
    { href: '/admin/orders', label: 'Pedidos', icon: ShoppingCart, roles: ['ADMIN', 'OPERATIONS_MANAGER', 'FINANCEIRO', 'DIRECTOR', 'LOGISTICS'], tabKey: 'orders' },
    { href: '/admin/purchasing', label: 'Compras', icon: BarChart3, roles: ['ADMIN', 'PURCHASE_MANAGER', 'DIRECTOR'], tabKey: 'purchasing' },
    { href: '/admin/industrialized', label: 'Industrializados', icon: Factory, roles: ['ADMIN', 'PURCHASE_MANAGER', 'DIRECTOR'], tabKey: 'industrialized' },
    { href: '/admin/financial', label: 'Painel Financeiro', icon: PieChart, roles: ['ADMIN', 'FINANCEIRO', 'DIRECTOR'], tabKey: 'financial' },
    { href: '/admin/password-reset-requests', label: 'Senhas de Clientes', icon: KeyRound, roles: ['ADMIN', 'DIRECTOR'], tabKey: 'password-reset' },
    { href: '/admin/special-orders', label: 'Pedidos Pontuais', icon: Star, roles: ['ADMIN', 'OPERATIONS_MANAGER', 'DIRECTOR', 'DEVELOPER', 'LOGISTICS'], tabKey: 'special-orders' },
    { href: '/admin/users', label: 'Usuários do Sistema', icon: UserCog, roles: ['ADMIN', 'DEVELOPER', 'DIRECTOR'], tabKey: 'users' },
    { href: '/admin/backups', label: 'Backup & E-mails', icon: HardDrive, roles: ['ADMIN', 'DEVELOPER', 'DIRECTOR'], tabKey: 'backups' },
    { href: '/admin/developer', label: 'Área do Desenvolvedor', icon: ShieldCheck, roles: ['DEVELOPER', 'ADMIN', 'DIRECTOR'], tabKey: 'developer' },
    { href: '/admin/tasks', label: 'Tarefas', icon: ClipboardList, roles: ['ADMIN', 'DIRECTOR', 'DEVELOPER', 'OPERATIONS_MANAGER', 'PURCHASE_MANAGER', 'FINANCEIRO', 'LOGISTICS'], tabKey: 'tasks' },
    { href: '/admin/client-incidents', label: 'Ocorrências de Clientes', icon: Building2, roles: ['ADMIN', 'DIRECTOR', 'DEVELOPER', 'OPERATIONS_MANAGER', 'LOGISTICS'], tabKey: 'incidents' },
    { href: '/admin/internal-incidents', label: 'Ocorrências Internas', icon: AlertTriangle, roles: ['ADMIN', 'DIRECTOR', 'DEVELOPER', 'OPERATIONS_MANAGER', 'LOGISTICS'], tabKey: 'internal-incidents' },
    { href: '/admin/logistics', label: 'Logística', icon: Truck, roles: ['ADMIN', 'DIRECTOR', 'DEVELOPER', 'OPERATIONS_MANAGER', 'LOGISTICS'], tabKey: 'logistics' },
    { href: '/admin/quotations', label: 'Cotação de Empresas', icon: FileText, roles: ['ADMIN', 'DIRECTOR', 'DEVELOPER', 'OPERATIONS_MANAGER'], tabKey: 'quotations' },
    { href: '/admin/executive', label: 'Dashboard Executivo', icon: TrendingUp, roles: ['ADMIN', 'DIRECTOR', 'FINANCEIRO', 'DEVELOPER'], tabKey: 'executive' },
    { href: '/admin/support', label: 'Configuração de Suporte', icon: ShieldCheck, roles: ['ADMIN', 'DEVELOPER', 'DIRECTOR'], tabKey: 'support' },
    { href: '/admin/announcements', label: 'Painel de Avisos', icon: Megaphone, roles: ['ADMIN', 'DIRECTOR', 'DEVELOPER'], tabKey: 'announcements' },
    { href: '/admin/waste-control', label: 'Controle de Desperdício', icon: TrendingDown, roles: ['ADMIN', 'DIRECTOR', 'DEVELOPER', 'OPERATIONS_MANAGER', 'PURCHASE_MANAGER', 'LOGISTICS'], tabKey: 'waste-control' },
    { href: '/admin/purchase-planning', label: 'Planejamento de Compras', icon: ShoppingBag, roles: ['ADMIN', 'DIRECTOR', 'DEVELOPER', 'PURCHASE_MANAGER', 'OPERATIONS_MANAGER'], tabKey: 'purchase-planning' },
    { href: '/admin/inventory', label: 'Estoque / Inventário', icon: Warehouse, roles: ['ADMIN', 'DIRECTOR', 'DEVELOPER', 'PURCHASE_MANAGER'], tabKey: 'inventory' },
    { href: '/admin/email-management', label: 'Central de E-mails', icon: Mail, roles: ['ADMIN', 'DIRECTOR', 'DEVELOPER', 'OPERATIONS_MANAGER'], tabKey: 'email-management' },
    { href: '/admin/smtp-config', label: 'Configuração SMTP', icon: Settings, roles: ['ADMIN', 'DIRECTOR', 'DEVELOPER'], tabKey: 'smtp-config' },
    { href: '/admin/about-us', label: 'Quem Somos Nós', icon: Building2, roles: ['ADMIN', 'DIRECTOR', 'DEVELOPER', 'OPERATIONS_MANAGER', 'PURCHASE_MANAGER', 'FINANCEIRO', 'LOGISTICS'], tabKey: 'about-us' },
    { href: '/admin/intelligence', label: 'IA Operacional', icon: Brain, roles: ['ADMIN', 'DIRECTOR', 'DEVELOPER', 'OPERATIONS_MANAGER', 'PURCHASE_MANAGER', 'LOGISTICS'], tabKey: 'intelligence' },
    { href: '/admin/commercial-intelligence', label: 'Inteligência Comercial', icon: Users, roles: ['ADMIN', 'DIRECTOR', 'DEVELOPER', 'OPERATIONS_MANAGER'], tabKey: 'commercial-intelligence' },
    { href: '/admin/financial-intelligence', label: 'Inteligência Financeira', icon: DollarSign, roles: ['ADMIN', 'DIRECTOR', 'DEVELOPER', 'FINANCEIRO'], tabKey: 'financial-intelligence' },
    { href: '/admin/logistics-intelligence', label: 'Inteligência Logística', icon: Route, roles: ['ADMIN', 'DIRECTOR', 'DEVELOPER', 'OPERATIONS_MANAGER', 'PURCHASE_MANAGER', 'LOGISTICS'], tabKey: 'logistics-intelligence' },
    { href: '/admin/flora-training', label: 'Treinar Flora', icon: GraduationCap, roles: ['ADMIN', 'DIRECTOR', 'DEVELOPER'], tabKey: 'flora-training' },
  ];

  const clientLinks = [
    { href: '/client', label: 'Início', icon: LayoutDashboard },
    { href: '/client/order', label: 'Novo Pedido', icon: ShoppingCart },
    { href: '/client/history', label: 'Histórico de Pedidos', icon: Receipt },
    { href: '/client/special-order', label: 'Pedidos Pontuais', icon: Star },
    { href: '/client/incidents', label: 'Ocorrências', icon: AlertTriangle },
    { href: '/client/profile', label: 'Perfil da Empresa', icon: UserCircle },
    { href: '/client/about-us', label: 'Quem Somos Nós', icon: Building2 },
  ];

  const userTabPerms = user?.tabPermissions as string[] | null | undefined;
  const links = isStaff 
    ? adminLinks.filter(l => {
        if (!l.roles.includes(user?.role || '')) return false;
        if (!userTabPerms || userTabPerms.length === 0) return true; // null = no restriction
        return userTabPerms.includes(l.tabKey);
      })
    : isClient ? clientLinks : [];

  const roleLabel = (role?: string) => {
    switch (role) {
      case 'ADMIN': return 'Administrador';
      case 'OPERATIONS_MANAGER': return 'Gerente de Operações';
      case 'PURCHASE_MANAGER': return 'Gerente de Compras';
      case 'DEVELOPER': return 'Desenvolvedor';
      case 'FINANCEIRO': return 'Financeiro';
      case 'DIRECTOR': return 'Diretor';
      case 'LOGISTICS': return 'Logística';
      default: return role || '';
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-card border-r border-border/50 flex-shrink-0 flex flex-col z-10 premium-shadow relative">
        <div className="p-6 flex items-center gap-3 border-b border-border/50">
          <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center shadow-lg shadow-primary/25">
            {logoData?.logoBase64 ? (
              <img
                src={`data:${logoData.logoType};base64,${logoData.logoBase64}`}
                alt="Logo"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                <Leaf className="w-6 h-6 text-primary-foreground" />
              </div>
            )}
          </div>
          <div>
            <h1 className="font-display font-bold text-xl tracking-tight text-foreground leading-none">VivaFrutaz</h1>
            <p className="text-xs text-muted-foreground font-medium mt-1">Portal B2B</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location === link.href;
            return (
              <Link 
                key={link.href} 
                href={link.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-sm ${
                  isActive 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-primary' : ''}`} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border/50">
          <div className="px-4 py-3 bg-muted/30 rounded-xl mb-3">
            <p className="text-sm font-bold text-foreground truncate">
              {isStaff ? user?.name : company?.companyName}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {isStaff ? roleLabel(user?.role) : company?.contactName}
            </p>
          </div>
          <button 
            data-testid="button-logout"
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors font-medium text-sm"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      <VirtualAssistant />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {testModeActive && (
          <div className="flex items-center justify-center gap-2 bg-amber-400 text-amber-900 px-4 py-2 text-sm font-bold shrink-0 z-20">
            <FlaskConical className="w-4 h-4" />
            MODO TESTE ATIVO — Pedidos criados não afetam dados reais
            <FlaskConical className="w-4 h-4" />
          </div>
        )}
        <header className="h-16 border-b border-border/50 bg-card/50 backdrop-blur-sm flex items-center px-8 shrink-0 z-0">
          <h2 className="text-lg font-bold text-foreground">
            {links.find(l => l.href === location)?.label || 'Painel'}
          </h2>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
