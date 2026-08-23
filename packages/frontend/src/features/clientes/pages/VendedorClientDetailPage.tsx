import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../../../shared/components/Button';
import { Card } from '../../../shared/components/Card';
import EmptyState from '../../../shared/components/EmptyState';
import ErrorState from '../../../shared/components/ErrorState';
import PageSkeleton from '../../../shared/components/PageSkeleton';
import { normalizeApiError } from '../../../shared/api-error';
import { useVendedorClientDetail } from '../hooks/useVendedorClients';
import type { VendedorClientDetail, VendedorClientUpdateRequest } from '../services/clientes.service';

interface ClientFormState {
  nombre: string;
  apellido: string;
  telefono: string;
  dni: string;
  direccionFacturacion: string;
}

const EMPTY_FORM: ClientFormState = {
  nombre: '',
  apellido: '',
  telefono: '',
  dni: '',
  direccionFacturacion: '',
};

function getClientName(client: Pick<VendedorClientDetail, 'nombre' | 'apellido'>) {
  return [client.nombre, client.apellido].filter(Boolean).join(' ') || 'Cliente sin nombre';
}

function buildForm(client: VendedorClientDetail): ClientFormState {
  return {
    nombre: client.nombre ?? '',
    apellido: client.apellido ?? '',
    telefono: client.telefono ?? '',
    dni: client.dni ?? '',
    direccionFacturacion: client.direccionFacturacion ?? '',
  };
}

function toOptionalString(value: string) {
  const trimmedValue = value.trim();
  return trimmedValue || undefined;
}

function buildUpdateRequest(form: ClientFormState): VendedorClientUpdateRequest {
  return {
    nombre: toOptionalString(form.nombre),
    apellido: toOptionalString(form.apellido),
    telefono: toOptionalString(form.telefono),
    dni: toOptionalString(form.dni),
    direccionFacturacion: toOptionalString(form.direccionFacturacion),
  };
}

export default function VendedorClientDetailPage() {
  const { clienteId } = useParams();
  const { client, isLoading, isError, isUpdating, errorMessage, refetch, updateClient } = useVendedorClientDetail(clienteId);
  const [form, setForm] = useState<ClientFormState>(EMPTY_FORM);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (client) setForm(buildForm(client));
  }, [client]);

  if (!clienteId) return <EmptyState message="No hay información del cliente" />;
  if (isLoading) return <PageSkeleton />;
  if (isError && !client) return <ErrorState message={errorMessage} onRetry={refetch} />;
  if (!client) return <EmptyState message="No hay información del cliente" />;

  const handleChange = (field: keyof ClientFormState, value: string) => {
    setFeedback(null);
    setSuccessMessage(null);
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    setSuccessMessage(null);

    try {
      await updateClient(buildUpdateRequest(form));
      setSuccessMessage('Cliente actualizado correctamente');
    } catch (error) {
      setFeedback(normalizeApiError(error, 'No se pudo actualizar el cliente').message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{getClientName(client)}</h1>
          <p className="text-sm text-text-secondary">Detalle de cliente de tu cartera.</p>
        </div>
        <Link to="/clientes" className="text-sm font-medium text-brand-teal hover:underline">Volver a clientes</Link>
      </div>

      {errorMessage ? <ErrorState message={errorMessage} /> : null}
      {feedback ? <p role="alert" className="rounded-md border border-error/20 bg-error/5 px-4 py-3 text-sm text-error">{feedback}</p> : null}
      {successMessage ? <p role="status" className="rounded-md border border-brand-teal/20 bg-brand-teal/5 px-4 py-3 text-sm text-brand-teal">{successMessage}</p> : null}

      <Card>
        <Card.Header>
          <h2 className="font-semibold text-text-primary">Perfil</h2>
        </Card.Header>
        <Card.Body className="space-y-6">
          {client.email ? <p><span className="font-medium">Email:</span> {client.email}</p> : null}
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-text-primary">Nombre</span>
              <input aria-label="Nombre" value={form.nombre} onChange={(event) => handleChange('nombre', event.target.value)} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-text-primary">Apellido</span>
              <input aria-label="Apellido" value={form.apellido} onChange={(event) => handleChange('apellido', event.target.value)} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-text-primary">Teléfono</span>
              <input aria-label="Teléfono" value={form.telefono} onChange={(event) => handleChange('telefono', event.target.value)} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-text-primary">DNI</span>
              <input aria-label="DNI" value={form.dni} onChange={(event) => handleChange('dni', event.target.value)} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm" />
            </label>
            <label className="space-y-1 text-sm sm:col-span-2">
              <span className="font-medium text-text-primary">Dirección de facturación</span>
              <input aria-label="Dirección de facturación" value={form.direccionFacturacion} onChange={(event) => handleChange('direccionFacturacion', event.target.value)} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm" />
            </label>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={isUpdating}>{isUpdating ? 'Guardando...' : 'Guardar cliente'}</Button>
            </div>
          </form>
        </Card.Body>
      </Card>
    </div>
  );
}
