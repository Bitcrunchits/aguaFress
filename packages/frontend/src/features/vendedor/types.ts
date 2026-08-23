import type { ClienteResponse, OrderListResponse, VendedorResponse } from '@agua/contracts';

export interface VendedorDashboardMetrics {
  totalClientes: string;
  pendingOrders: string;
  monthlySales: string;
  activeQr: string;
}

export interface VendedorDashboardData {
  clientes: ClienteResponse[];
  vendedor: VendedorResponse | null;
  recentOrders: OrderListResponse[];
  metrics: VendedorDashboardMetrics;
}
