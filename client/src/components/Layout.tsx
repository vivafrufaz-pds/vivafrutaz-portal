import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLocation, Link } from 'wouter';
import { 
  Leaf, LayoutDashboard, Users, Package, Tag, 
  CalendarDays, ShoppingCart, BarChart3, PieChart, LogOut, Receipt,
  ShieldCheck, Factory, FolderOpen, KeyRound, Star, UserCog, HardDrive
} from 'lucide-react';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, company, isStaff, isClient, logout } = useAuth();
  const [location] = useLocation();

  const adminLinks = [
    { href: '/admin', label: 'Painel', icon: LayoutDashboard, roles: ['ADMIN'] },
    { href: '/admin/companies', label: 'Empresas', icon: Users, roles: ['ADMIN'] },
    { href: '/admin/products', label: 'Produtos', icon: Package, roles: ['ADMIN'] },
    { href: '/admin/categories', label: 'Categorias', icon: FolderOpen, roles: ['ADMIN'] },
    { href: '/admin/price-groups', label: 'Grupos de Preço', icon: Tag, roles: ['ADMIN'] },
    { href: '/admin/order-windows', label: 'Janelas de Pedido', icon: CalendarDays, roles: ['ADMIN', 'OPERATIONS_MANAGER'] },
    { href: '/admin/order-exceptions', label: 'Exceções de Pedido', icon: ShieldCheck, roles: ['ADMIN'] },
    { href: '/admin/orders', label: 'Pedidos', icon: ShoppingCart, roles: ['ADMIN', 'OPERATIONS_MANAGER'] },
    { href: '/admin/purchasing', label: 'Compras', icon: BarChart3, roles: ['ADMIN', 'PURCHASE_MANAGER'] },
    { href: '/admin/industrialized', label: 'Industrializados', icon: Factory, roles: ['ADMIN', 'PURCHASE_MANAGER'] },
    { href: '/admin/financial', label: 'Painel Financeiro', icon: PieChart, roles: ['ADMIN'] },
    { href: '/admin/password-reset-requests', label: 'Senhas de Clientes', icon: KeyRound, roles: ['ADMIN'] },
    { href: '/admin/special-orders', label: 'Pedidos Pontuais', icon: Star, roles: ['ADMIN', 'OPERATIONS_MANAGER'] },
    { href: '/admin/users', label: 'Usuários do Sistema', icon: UserCog, roles: ['ADMIN', 'DEVELOPER'] },
    { href: '/admin/backups', label: 'Backup & E-mails', icon: HardDrive, roles: ['ADMIN', 'DEVELOPER'] },
  ];

  const clientLinks = [
    { href: '/client', label: 'Início', icon: LayoutDashboard },
    { href: '/client/order', label: 'Novo Pedido', icon: ShoppingCart },
    { href: '/client/history', label: 'Meus Pedidos', icon: Receipt },
    { href: '/client/special-order', label: 'Pedidos Pontuais', icon: Star },
  ];

  const links = isStaff 
    ? adminLinks.filter(l => l.roles.includes(user?.role || ''))
    : isClient ? clientLinks : [];

  const roleLabel = (role?: string) => {
    switch (role) {
      case 'ADMIN': return 'Administrador';
      case 'OPERATIONS_MANAGER': return 'Gerente de Operações';
      case 'PURCHASE_MANAGER': return 'Gerente de Compras';
      case 'DEVELOPER': return 'Desenvolvedor';
      default: return role || '';
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-card border-r border-border/50 flex-shrink-0 flex flex-col z-10 premium-shadow relative">
        <div className="p-6 flex items-center gap-3 border-b border-border/50">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25">
            <Leaf className="w-6 h-6 text-primary-foreground" />
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

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
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
