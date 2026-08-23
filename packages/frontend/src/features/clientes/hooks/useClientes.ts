import { UserRole } from '@agua/contracts';
import { useQuery } from '@tanstack/react-query';
import { normalizeApiError } from '../../../shared/api-error';
import { useAuth } from '../../auth/hooks/useAuth';
import { listCarteraClientes, listClientes } from '../services/clientes.service';

const CLIENTES_QUERY_KEYS = {
  list: (role?: UserRole) => ['clientes', 'list', role] as const,
} as const;

export function useClientes() {
  const { user } = useAuth();
  const clientesQuery = useQuery({
    queryKey: CLIENTES_QUERY_KEYS.list(user?.role),
    queryFn: () => (user?.role === UserRole.SUPER_ADMIN ? listClientes() : listCarteraClientes()),
    enabled: user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.VENDEDOR,
    staleTime: 30_000,
  });

  return {
    clientes: clientesQuery.data?.data ?? [],
    pagination: clientesQuery.data?.pagination ?? null,
    isLoading: clientesQuery.isLoading,
    isError: clientesQuery.isError,
    errorMessage: clientesQuery.error
      ? normalizeApiError(clientesQuery.error, 'No se pudieron cargar los clientes').message
      : undefined,
    refetch: clientesQuery.refetch,
  };
}
