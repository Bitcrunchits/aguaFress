import { useState } from 'react';
import { VendedorEstado } from '@agua/contracts';
import { Button } from '../../../shared/components/Button';
import { Card } from '../../../shared/components/Card';
import EmptyState from '../../../shared/components/EmptyState';
import ErrorState from '../../../shared/components/ErrorState';
import PageSkeleton from '../../../shared/components/PageSkeleton';
import { useAdminVendors } from '../hooks/useAdminVendors';
import { useAdminInvitationLinks, useAdminQrCodes } from '../hooks/useAdminQrLinks';

const ACTIVE_VENDOR_SELECTOR_LIMIT = 20;

export const ADMIN_QR_LINK_KIND = {
  QR: 'qr',
  LINKS: 'links',
} as const;

export type AdminQrLinkKind = (typeof ADMIN_QR_LINK_KIND)[keyof typeof ADMIN_QR_LINK_KIND];

interface AdminQrLinksPageProps {
  kind: AdminQrLinkKind;
}

function toOptionalString(value: string) {
  const trimmedValue = value.trim();
  return trimmedValue || undefined;
}

function formatVendorName(vendor: { id: string; nombre: string; apellido?: string; empresa?: string }) {
  return [vendor.nombre, vendor.apellido].filter(Boolean).join(' ') || vendor.empresa || vendor.id;
}

export default function AdminQrLinksPage({ kind }: AdminQrLinksPageProps) {
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [vendorPage, setVendorPage] = useState(1);
  const [vendorSearch, setVendorSearch] = useState('');
  const isQrPage = kind === ADMIN_QR_LINK_KIND.QR;
  const title = isQrPage ? 'QR Codes' : 'Invitation Links';
  const prerequisiteLabel = isQrPage ? 'QR codes' : 'invitation links';
  const vendorsQuery = useAdminVendors({
    estado: VendedorEstado.ACTIVO,
    page: vendorPage,
    limit: ACTIVE_VENDOR_SELECTOR_LIMIT,
    search: toOptionalString(vendorSearch),
  });
  const qrQuery = useAdminQrCodes({ vendedorId: isQrPage ? selectedVendorId : '', page: 1, limit: 20 });
  const linksQuery = useAdminInvitationLinks({ vendedorId: isQrPage ? '' : selectedVendorId, page: 1, limit: 20 });
  const isLoadingItems = isQrPage ? qrQuery.isLoading : linksQuery.isLoading;
  const isError = isQrPage ? qrQuery.isError : linksQuery.isError;
  const errorMessage = isQrPage ? qrQuery.errorMessage : linksQuery.errorMessage;
  const itemCount = isQrPage ? qrQuery.qrCodes.length : linksQuery.links.length;
  const hasPreviousVendorPage = vendorPage > 1;
  const hasNextVendorPage = vendorsQuery.pagination ? vendorPage < vendorsQuery.pagination.totalPages : false;

  const handleVendorSearchChange = (value: string) => {
    setVendorSearch(value);
    setVendorPage(1);
    setSelectedVendorId('');
  };

  const handleVendorPageChange = (page: number) => {
    setVendorPage(page);
    setSelectedVendorId('');
  };

  const renderItems = () => {
    if (!selectedVendorId) return <EmptyState message={`Seleccioná un vendedor para cargar ${prerequisiteLabel}`} />;
    if (isLoadingItems) return <PageSkeleton />;
    if (isError) return <ErrorState message={errorMessage} onRetry={isQrPage ? qrQuery.refetch : linksQuery.refetch} />;
    if (itemCount === 0) return <EmptyState message={`No hay ${title.toLowerCase()} activos para este vendedor`} />;

    return (
      <div className="divide-y divide-gray-100">
        {isQrPage
          ? qrQuery.qrCodes.map((qr) => (
              <div key={qr.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="font-medium text-text-primary">Código: {qr.codigo}</p>
                  <p className="text-xs text-text-muted">Estado: {qr.activo ? 'Activo' : 'Inactivo'}</p>
                  <p className="text-xs text-text-muted">Expira: {qr.expires_at} · Creado: {qr.created_at}</p>
                </div>
                <Button variant="ghost" size="sm" disabled={qrQuery.isMutating} onClick={() => qrQuery.deactivateQr(qr.id)}>
                  Desactivar
                </Button>
              </div>
            ))
          : linksQuery.links.map((link) => (
              <div key={link.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="font-medium text-text-primary">Token: {link.token}</p>
                  <p className="text-xs text-text-muted">Estado: {link.activo ? 'Activo' : 'Inactivo'}</p>
                  <p className="text-xs text-text-muted">Expira: {link.expires_at} · Creado: {link.created_at}</p>
                </div>
                <Button variant="ghost" size="sm" disabled={linksQuery.isMutating} onClick={() => linksQuery.deactivateLink(link.id)}>
                  Desactivar
                </Button>
              </div>
            ))}
      </div>
    );
  };

  if (vendorsQuery.isError) return <ErrorState message={vendorsQuery.errorMessage} onRetry={vendorsQuery.refetch} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
        <p className="text-sm text-text-secondary">Seleccioná un vendedor activo antes de consultar endpoints vendor-scoped.</p>
      </div>

      <Card>
        <Card.Body className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-text-primary">Vendedor</span>
            <select
              aria-label="Vendedor"
              value={selectedVendorId}
              onChange={(event) => setSelectedVendorId(event.target.value)}
              disabled={vendorsQuery.isLoading}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">Seleccionar vendedor</option>
              {vendorsQuery.vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>{formatVendorName(vendor)}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-text-primary">Buscar vendedores activos</span>
            <input
              aria-label="Buscar vendedores activos"
              value={vendorSearch}
              onChange={(event) => handleVendorSearchChange(event.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              placeholder="Nombre, empresa o email"
            />
          </label>
          <div className="flex items-center justify-between gap-3 text-sm text-text-secondary">
            <span>
              Página {vendorPage}{vendorsQuery.pagination ? ` de ${vendorsQuery.pagination.totalPages}` : ''}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hasPreviousVendorPage || vendorsQuery.isLoading}
                onClick={() => handleVendorPageChange(vendorPage - 1)}
              >
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hasNextVendorPage || vendorsQuery.isLoading}
                onClick={() => handleVendorPageChange(vendorPage + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
          {vendorsQuery.isLoading && <p className="text-sm text-text-secondary">Cargando vendedores activos...</p>}
          {!vendorsQuery.isLoading && vendorsQuery.vendors.length === 0 && <p className="text-sm text-text-secondary">No hay vendedores activos disponibles.</p>}
        </Card.Body>
      </Card>

      <Card>
        <Card.Header>
          <h2 className="font-semibold text-text-primary">{title}</h2>
        </Card.Header>
        <Card.Body>{renderItems()}</Card.Body>
      </Card>
    </div>
  );
}
