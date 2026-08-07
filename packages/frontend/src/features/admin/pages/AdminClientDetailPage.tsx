import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { TipoFactura, VendedorEstado } from '@agua/contracts';
import { normalizeApiError } from '../../../shared/api-error';
import { Button } from '../../../shared/components/Button';
import { Card } from '../../../shared/components/Card';
import EmptyState from '../../../shared/components/EmptyState';
import ErrorState from '../../../shared/components/ErrorState';
import PageSkeleton from '../../../shared/components/PageSkeleton';
import { useAdminClientDetail } from '../hooks/useAdminClients';
import { useAdminVendors } from '../hooks/useAdminVendors';
import type { AdminClientDetail, AdminClientUpdateRequest } from '../services/admin-clients.service';

const ACTION_STATUS = {
  IDLE: 'idle',
  SUCCESS: 'success',
  ERROR: 'error',
} as const;

type ActionStatus = (typeof ACTION_STATUS)[keyof typeof ACTION_STATUS];

interface ClientFormState {
  nombre: string;
  apellido: string;
  telefono: string;
  dni: string;
  tipoFactura: '' | TipoFactura;
  direccionFacturacion: string;
}

interface FeedbackState {
  status: ActionStatus;
  message: string;
}

const EMPTY_FEEDBACK: FeedbackState = {
  status: ACTION_STATUS.IDLE,
  message: '',
};

function formatClientName(client: Pick<AdminClientDetail, 'nombre' | 'apellido'>) {
  return [client.nombre, client.apellido].filter(Boolean).join(' ') || 'Cliente sin nombre';
}

function formatProviderName(provider: NonNullable<AdminClientDetail['providers']>[number]) {
  return [provider.nombre, provider.apellido].filter(Boolean).join(' ') || provider.empresa || provider.id;
}

function buildInitialForm(client: AdminClientDetail): ClientFormState {
  return {
    nombre: client.nombre ?? '',
    apellido: client.apellido ?? '',
    telefono: client.telefono ?? '',
    dni: client.dni ?? '',
    tipoFactura: client.tipoFactura ?? '',
    direccionFacturacion: client.direccionFacturacion ?? '',
  };
}

function toOptionalString(value: string) {
  const trimmedValue = value.trim();
  return trimmedValue || undefined;
}

function buildUpdateRequest(form: ClientFormState): AdminClientUpdateRequest {
  return {
    nombre: toOptionalString(form.nombre),
    apellido: toOptionalString(form.apellido),
    telefono: toOptionalString(form.telefono),
    dni: toOptionalString(form.dni),
    tipoFactura: form.tipoFactura || undefined,
    direccionFacturacion: toOptionalString(form.direccionFacturacion),
  };
}

export default function AdminClientDetailPage() {
  const { clienteId } = useParams();
  const { client, isLoading, isError, isMutating, errorMessage, refetch, updateClient, reassignClient, addProvider } = useAdminClientDetail(clienteId);
  const { vendors, isLoading: isLoadingVendors, isError: isVendorError, errorMessage: vendorErrorMessage } = useAdminVendors({
    page: 1,
    limit: 100,
    estado: VendedorEstado.ACTIVO,
  });
  const [form, setForm] = useState<ClientFormState>({
    nombre: '',
    apellido: '',
    telefono: '',
    dni: '',
    tipoFactura: '',
    direccionFacturacion: '',
  });
  const [primaryVendorId, setPrimaryVendorId] = useState('');
  const [additionalVendorId, setAdditionalVendorId] = useState('');
  const [feedback, setFeedback] = useState<FeedbackState>(EMPTY_FEEDBACK);

  useEffect(() => {
    if (client) setForm(buildInitialForm(client));
  }, [client]);

  if (!clienteId) return <EmptyState message="No hay información del cliente" />;

  if (isLoading) return <PageSkeleton />;

  if (isError && !client) return <ErrorState message={errorMessage} onRetry={refetch} />;

  if (!client) return <EmptyState message="No hay información del cliente" />;

  const providers = client.providers ?? [];
  const providerIds = new Set(providers.map((provider) => provider.id));
  const additionalVendors = vendors.filter((vendor) => !providerIds.has(vendor.id));
  const hasVendors = vendors.length > 0;
  const hasAdditionalVendors = additionalVendors.length > 0;
  const mutationDisabled = isMutating || isLoadingVendors;

  const handleChange = (field: keyof ClientFormState, value: string) => {
    setFeedback(EMPTY_FEEDBACK);
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  };

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(EMPTY_FEEDBACK);

    try {
      await updateClient(buildUpdateRequest(form));
      setFeedback({ status: ACTION_STATUS.SUCCESS, message: 'Cliente actualizado correctamente' });
    } catch (error) {
      setFeedback({ status: ACTION_STATUS.ERROR, message: normalizeApiError(error, 'No se pudo actualizar el cliente').message });
    }
  };

  const handleReassign = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(EMPTY_FEEDBACK);

    if (!primaryVendorId) {
      setFeedback({ status: ACTION_STATUS.ERROR, message: 'Seleccioná un proveedor principal' });
      return;
    }

    try {
      await reassignClient({ vendedorId: primaryVendorId });
      setFeedback({ status: ACTION_STATUS.SUCCESS, message: 'Cliente reasignado correctamente' });
    } catch (error) {
      setFeedback({ status: ACTION_STATUS.ERROR, message: normalizeApiError(error, 'No se pudo reasignar el cliente').message });
    }
  };

  const handleAddProvider = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(EMPTY_FEEDBACK);

    if (!additionalVendorId) {
      setFeedback({ status: ACTION_STATUS.ERROR, message: 'Seleccioná un proveedor adicional' });
      return;
    }

    try {
      await addProvider({ vendedorId: additionalVendorId });
      setFeedback({ status: ACTION_STATUS.SUCCESS, message: 'Proveedor agregado correctamente' });
      setAdditionalVendorId('');
    } catch (error) {
      setFeedback({ status: ACTION_STATUS.ERROR, message: normalizeApiError(error, 'No se pudo agregar el proveedor').message });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{formatClientName(client)}</h1>
        <p className="text-sm text-text-secondary">Detalle administrativo del cliente.</p>
      </div>

      {errorMessage && <ErrorState message={errorMessage} />}
      {vendorErrorMessage && <ErrorState message={vendorErrorMessage} />}
      {feedback.message && (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            feedback.status === ACTION_STATUS.ERROR
              ? 'border-error/20 bg-error/5 text-error'
              : 'border-brand-teal/20 bg-brand-teal/5 text-brand-teal'
          }`}
          role="status"
        >
          {feedback.message}
        </div>
      )}

      <Card>
        <Card.Header>
          <h2 className="font-semibold text-text-primary">Perfil</h2>
        </Card.Header>
        <Card.Body className="space-y-6">
          {client.email && <p><span className="font-medium">Email:</span> {client.email}</p>}
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleUpdate}>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-text-primary">Nombre</span>
              <input
                aria-label="Nombre"
                value={form.nombre}
                onChange={(event) => handleChange('nombre', event.target.value)}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-text-primary">Apellido</span>
              <input
                aria-label="Apellido"
                value={form.apellido}
                onChange={(event) => handleChange('apellido', event.target.value)}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-text-primary">Teléfono</span>
              <input
                aria-label="Teléfono"
                value={form.telefono}
                onChange={(event) => handleChange('telefono', event.target.value)}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-text-primary">DNI</span>
              <input
                aria-label="DNI"
                value={form.dni}
                onChange={(event) => handleChange('dni', event.target.value)}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-text-primary">Tipo de factura</span>
              <select
                aria-label="Tipo de factura"
                value={form.tipoFactura}
                onChange={(event) => handleChange('tipoFactura', event.target.value)}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="">Sin tipo</option>
                <option value={TipoFactura.A}>A</option>
                <option value={TipoFactura.B}>B</option>
                <option value={TipoFactura.C}>C</option>
              </select>
            </label>
            <label className="space-y-1 text-sm sm:col-span-2">
              <span className="font-medium text-text-primary">Dirección de facturación</span>
              <input
                aria-label="Dirección de facturación"
                value={form.direccionFacturacion}
                onChange={(event) => handleChange('direccionFacturacion', event.target.value)}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              />
            </label>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={mutationDisabled}>Guardar cliente</Button>
            </div>
          </form>
        </Card.Body>
      </Card>

      <Card>
        <Card.Header>
          <h2 className="font-semibold text-text-primary">Proveedores</h2>
        </Card.Header>
        <Card.Body className="space-y-3">
          {providers.length === 0 ? (
            <EmptyState message="No hay proveedores asociados" />
          ) : (
            providers.map((provider) => (
              <div key={provider.id} className="rounded-md border border-gray-100 p-3">
                <p className="font-medium text-text-primary">{formatProviderName(provider)}</p>
                {provider.empresa && <p className="text-sm text-text-secondary">{provider.empresa}</p>}
                {provider.isDefault && (
                  <span className="mt-2 inline-flex rounded-full bg-surface-muted px-2 py-1 text-xs text-text-secondary">
                    Proveedor principal
                  </span>
                )}
              </div>
            ))
          )}
          {isLoadingVendors && <p className="text-sm text-text-secondary">Cargando vendedores elegibles...</p>}
          {!isLoadingVendors && !isVendorError && !hasVendors && (
            <p className="text-sm text-text-secondary">No hay vendedores elegibles para asignar</p>
          )}
          <div className="grid gap-4 border-t border-gray-100 pt-4 lg:grid-cols-2">
            <form className="space-y-3" onSubmit={handleReassign}>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-text-primary">Proveedor principal</span>
                <select
                  aria-label="Proveedor principal"
                  value={primaryVendorId}
                  onChange={(event) => setPrimaryVendorId(event.target.value)}
                  disabled={!hasVendors || mutationDisabled}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar vendedor</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>{vendor.nombre}</option>
                  ))}
                </select>
              </label>
              <Button type="submit" disabled={!hasVendors || mutationDisabled}>Reasignar cliente</Button>
            </form>

            <form className="space-y-3" onSubmit={handleAddProvider}>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-text-primary">Proveedor adicional</span>
                <select
                  aria-label="Proveedor adicional"
                  value={additionalVendorId}
                  onChange={(event) => setAdditionalVendorId(event.target.value)}
                  disabled={!hasAdditionalVendors || mutationDisabled}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar vendedor</option>
                  {additionalVendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>{vendor.nombre}</option>
                  ))}
                </select>
              </label>
              <Button type="submit" disabled={!hasAdditionalVendors || mutationDisabled}>Agregar proveedor</Button>
            </form>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}
