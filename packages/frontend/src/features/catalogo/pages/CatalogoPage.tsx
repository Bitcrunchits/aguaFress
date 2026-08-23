import { Card } from '../../../shared/components/Card';
import EmptyState from '../../../shared/components/EmptyState';
import ErrorState from '../../../shared/components/ErrorState';
import PageSkeleton from '../../../shared/components/PageSkeleton';
import { ClienteProviderSelector } from '../../clientes/components/ClienteProviderSelector';
import ProductCard from '../../productos/components/ProductCard';
import { useCatalogo } from '../hooks/useCatalogo';

export default function CatalogoPage() {
  const {
    providers,
    selectedProvider,
    selectedVendedorId,
    isProviderSelectionRequired,
    products,
    pagination,
    categories,
    brands,
    isLoading,
    isError,
    errorMessage,
    refetch,
    selectProvider,
    isSelectingProvider,
    addProductToCart,
    isAddingToCart,
    mutationErrorMessage,
  } = useCatalogo();

  if (isLoading) return <PageSkeleton />;

  if (isError) {
    return <ErrorState message={errorMessage} onRetry={refetch} />;
  }

  if (providers.length === 0) {
    return <EmptyState message="Todavía no tenés proveedores activos" />;
  }

  if (isProviderSelectionRequired) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Catálogo</h1>
          <p className="text-sm text-text-secondary">Seleccioná un proveedor para ver sus productos.</p>
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Catálogo</h1>
        <p className="text-sm text-text-secondary">
          Productos reales de {selectedProvider?.empresa ?? selectedProvider?.nombre ?? 'tu proveedor'}.
        </p>
      </div>

      <Card>
        <Card.Body className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-text-primary">Proveedor seleccionado</p>
            <p className="text-sm text-text-secondary">{selectedProvider?.nombre} {selectedProvider?.apellido ?? ''}</p>
          </div>
          <p className="text-sm text-text-muted">
            {categories.length} categorías · {brands.length} marcas
          </p>
        </Card.Body>
      </Card>

      {mutationErrorMessage && <p role="alert" className="text-sm text-error">{mutationErrorMessage}</p>}

      {products.length === 0 ? (
        <EmptyState message="Este proveedor no tiene productos disponibles" />
      ) : (
        <>
          {pagination && (
            <p className="text-sm text-text-muted">
              {pagination.total} productos · página {pagination.page} de {pagination.totalPages}
            </p>
          )}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                canAddToCart={Boolean(selectedVendedorId)}
                isAddingToCart={isAddingToCart}
                onAddToCart={(selectedProduct) => addProductToCart({ productoId: selectedProduct.id, cantidad: 1 })}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
