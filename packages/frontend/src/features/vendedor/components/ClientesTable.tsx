import type { ClienteResponse } from '@agua/contracts';
import { Card } from '../../../shared/components/Card';
import { Spinner } from '../../../shared/components/Spinner';
import ErrorState from '../../../shared/components/ErrorState';
import EmptyState from '../../../shared/components/EmptyState';

interface ClientesTableProps {
  clientes: ClienteResponse[];
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
}

function DesktopTable({ clientes }: { clientes: ClienteResponse[] }) {
  return (
    <div className="hidden overflow-x-auto rounded-lg border border-gray-200 md:block">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-muted text-text-secondary">
          <tr>
            <th className="px-4 py-3 font-medium">Nombre</th>
            <th className="px-4 py-3 font-medium">Teléfono</th>
            <th className="px-4 py-3 font-medium">Dirección</th>
            <th className="px-4 py-3 font-medium">Tipo Factura</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-surface">
          {clientes.map((cliente) => (
            <tr key={cliente.id} className="hover:bg-surface-hover">
              <td className="px-4 py-3 font-medium text-text-primary">
                {[cliente.nombre, cliente.apellido].filter(Boolean).join(' ')}
              </td>
              <td className="px-4 py-3 text-text-secondary">{cliente.telefono || '-'}</td>
              <td className="px-4 py-3 text-text-secondary">{cliente.address || '-'}</td>
              <td className="px-4 py-3">
                <span className="inline-flex rounded-full bg-brand-teal-light/20 px-2 py-0.5 text-xs font-medium text-brand-teal">
                  {cliente.tipoFactura || '-'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MobileCards({ clientes }: { clientes: ClienteResponse[] }) {
  return (
    <div className="space-y-3 md:hidden">
      {clientes.map((cliente) => (
        <Card key={cliente.id}>
          <div className="px-4 py-3">
            <p className="font-medium text-text-primary">
              {[cliente.nombre, cliente.apellido].filter(Boolean).join(' ')}
            </p>
            <div className="mt-2 space-y-1 text-xs text-text-secondary">
              <p>Tel: {cliente.telefono || '-'}</p>
              <p>Dir: {cliente.address || '-'}</p>
              <p>Factura: {cliente.tipoFactura || '-'}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function ClientesTable({ clientes, isLoading, isError, onRetry }: ClientesTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="md" />
      </div>
    );
  }

  if (isError) {
    return <ErrorState message="Error al cargar clientes" onRetry={onRetry} />;
  }

  if (clientes.length === 0) {
    return <EmptyState message="No hay clientes registrados" />;
  }

  return (
    <>
      <DesktopTable clientes={clientes} />
      <MobileCards clientes={clientes} />
    </>
  );
}
