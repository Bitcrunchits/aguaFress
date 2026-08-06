import { OrderEstado, type ClienteResponse, type OrderListResponse, type VendedorResponse } from '@agua/contracts';
import { listOrders } from '../../ordenes/services/ordenes.service';
import { listVendorQrCodes } from '../../qr/services/qr.service';
import api from '../../../services/api';
import type { VendedorDashboardData, VendedorDashboardMetrics } from '../types';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

function isCurrentMonth(date: string): boolean {
  const orderDate = new Date(date);
  const now = new Date();

  return orderDate.getFullYear() === now.getFullYear()
    && orderDate.getMonth() === now.getMonth();
}

function buildMetrics(clientes: ClienteResponse[], orders: OrderListResponse[], activeQrCount: number): VendedorDashboardMetrics {
  const monthlySales = orders
    .filter((order) => order.estado === OrderEstado.ENTREGADO && isCurrentMonth(order.createdAt))
    .reduce((total, order) => total + order.total, 0);

  return {
    totalClientes: clientes.length.toString(),
    pendingOrders: orders.filter((order) => order.estado === OrderEstado.PENDIENTE).length.toString(),
    monthlySales: formatCurrency(monthlySales),
    activeQr: activeQrCount.toString(),
  };
}

export async function getVendedorDashboard(): Promise<VendedorDashboardData> {
  const [clientesResponse, vendedorResponse, orders, qrCodes] = await Promise.all([
    api.get<ClienteResponse[]>('/clientes/list'),
    api.get<VendedorResponse>('/vendedores/profile'),
    listOrders({ page: 1, limit: 5 }),
    listVendorQrCodes(),
  ]);

  const clientes = clientesResponse.data;

  return {
    clientes,
    vendedor: vendedorResponse.data,
    recentOrders: orders,
    metrics: buildMetrics(
      clientes,
      orders,
      qrCodes.data.filter((qr) => qr.activo !== false).length
    ),
  };
}
