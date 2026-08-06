import { Card } from '../../../shared/components/Card';
import { MetricsCard } from './MetricsCard';
import ClientesTable from './ClientesTable';
import type { VendedorDashboardData } from '../types';

interface VendedorDashboardProps extends VendedorDashboardData {
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

function formatDate(): string {
  return new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const estadoBadge: Record<string, string> = {
  entregado: 'bg-green-100 text-green-700',
  pendiente: 'bg-amber-100 text-amber-700',
  cancelado: 'bg-red-100 text-red-700',
};

export default function VendedorDashboard({
  clientes,
  vendedor,
  recentOrders,
  metrics,
  isLoading,
  isError,
  onRetry,
}: VendedorDashboardProps) {
  const vendedorName = vendedor?.nombre || 'Vendedor';
  const vendedorApellido = vendedor?.apellido || '';
  const empresa = vendedor?.empresa;
  const initial = vendedorName.charAt(0).toUpperCase();

  return (
    <div className="space-y-6">
      {/* ─── Header: logo + nombre del vendedor ─── */}
      <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-surface p-4 shadow-sm">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-teal text-lg font-bold text-white">
          {initial}
        </div>
        <div>
          <h1 className="text-lg font-bold text-text-primary">
            {getGreeting()}, {vendedorName} {vendedorApellido}
          </h1>
          <p className="text-sm text-text-secondary capitalize">{formatDate()}</p>
          {empresa && (
            <p className="mt-0.5 text-xs font-medium text-brand-teal">{empresa}</p>
          )}
        </div>
      </div>

      {/* ─── Métricas principales ─── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricsCard title="Total Clientes" value={metrics.totalClientes} variant="teal" />
        <MetricsCard title="Órdenes Pendientes" value={metrics.pendingOrders} variant="coral" />
        <MetricsCard title="Ventas del Mes" value={metrics.monthlySales} variant="default" />
        <MetricsCard title="QR Activos" value={metrics.activeQr} variant="default" />
      </div>

      {/* ─── Pedidos recientes + Clientes ─── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pedidos recientes */}
        <div>
          <h2 className="mb-3 text-lg font-semibold text-text-primary">
            Últimos pedidos
          </h2>
          <Card>
            <div className="divide-y divide-gray-100">
              {recentOrders.length === 0 ? (
                <p className="px-4 py-6 text-sm text-text-secondary">
                  No hay pedidos recientes para mostrar.
                </p>
              ) : (
                recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-surface-hover"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary">
                        #{order.pedidoNumero} — {[order.clienteNombre, order.clienteApellido].filter(Boolean).join(' ') || 'Cliente'}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(order.total)}
                      </p>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${
                        estadoBadge[order.estado] ?? 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {order.estado}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Clientes */}
        <div>
          <h2 className="mb-3 text-lg font-semibold text-text-primary">Clientes</h2>
          <ClientesTable
            clientes={clientes}
            isLoading={isLoading}
            isError={isError}
            onRetry={onRetry}
          />
        </div>
      </div>
    </div>
  );
}
