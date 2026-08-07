import { useState } from 'react';
import { VendedorEstado } from '@agua/contracts';
import { Button } from '../../../shared/components/Button';
import { Card } from '../../../shared/components/Card';
import EmptyState from '../../../shared/components/EmptyState';
import ErrorState from '../../../shared/components/ErrorState';
import PageSkeleton from '../../../shared/components/PageSkeleton';
import { useAdminVendors } from '../hooks/useAdminVendors';
import { useAdminInvitationLinks, useAdminQrCodes } from '../hooks/useAdminQrLinks';

export const ADMIN_QR_LINK_KIND = {
  QR: 'qr',
  LINKS: 'links',
} as const;

export type AdminQrLinkKind = (typeof ADMIN_QR_LINK_KIND)[keyof typeof ADMIN_QR_LINK_KIND];

interface AdminQrLinksPageProps {
  kind: AdminQrLinkKind;
}

export default function AdminQrLinksPage({ kind }: AdminQrLinksPageProps) {
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const isQrPage = kind === ADMIN_QR_LINK_KIND.QR;
  const title = isQrPage ? 'QR Codes' : 'Invitation Links';
  const prerequisiteLabel = isQrPage ? 'QR codes' : 'invitation links';
  const vendorsQuery = useAdminVendors({ estado: VendedorEstado.ACTIVO, page: 1, limit: 20 });
  const qrQuery = useAdminQrCodes({ vendedorId: isQrPage ? selectedVendorId : '', page: 1, limit: 20 });
  const linksQuery = useAdminInvitationLinks({ vendedorId: isQrPage ? '' : selectedVendorId, page: 1, limit: 20 });
  const isLoadingItems = isQrPage ? qrQuery.isLoading : linksQuery.isLoading;
  const isError = isQrPage ? qrQuery.isError : linksQuery.isError;
  const errorMessage = isQrPage ? qrQuery.errorMessage : linksQuery.errorMessage;
  const itemCount = isQrPage ? qrQuery.qrCodes.length : linksQuery.links.length;

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
                  <p className="font-medium text-text-primary">{qr.url}</p>
                  <p className="text-xs text-text-muted">Vendedor: {qr.vendedorId}</p>
                </div>
                <Button variant="ghost" size="sm" disabled={qrQuery.isMutating} onClick={() => qrQuery.deactivateQr(qr.id)}>
                  Desactivar
                </Button>
              </div>
            ))
          : linksQuery.links.map((link) => (
              <div key={link.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="font-medium text-text-primary">{link.linkUrl}</p>
                  <p className="text-xs text-text-muted">Vendedor: {link.vendedorId}</p>
                </div>
                <Button variant="ghost" size="sm" disabled={linksQuery.isMutating} onClick={() => linksQuery.deactivateLink(link.id)}>
                  Desactivar
                </Button>
              </div>
            ))}
      </div>
    );
  };

  if (vendorsQuery.isLoading) return <PageSkeleton />;
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
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">Seleccionar vendedor</option>
              {vendorsQuery.vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>{vendor.nombre} {vendor.apellido ?? ''}</option>
              ))}
            </select>
          </label>
          {vendorsQuery.vendors.length === 0 && <p className="text-sm text-text-secondary">No hay vendedores activos disponibles.</p>}
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
