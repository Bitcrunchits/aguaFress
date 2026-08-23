import { useQuery } from '@tanstack/react-query';
import { getVendedorDashboard } from '../services/vendedor-dashboard.service';

export function useVendedorDashboard() {
  const dashboardQuery = useQuery({
    queryKey: ['vendedor', 'dashboard'],
    queryFn: getVendedorDashboard,
    staleTime: 30_000,
  });

  return {
    clientes: dashboardQuery.data?.clientes ?? [],
    vendedor: dashboardQuery.data?.vendedor ?? null,
    recentOrders: dashboardQuery.data?.recentOrders ?? [],
    metrics: dashboardQuery.data?.metrics ?? {
      totalClientes: '0',
      pendingOrders: '0',
      monthlySales: '$0',
      activeQr: '0',
    },
    isLoading: dashboardQuery.isLoading,
    isError: dashboardQuery.isError,
    error: dashboardQuery.error,
    refetch: dashboardQuery.refetch,
  };
}
