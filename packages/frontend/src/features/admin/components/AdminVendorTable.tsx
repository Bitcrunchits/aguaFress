import { Link } from 'react-router-dom';
import type { SuperAdminVendedorItem } from '@agua/contracts';
import { Card } from '../../../shared/components/Card';

interface AdminVendorTableProps {
  vendors: SuperAdminVendedorItem[];
}

export default function AdminVendorTable({ vendors }: AdminVendorTableProps) {
  return (
    <Card>
      <Card.Body className="divide-y divide-gray-100">
        {vendors.map((vendor) => (
          <div key={vendor.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link to={`/admin/vendors/${vendor.id}`} className="font-medium text-brand-teal hover:underline">
                {vendor.nombre} {vendor.apellido ?? ''}
              </Link>
              <p className="text-sm text-text-secondary">{vendor.email}</p>
              <p className="text-xs text-text-muted">{vendor.clientesCount} clientes · {vendor.fechaRegistro}</p>
            </div>
            <span className="self-start rounded-full bg-surface-muted px-2 py-1 text-xs text-text-secondary sm:self-auto">
              {vendor.estado}
            </span>
          </div>
        ))}
      </Card.Body>
    </Card>
  );
}
