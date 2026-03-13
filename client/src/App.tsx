import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";

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

import ClientDashboard from "@/pages/client/dashboard";
import ClientCreateOrder from "@/pages/client/create-order";
import ClientOrderHistory from "@/pages/client/order-history";
import ClientSpecialOrder from "@/pages/client/special-order";

// Auth Guard Wrapper
function ProtectedRoute({ component: Component, role }: { component: any, role?: 'admin' | 'client' }) {
  const { isAuthenticated, isStaff, isClient, isLoading } = useAuth();

  if (isLoading) return <div className="h-screen flex items-center justify-center text-primary font-bold text-xl animate-pulse">Loading VivaFrutaz...</div>;
  if (!isAuthenticated) return <Redirect to="/login" />;
  if (role === 'admin' && !isStaff) return <Redirect to="/client" />;
  if (role === 'client' && !isClient) return <Redirect to="/admin" />;

  return <Component />;
}

// Initial Redirector
function HomeRoute() {
  const { isAuthenticated, isStaff, isClient, isLoading } = useAuth();
  if (isLoading) return <div className="h-screen flex items-center justify-center text-primary font-bold text-xl animate-pulse">Loading...</div>;
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
        {() => <ProtectedRoute component={AdminDashboard} role="admin" />}
      </Route>
      <Route path="/admin/companies">
        {() => <ProtectedRoute component={AdminCompanies} role="admin" />}
      </Route>
      <Route path="/admin/products">
        {() => <ProtectedRoute component={AdminProducts} role="admin" />}
      </Route>
      <Route path="/admin/categories">
        {() => <ProtectedRoute component={AdminCategories} role="admin" />}
      </Route>
      <Route path="/admin/price-groups">
        {() => <ProtectedRoute component={AdminPriceGroups} role="admin" />}
      </Route>
      <Route path="/admin/order-windows">
        {() => <ProtectedRoute component={AdminOrderWindows} role="admin" />}
      </Route>
      <Route path="/admin/order-exceptions">
        {() => <ProtectedRoute component={AdminOrderExceptions} role="admin" />}
      </Route>
      <Route path="/admin/orders">
        {() => <ProtectedRoute component={AdminOrders} role="admin" />}
      </Route>
      <Route path="/admin/purchasing">
        {() => <ProtectedRoute component={PurchasingReport} role="admin" />}
      </Route>
      <Route path="/admin/industrialized">
        {() => <ProtectedRoute component={IndustrializedReport} role="admin" />}
      </Route>
      <Route path="/admin/financial">
        {() => <ProtectedRoute component={FinancialReport} role="admin" />}
      </Route>
      <Route path="/admin/password-reset-requests">
        {() => <ProtectedRoute component={PasswordResetRequestsPage} role="admin" />}
      </Route>
      <Route path="/admin/special-orders">
        {() => <ProtectedRoute component={AdminSpecialOrders} role="admin" />}
      </Route>
      <Route path="/admin/users">
        {() => <ProtectedRoute component={AdminUsers} role="admin" />}
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

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
