import type { ClienteProviderResponse, SelectClienteProviderRequest } from '@agua/contracts';
import { Button } from '../../../shared/components/Button';
import { Card } from '../../../shared/components/Card';

interface ClienteProviderSelectorProps {
  providers: readonly ClienteProviderResponse[];
  selectedVendedorId?: string;
  isSelectingProvider?: boolean;
  onSelectProvider: (request: SelectClienteProviderRequest) => Promise<unknown>;
}

export function ClienteProviderSelector({
  providers,
  selectedVendedorId,
  isSelectingProvider = false,
  onSelectProvider,
}: ClienteProviderSelectorProps) {
  return (
    <Card>
      <Card.Header>
        <h2 className="text-lg font-semibold text-text-primary">Seleccioná un proveedor</h2>
        <p className="text-sm text-text-secondary">Elegí con qué vendedor querés operar antes de continuar.</p>
      </Card.Header>
      <Card.Body className="grid gap-3 md:grid-cols-2">
        {providers.map((provider) => {
          const providerName = provider.empresa ?? `${provider.nombre} ${provider.apellido ?? ''}`.trim();
          const isSelected = provider.id === selectedVendedorId;

          return (
            <div key={provider.id} className="rounded-lg border border-surface-hover p-4">
              <p className="font-medium text-text-primary">{providerName}</p>
              <p className="text-sm text-text-secondary">{provider.nombre} {provider.apellido ?? ''}</p>
              <Button
                type="button"
                className="mt-3"
                size="sm"
                variant={isSelected ? 'default' : 'outline'}
                disabled={isSelectingProvider || isSelected}
                onClick={() => onSelectProvider({ vendedorId: provider.id })}
              >
                {isSelected ? 'Proveedor seleccionado' : `Seleccionar ${providerName}`}
              </Button>
            </div>
          );
        })}
      </Card.Body>
    </Card>
  );
}
