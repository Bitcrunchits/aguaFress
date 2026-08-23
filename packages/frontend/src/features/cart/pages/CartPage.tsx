import { useState, type FormEvent } from 'react';
import { MetodoPago, OrderJobStatus, type CreateOrderV2Request } from '@agua/contracts';
import { Card } from '../../../shared/components/Card';
import { Button } from '../../../shared/components/Button';
import EmptyState from '../../../shared/components/EmptyState';
import ErrorState from '../../../shared/components/ErrorState';
import PageSkeleton from '../../../shared/components/PageSkeleton';
import { ClienteProviderSelector } from '../../clientes/components/ClienteProviderSelector';
import { useCart } from '../hooks/useCart';

interface CheckoutFormState {
  calle: string;
  numero: string;
  ciudad: string;
  provincia: string;
  observaciones: string;
}

const INITIAL_CHECKOUT_FORM: CheckoutFormState = {
  calle: '',
  numero: '',
  ciudad: '',
  provincia: '',
  observaciones: '',
};

export default function CartPage() {
  const [checkoutForm, setCheckoutForm] = useState<CheckoutFormState>(INITIAL_CHECKOUT_FORM);
  const [checkoutValidationError, setCheckoutValidationError] = useState<string>();
  const {
    providers,
    selectedProvider,
    selectedVendedorId,
    isProviderSelectionRequired,
    cart,
    isLoading,
    isError,
    isMutating,
    isCheckingOut,
    errorMessage,
    mutationErrorMessage,
    checkoutErrorMessage,
    checkoutJob,
    refetch,
    selectProvider,
    isSelectingProvider,
    updateItem,
    deleteItem,
    checkoutOrder,
  } = useCart();

  const updateCheckoutField = (field: keyof CheckoutFormState, value: string) => {
    setCheckoutForm((current) => ({ ...current, [field]: value }));
  };

  const submitCheckout = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedVendedorId || !cart || cart.items.length === 0) {
      setCheckoutValidationError('Seleccioná un proveedor y cargá productos antes de confirmar el pedido.');
      return;
    }

    if (!checkoutForm.calle.trim() || !checkoutForm.numero.trim() || !checkoutForm.ciudad.trim() || !checkoutForm.provincia.trim()) {
      setCheckoutValidationError('Completá calle, número, ciudad y provincia.');
      return;
    }

    setCheckoutValidationError(undefined);

    const request: CreateOrderV2Request = {
      vendedorId: selectedVendedorId,
      metodoPago: MetodoPago.CONTRA_ENTREGA,
      direccion: {
        calle: checkoutForm.calle.trim(),
        numero: checkoutForm.numero.trim(),
        ciudad: checkoutForm.ciudad.trim(),
        provincia: checkoutForm.provincia.trim(),
      },
      ...(checkoutForm.observaciones.trim() ? { observaciones: checkoutForm.observaciones.trim() } : {}),
    };

    await checkoutOrder(request);
  };

  const isCheckoutPending = checkoutJob !== undefined && ![
    OrderJobStatus.COMPLETED,
    OrderJobStatus.FAILED,
    OrderJobStatus.DEAD_LETTER,
  ].includes(checkoutJob.status);

  if (isLoading) return <PageSkeleton />;

  if (isError) {
    return <ErrorState message={errorMessage} onRetry={refetch} />;
  }

  if (providers.length === 0) {
    return <EmptyState message="Seleccioná un proveedor antes de usar el carrito" />;
  }

  if (isProviderSelectionRequired) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Carrito</h1>
          <p className="text-sm text-text-secondary">Seleccioná un proveedor antes de usar el carrito.</p>
        </div>
        <ClienteProviderSelector
          providers={providers}
          selectedVendedorId={selectedVendedorId}
          isSelectingProvider={isSelectingProvider}
          onSelectProvider={selectProvider}
        />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return <EmptyState message="Tu carrito está vacío" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Carrito</h1>
        <p className="text-sm text-text-secondary">Proveedor: {selectedProvider?.empresa ?? selectedProvider?.nombre}</p>
      </div>

      <Card>
        <Card.Body className="divide-y divide-gray-100">
          {cart.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div>
                <p className="font-medium text-text-primary">{item.nombre}</p>
                <p className="text-sm text-text-secondary">{item.cantidad} × ${item.precioUnitario}</p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isMutating || item.cantidad <= 1}
                  onClick={() => updateItem({
                    cartId: cart.id,
                    productoId: item.productoId,
                    cantidad: item.cantidad - 1,
                    vendedorId: cart.vendedorId,
                  })}
                >
                  -
                </Button>
                <p className="font-semibold text-text-primary">${item.subtotal}</p>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isMutating}
                  onClick={() => updateItem({
                    cartId: cart.id,
                    productoId: item.productoId,
                    cantidad: item.cantidad + 1,
                    vendedorId: cart.vendedorId,
                  })}
                >
                  +
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isMutating}
                  onClick={() => deleteItem({ cartId: cart.id, productoId: item.productoId, vendedorId: cart.vendedorId })}
                >
                  Quitar
                </Button>
              </div>
            </div>
          ))}
        </Card.Body>
        <Card.Footer>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-text-primary">Total</span>
              <span className="text-xl font-bold text-text-primary">${cart.total}</span>
            </div>
            {mutationErrorMessage && <p className="text-sm text-error">{mutationErrorMessage}</p>}
          </div>
        </Card.Footer>
      </Card>

      <Card>
        <Card.Header>
          <h2 className="font-semibold text-text-primary">Checkout</h2>
        </Card.Header>
        <Card.Body>
          <form className="space-y-4" onSubmit={submitCheckout}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm font-medium text-text-primary">
                Calle
                <input
                  value={checkoutForm.calle}
                  onChange={(event) => updateCheckoutField('calle', event.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
                />
              </label>
              <label className="space-y-1 text-sm font-medium text-text-primary">
                Número
                <input
                  value={checkoutForm.numero}
                  onChange={(event) => updateCheckoutField('numero', event.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
                />
              </label>
              <label className="space-y-1 text-sm font-medium text-text-primary">
                Ciudad
                <input
                  value={checkoutForm.ciudad}
                  onChange={(event) => updateCheckoutField('ciudad', event.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
                />
              </label>
              <label className="space-y-1 text-sm font-medium text-text-primary">
                Provincia
                <input
                  value={checkoutForm.provincia}
                  onChange={(event) => updateCheckoutField('provincia', event.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
                />
              </label>
            </div>
            <label className="block space-y-1 text-sm font-medium text-text-primary">
              Observaciones
              <textarea
                value={checkoutForm.observaciones}
                onChange={(event) => updateCheckoutField('observaciones', event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
              />
            </label>
            {checkoutValidationError && <p role="alert" className="text-sm text-error">{checkoutValidationError}</p>}
            {checkoutErrorMessage && <p role="alert" className="text-sm text-error">{checkoutErrorMessage}</p>}
            {checkoutJob?.status === OrderJobStatus.FAILED && (
              <p role="alert" className="text-sm text-error">{checkoutJob.errorMessage ?? 'No se pudo crear el pedido'}</p>
            )}
            {checkoutJob?.status === OrderJobStatus.DEAD_LETTER && (
              <p role="alert" className="text-sm text-error">{checkoutJob.errorMessage ?? 'El pedido no pudo completarse'}</p>
            )}
            {isCheckoutPending && (
              <p className="text-sm text-text-secondary">Procesando pedido {checkoutJob.trackingId} · Estado: {checkoutJob.status}</p>
            )}
            {checkoutJob?.status === OrderJobStatus.COMPLETED && checkoutJob.orderId && (
              <p className="text-sm font-medium text-success">Pedido creado: {checkoutJob.orderId}</p>
            )}
            <Button type="submit" disabled={isCheckingOut || isCheckoutPending || isMutating}>
              {isCheckingOut || isCheckoutPending ? 'Procesando pedido' : 'Confirmar pedido'}
            </Button>
          </form>
        </Card.Body>
      </Card>
    </div>
  );
}
