import { Card } from '../../../shared/components/Card';
import { Button } from '../../../shared/components/Button';
import EmptyState from '../../../shared/components/EmptyState';
import ErrorState from '../../../shared/components/ErrorState';
import PageSkeleton from '../../../shared/components/PageSkeleton';
import { useQrLinks } from '../hooks/useQrLinks';

export default function QRPage() {
  const {
    qrCodes,
    links,
    latestQr,
    latestLink,
    isLoading,
    isError,
    isMutating,
    errorMessage,
    refetch,
    createQr,
    createLink,
    deactivateQr,
    deactivateLink,
  } = useQrLinks();

  if (isLoading) return <PageSkeleton />;

  if (isError) {
    return <ErrorState message={errorMessage} onRetry={refetch} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">QR y links de invitación</h1>
          <p className="text-sm text-text-secondary">Invitaciones conectadas al gateway</p>
        </div>
        <div className="flex gap-2">
          <Button disabled={isMutating} onClick={() => createQr()}>Crear QR</Button>
          <Button variant="outline" disabled={isMutating} onClick={() => createLink()}>Crear link</Button>
        </div>
      </div>

      {(latestQr || latestLink) && (
        <Card>
          <Card.Body>
            {latestQr && <p className="text-sm text-text-secondary">Nuevo QR: {latestQr.url}</p>}
            {latestLink && <p className="text-sm text-text-secondary">Nuevo link: {latestLink.linkUrl}</p>}
          </Card.Body>
        </Card>
      )}

      {qrCodes.length === 0 && links.length === 0 ? (
        <EmptyState message="Todavía no hay invitaciones activas" />
      ) : null}

      <Card>
        <Card.Header>
          <h2 className="font-semibold text-text-primary">Códigos QR</h2>
        </Card.Header>
        <Card.Body className="divide-y divide-gray-100">
          {qrCodes.map((qr) => (
            <div key={qr.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div>
                <p className="font-medium text-text-primary">{qr.url}</p>
                <p className="text-sm text-text-secondary">Expira: {qr.expiresAt}</p>
              </div>
              <Button variant="ghost" size="sm" disabled={isMutating} onClick={() => deactivateQr(qr.id)}>
                Desactivar
              </Button>
            </div>
          ))}
        </Card.Body>
      </Card>

      <Card>
        <Card.Header>
          <h2 className="font-semibold text-text-primary">Links</h2>
        </Card.Header>
        <Card.Body>
          <div className="divide-y divide-gray-100">
            {links.map((link) => (
              <div key={link.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="font-medium text-text-primary">{link.linkUrl}</p>
                  <p className="text-sm text-text-secondary">Token: {link.token}</p>
                </div>
                <Button variant="ghost" size="sm" disabled={isMutating} onClick={() => deactivateLink(link.id)}>
                  Desactivar
                </Button>
              </div>
            ))}
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}
