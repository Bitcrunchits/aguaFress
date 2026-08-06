import { useState } from 'react';
import type { ProductResponse } from '@agua/contracts';
import EmptyState from '../../../shared/components/EmptyState';
import ErrorState from '../../../shared/components/ErrorState';
import { Spinner } from '../../../shared/components/Spinner';
import ProductCard from '../components/ProductCard';
import ProductForm from '../components/ProductForm';
import { useProductos } from '../hooks/useProductos';

export default function ProductosPage() {
  const [editingProduct, setEditingProduct] = useState<ProductResponse | null>(null);
  const {
    products,
    pagination,
    categories,
    brands,
    isLoading,
    isError,
    isMutating,
    error,
    refetch,
    createProduct,
    updateProduct,
    toggleActive,
    deleteProduct,
  } = useProductos();

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-text-secondary">Cargando productos...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : 'Error al cargar productos'}
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Productos</h1>
          <p className="text-sm text-text-secondary">
            Catálogo real servido por el API Gateway.
          </p>
        </div>
        {pagination && (
          <p className="text-sm text-text-muted">
            {pagination.total} productos · página {pagination.page} de {pagination.totalPages}
          </p>
        )}
      </div>

      <ProductForm
        brands={brands}
        categories={categories}
        isSubmitting={isMutating}
        mode="create"
        onCreate={createProduct}
      />

      {editingProduct && (
        <ProductForm
          key={editingProduct.id}
          brands={brands}
          categories={categories}
          isSubmitting={isMutating}
          mode="edit"
          product={editingProduct}
          onCancel={() => setEditingProduct(null)}
          onUpdate={(request) => updateProduct({ id: editingProduct.id, request })}
        />
      )}

      {products.length === 0 && <EmptyState message="No hay productos para mostrar" />}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            isMutating={isMutating}
            onEdit={setEditingProduct}
            onToggleActive={({ id, activo }) => toggleActive({ id, activo: !activo })}
            onDelete={deleteProduct}
          />
        ))}
      </div>
    </div>
  );
}
