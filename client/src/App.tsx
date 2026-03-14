import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";

// Keep-alive: ping every 5 minutes to prevent Replit sleep
function KeepAlive() {
  useEffect(() => {
    const ping = () => fetch('/api/health').catch(() => {});
    const id = setInterval(ping, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);
  return null;
}

// Page Imports
import Login from "@/pages/auth/login";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminCompanies from "@/pages/admin/companies";
import AdminProducts from "@/pages/admin/products";
import AdminCategories from "@/pages/admin/categories";
import AdminPriceGroups from "@/pages/admin/price-groups";
import AdminOrderWindows from "@/pages/admin/order-windows";
import AdminOrders from "@/pages/admin/orders";
import AdminOrderExceptions from "@/pages/admin/order-exceptions";
import PurchasingReport from "@/pages/admin/reports/purchasing";
import IndustrializedReport from "@/pages/admin/reports/industrialized";
import FinancialReport from "@/pages/admin/reports/financial";
import PasswordResetRequestsPage from "@/pages/admin/password-reset-requests";

import AdminSpecialOrders from "@/pages/admin/special-orders";
import AdminUsers from "@/pages/admin/users";
import AdminBackups from "@/pages/admin/backups";
import AdminDeveloper from "@/pages/admin/developer";

import AdminTasks from "@/pages/admin/tasks";
import AdminClientIncidents from "@/pages/admin/client-incidents";
import AdminInternalIncidents from "@/pages/admin/internal-incidents";
import AdminLogistics from "@/pages/admin/logistics";
import AdminQuotations from "@/pages/admin/quotations";
import AdminExecutiveDashboard from "@/pages/admin/executive-dashboard";

import ClientDashboard from "@/pages/client/dashboard";
import ClientCreateOrder from "@/pages/client/create-order";
import ClientOrderHistory from "@/pages/client/order-history";
import ClientSpecialOrder from "@/pages/client/special-order";
import ClientIncidents from "@/pages/client/incidents";

// Maintenance screen for blocked clients
function MaintenanceScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-24 h-24 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-8 2" />
            </svg>
          </div>
          <span className="font-display font-bold text-xl text-foreground">VivaFrutaz</span>
        </div>
        <h1 className="text-2xl font-display font-bold text-foreground mt-4">Sistema em Manutenção</h1>
        <p className="text-muted-foreground mt-3 text-base leading-relaxed">
          Sistema VivaFrutaz em manutenção. Retornaremos em breve.
        </p>
        <p className="text-sm text-muted-foreground/70 mt-4">
          Em caso de urgência, entre em contato com a equipe VivaFrutaz.
        </p>
      </div>
    </div>
  );
}

// Auth Guard Wrapper
function ProtectedRoute({
  component: Component,
  role,
  allowedRoles,
}: {
  component: any;
  role?: 'admin' | 'client';
  allowedRoles?: string[];
}) {
  const { isAuthenticated, isStaff, isClient, isLoading, user } = useAuth();
  const [location] = useLocation();

  const { data: maintenance } = useQuery<{ enabled: boolean }>({
    queryKey: ['/api/settings/maintenance'],
    enabled: role === 'client',
    staleTime: 30000,
  });

  if (isLoading) return <div className="h-screen flex items-center justify-center text-primary font-bold text-xl animate-pulse">Carregando VivaFrutaz...</div>;
  if (!isAuthenticated) return <Redirect to="/login" />;
  if (role === 'admin' && !isStaff) return <Redirect to="/client" />;
  if (role === 'client' && !isClient) return <Redirect to="/admin" />;

  // Role-based protection for admin routes
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Log unauthorized access attempt (fire and forget)
    fetch('/api/auth/log-unauthorized', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ route: location }),
      credentials: 'include',
    }).catch(() => {});
    return <Redirect to="/admin" />;
  }

  // Maintenance mode: block clients (not staff)
  if (role === 'client' && maintenance?.enabled) {
    return <MaintenanceScreen />;
  }

  return <Component />;
}

// Initial Redirector
function HomeRoute() {
  const { isAuthenticated, isStaff, isClient, isLoading } = useAuth();
  if (isLoading) return <div className="h-screen flex items-center justify-center text-primary font-bold text-xl animate-pulse">Carregando...</div>;
  if (!isAuthenticated) return <Redirect to="/login" />;
  if (isStaff) return <Redirect to="/admin" />;
  return <Redirect to="/client" />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRoute} />
      <Route path="/login" component={Login} />

      {/* Admin Routes */}
      <Route path="/admin">
        {() => <ProtectedRoute component={AdminDashboard} role="admin" allowedRoles={['ADMIN', 'DIRECTOR', 'DEVELOPER', 'OPERATIONS_MANAGER', 'PURCHASE_MANAGER', 'FINANCEIRO']} />}
      </Route>
      <Route path="/admin/companies">
        {() => <ProtectedRoute component={AdminCompanies} role="admin" allowedRoles={['ADMIN', 'DIRECTOR']} />}
      </Route>
      <Route path="/admin/products">
        {() => <ProtectedRoute component={AdminProducts} role="admin" allowedRoles={['ADMIN', 'DIRECTOR']} />}
      </Route>
      <Route path="/admin/categories">
        {() => <ProtectedRoute component={AdminCategories} role="admin" allowedRoles={['ADMIN', 'DIRECTOR']} />}
      </Route>
      <Route path="/admin/price-groups">
        {() => <ProtectedRoute component={AdminPriceGroups} role="admin" allowedRoles={['ADMIN', 'DIRECTOR']} />}
      </Route>
      <Route path="/admin/order-windows">
        {() => <ProtectedRoute component={AdminOrderWindows} role="admin" allowedRoles={['ADMIN', 'OPERATIONS_MANAGER', 'DIRECTOR']} />}
      </Route>
      <Route path="/admin/order-exceptions">
        {() => <ProtectedRoute component={AdminOrderExceptions} role="admin" allowedRoles={['ADMIN', 'DIRECTOR']} />}
      </Route>
      <Route path="/admin/orders">
        {() => <ProtectedRoute component={AdminOrders} role="admin" allowedRoles={['ADMIN', 'OPERATIONS_MANAGER', 'FINANCEIRO', 'DIRECTOR']} />}
      </Route>
      <Route path="/admin/purchasing">
        {() => <ProtectedRoute component={PurchasingReport} role="admin" allowedRoles={['ADMIN', 'PURCHASE_MANAGER', 'DIRECTOR']} />}
      </Route>
      <Route path="/admin/industrialized">
        {() => <ProtectedRoute component={IndustrializedReport} role="admin" allowedRoles={['ADMIN', 'PURCHASE_MANAGER', 'DIRECTOR']} />}
      </Route>
      <Route path="/admin/financial">
        {() => <ProtectedRoute component={FinancialReport} role="admin" allowedRoles={['ADMIN', 'FINANCEIRO', 'DIRECTOR']} />}
      </Route>
      <Route path="/admin/password-reset-requests">
        {() => <ProtectedRoute component={PasswordResetRequestsPage} role="admin" allowedRoles={['ADMIN', 'DIRECTOR']} />}
      </Route>
      <Route path="/admin/special-orders">
        {() => <ProtectedRoute component={AdminSpecialOrders} role="admin" allowedRoles={['ADMIN', 'OPERATIONS_MANAGER', 'DIRECTOR', 'DEVELOPER']} />}
      </Route>
      <Route path="/admin/users">
        {() => <ProtectedRoute component={AdminUsers} role="admin" allowedRoles={['ADMIN', 'DEVELOPER', 'DIRECTOR']} />}
      </Route>
      <Route path="/admin/backups">
        {() => <ProtectedRoute component={AdminBackups} role="admin" allowedRoles={['ADMIN', 'DEVELOPER', 'DIRECTOR']} />}
      </Route>
      <Route path="/admin/developer">
        {() => <ProtectedRoute component={AdminDeveloper} role="admin" allowedRoles={['DEVELOPER', 'ADMIN', 'DIRECTOR']} />}
      </Route>
      <Route path="/admin/tasks">
        {() => <ProtectedRoute component={AdminTasks} role="admin" allowedRoles={['ADMIN', 'DIRECTOR', 'DEVELOPER', 'OPERATIONS_MANAGER', 'PURCHASE_MANAGER', 'FINANCEIRO']} />}
      </Route>
      <Route path="/admin/client-incidents">
        {() => <ProtectedRoute component={AdminClientIncidents} role="admin" allowedRoles={['ADMIN', 'DIRECTOR', 'DEVELOPER', 'OPERATIONS_MANAGER']} />}
      </Route>
      <Route path="/admin/internal-incidents">
        {() => <ProtectedRoute component={AdminInternalIncidents} role="admin" allowedRoles={['ADMIN', 'DIRECTOR', 'DEVELOPER', 'OPERATIONS_MANAGER']} />}
      </Route>
      <Route path="/admin/logistics">
        {() => <ProtectedRoute component={AdminLogistics} role="admin" allowedRoles={['ADMIN', 'DIRECTOR', 'DEVELOPER', 'OPERATIONS_MANAGER']} />}
      </Route>
      <Route path="/admin/quotations">
        {() => <ProtectedRoute component={AdminQuotations} role="admin" allowedRoles={['ADMIN', 'DIRECTOR', 'DEVELOPER', 'OPERATIONS_MANAGER']} />}
      </Route>
      <Route path="/admin/executive">
        {() => <ProtectedRoute component={AdminExecutiveDashboard} role="admin" allowedRoles={['ADMIN', 'DIRECTOR', 'FINANCEIRO', 'DEVELOPER']} />}
      </Route>

      {/* Client Routes */}
      <Route path="/client">
        {() => <ProtectedRoute component={ClientDashboard} role="client" />}
      </Route>
      <Route path="/client/order">
        {() => <ProtectedRoute component={ClientCreateOrder} role="client" />}
      </Route>
      <Route path="/client/history">
        {() => <ProtectedRoute component={ClientOrderHistory} role="client" />}
      </Route>
      <Route path="/client/special-order">
        {() => <ProtectedRoute component={ClientSpecialOrder} role="client" />}
      </Route>
      <Route path="/client/incidents">
        {() => <ProtectedRoute component={ClientIncidents} role="client" />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <KeepAlive />
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
