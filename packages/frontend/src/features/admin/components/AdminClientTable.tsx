import { Link } from 'react-router-dom';
import type { SuperAdminClienteItem } from '@agua/contracts';
import { Card } from '../../../shared/components/Card';

interface AdminClientTableProps {
  clients: SuperAdminClienteItem[];
}

function formatClientName(client: SuperAdminClienteItem) {
  return [client.nombre, client.apellido].filter(Boolean).join(' ');
}

export default function AdminClientTable({ clients }: AdminClientTableProps) {
  return (
    <Card>
      <Card.Body className="divide-y divide-gray-100">
        {clients.map((client) => (
          <div key={client.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link to={`/admin/clients/${client.id}`} className="font-medium text-brand-teal hover:underline">
                {formatClientName(client)}
              </Link>
              <p className="text-sm text-text-secondary">{client.email}</p>
              <p className="text-xs text-text-muted">
                {client.totalPedidos ?? 0} pedidos · {client.fechaAsignacion}
              </p>
            </div>
            {client.telefono && (
              <span className="self-start rounded-full bg-surface-muted px-2 py-1 text-xs text-text-secondary sm:self-auto">
                {client.telefono}
              </span>
            )}
          </div>
        ))}
      </Card.Body>
    </Card>
  );
}
