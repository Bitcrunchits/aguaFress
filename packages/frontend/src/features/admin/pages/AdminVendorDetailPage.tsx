import { useParams } from 'react-router-dom';
import { VendedorEstado } from '@agua/contracts';
import { Button } from '../../../shared/components/Button';
import { Card } from '../../../shared/components/Card';
import EmptyState from '../../../shared/components/EmptyState';
import ErrorState from '../../../shared/components/ErrorState';
import PageSkeleton from '../../../shared/components/PageSkeleton';
import { useAdminVendorDetail } from '../hooks/useAdminVendors';

export default function AdminVendorDetailPage() {
  const { vendedorId } = useParams();
  const { vendor, isLoading, isError, isMutating, errorMessage, refetch, changeEstado } = useAdminVendorDetail(vendedorId);

  if (!vendedorId) return <EmptyState message="No hay información del vendedor" />;

  if (isLoading) return <PageSkeleton />;

  if (isError && !vendor) return <ErrorState message={errorMessage} onRetry={refetch} />;

  if (!vendor) return <EmptyState message="No hay información del vendedor" />;

  const canEnable = vendor.estado === VendedorEstado.PENDIENTE || vendor.estado === VendedorEstado.INACTIVO;
  const nextEstado = canEnable ? VendedorEstado.ACTIVO : VendedorEstado.INACTIVO;
  const actionLabel = canEnable ? 'Habilitar vendedor' : 'Deshabilitar vendedor';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{vendor.nombre}</h1>
        <p className="text-sm text-text-secondary">Detalle administrativo del vendedor.</p>
      </div>

      {errorMessage && <ErrorState message={errorMessage} />}

      <Card>
        <Card.Body className="space-y-3">
          <p><span className="font-medium">Email:</span> {vendor.email}</p>
          <p><span className="font-medium">Estado:</span> {vendor.estado}</p>
          <p><span className="font-medium">Clientes:</span> {vendor.clientesCount}</p>
          <p><span className="font-medium">Registro:</span> {vendor.fechaRegistro}</p>
          <Button disabled={isMutating} onClick={() => changeEstado(nextEstado)}>
            {isMutating ? 'Actualizando...' : actionLabel}
          </Button>
        </Card.Body>
      </Card>
    </div>
  );
}
