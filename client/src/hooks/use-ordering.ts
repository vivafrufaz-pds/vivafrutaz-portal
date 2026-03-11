import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

// ========== ORDER WINDOWS ==========
export function useOrderWindows() {
  return useQuery({
    queryKey: [api.orderWindows.list.path],
    queryFn: async () => {
      const res = await fetch(api.orderWindows.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch order windows");
      return api.orderWindows.list.responses[200].parse(await res.json());
    }
  });
}

export function useActiveOrderWindow() {
  return useQuery({
    queryKey: [api.orderWindows.active.path],
    queryFn: async () => {
      const res = await fetch(api.orderWindows.active.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch active window");
      const data = await res.json();
      return data ? api.orderWindows.active.responses[200].parse(data) : null;
    }
  });
}

export function useCreateOrderWindow() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        weekReference: data.weekReference,
        orderOpenDate: new Date(data.orderOpenDate).toISOString(),
        orderCloseDate: new Date(data.orderCloseDate).toISOString(),
        deliveryStartDate: new Date(data.deliveryStartDate).toISOString(),
        deliveryEndDate: new Date(data.deliveryEndDate).toISOString(),
        active: data.active ?? true,
      };
      const res = await fetch(api.orderWindows.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create order window");
      return api.orderWindows.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.orderWindows.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.orderWindows.active.path] });
      toast({ title: "Janela de pedido criada com sucesso!" });
    }
  });
}

// ========== ORDERS ==========
export function useOrders() {
  return useQuery({
    queryKey: [api.orders.list.path],
    queryFn: async () => {
      const res = await fetch(api.orders.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch orders");
      return api.orders.list.responses[200].parse(await res.json());
    }
  });
}

export function useCompanyOrders(companyId?: number) {
  return useQuery({
    queryKey: [api.orders.companyOrders.path, companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const url = buildUrl(api.orders.companyOrders.path, { companyId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch company orders");
      return api.orders.companyOrders.responses[200].parse(await res.json());
    },
    enabled: !!companyId,
  });
}

export function useOrderDetail(orderId?: number) {
  return useQuery({
    queryKey: [api.orders.get.path, orderId],
    queryFn: async () => {
      if (!orderId) return null;
      const url = buildUrl(api.orders.get.path, { id: orderId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) return null;
      return api.orders.get.responses[200].parse(await res.json());
    },
    enabled: !!orderId,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(api.orders.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create order");
      return api.orders.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.orders.companyOrders.path] });
      toast({ title: "Pedido realizado com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao enviar pedido", variant: "destructive" });
    }
  });
}

// ========== REPORTS ==========
export function usePurchasingReport() {
  return useQuery({
    queryKey: [api.reports.purchasing.path],
    queryFn: async () => {
      const res = await fetch(api.reports.purchasing.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch purchasing report");
      return api.reports.purchasing.responses[200].parse(await res.json());
    }
  });
}

export function useFinancialReport() {
  return useQuery({
    queryKey: [api.reports.financial.path],
    queryFn: async () => {
      const res = await fetch(api.reports.financial.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch financial report");
      return api.reports.financial.responses[200].parse(await res.json());
    }
  });
}
