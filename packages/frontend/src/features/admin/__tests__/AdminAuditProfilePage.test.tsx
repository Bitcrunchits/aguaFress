import { beforeAll, afterAll, afterEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { UserRole } from '@agua/contracts';
import AdminAuditDetailPage from '../pages/AdminAuditDetailPage';
import AdminAuditPage from '../pages/AdminAuditPage';
import AdminProfilePage from '../pages/AdminProfilePage';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderAdminRoute(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/admin/audit" element={<AdminAuditPage />} />
          <Route path="/admin/audit/:auditId" element={<AdminAuditDetailPage />} />
          <Route path="/admin/profile" element={<AdminProfilePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('admin audit and profile pages', () => {
  it('renders audit list success state from activity logs', async () => {
    server.use(
      http.get('/api/v1/activity-logs/list', () => HttpResponse.json({
        data: [
          {
            id: 'audit-1',
            createdAt: '2026-08-06T12:00:00.000Z',
            source: 'usuario-service',
            action: 'VENDEDOR_STATUS_CHANGED',
            actor: { email: 'admin@test.com', role: UserRole.SUPER_ADMIN },
            entity: { type: 'vendedor', id: 'vendedor-1' },
            result: 'success',
            summary: 'Vendor enabled',
          },
        ],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      }))
    );

    renderAdminRoute('/admin/audit');

    expect(await screen.findByRole('heading', { name: 'Auditoría' })).toBeInTheDocument();
    expect(screen.getByText('Vendor enabled')).toBeInTheDocument();
    expect(screen.getByText(/admin@test.com/)).toBeInTheDocument();
    expect(screen.getByText('1 eventos · página 1 de 1')).toBeInTheDocument();
  });

  it('shows audit empty and backend error states distinctly', async () => {
    server.use(
      http.get('/api/v1/activity-logs/list', () => HttpResponse.json({
        data: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
      }))
    );

    renderAdminRoute('/admin/audit');

    expect(await screen.findByText('No hay eventos de auditoría para mostrar')).toBeInTheDocument();

    server.use(
      http.get('/api/v1/activity-logs/list', () => HttpResponse.json({ message: 'Auditoría no disponible' }, { status: 500 }))
    );

    renderAdminRoute('/admin/audit');

    expect(await screen.findByText('Auditoría no disponible')).toBeInTheDocument();
  });

  it('renders audit detail with actor, action, target, and timestamp', async () => {
    let requestedId = '';
    server.use(
      http.get('/api/v1/activity-logs/get-by-id', ({ request }) => {
        requestedId = new URL(request.url).searchParams.get('id') ?? '';
        return HttpResponse.json({
          data: {
            id: 'audit-1',
            createdAt: '2026-08-06T12:00:00.000Z',
            source: 'usuario-service',
            action: 'VENDEDOR_STATUS_CHANGED',
            actor: { email: 'admin@test.com', role: UserRole.SUPER_ADMIN },
            entity: { type: 'vendedor', id: 'vendedor-1' },
            result: 'success',
            summary: 'Vendor enabled',
            metadata: { estado: 'activo' },
            requestId: 'req-1',
          },
        });
      })
    );

    renderAdminRoute('/admin/audit/audit-1');

    expect(await screen.findByRole('heading', { name: 'Detalle de auditoría' })).toBeInTheDocument();
    expect(screen.getByText('admin@test.com')).toBeInTheDocument();
    expect(screen.getByText('VENDEDOR_STATUS_CHANGED')).toBeInTheDocument();
    expect(screen.getByText('vendedor · vendedor-1')).toBeInTheDocument();
    expect(screen.getByText('2026-08-06T12:00:00.000Z')).toBeInTheDocument();
    expect(requestedId).toBe('audit-1');
  });

  it('loads and updates the admin profile without editable identity ids', async () => {
    let capturedBody: unknown;
    server.use(
      http.get('/api/v1/super-admin/profile', () => HttpResponse.json({
        id: 'admin-1',
        email: 'admin@test.com',
        nombre: 'Ada',
        apellido: 'Lovelace',
        role: UserRole.SUPER_ADMIN,
      })),
      http.patch('/api/v1/super-admin/profile/update', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ id: 'admin-1', nombre: 'Ada', apellido: 'Byron' });
      })
    );

    renderAdminRoute('/admin/profile');

    expect(await screen.findByRole('heading', { name: 'Perfil admin' })).toBeInTheDocument();
    expect(screen.getByText('admin@test.com')).toBeInTheDocument();
    expect(screen.queryByLabelText('userId')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('actorUserId')).not.toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('Apellido'));
    await userEvent.type(screen.getByLabelText('Apellido'), 'Byron');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar perfil' }));

    await waitFor(() => expect(capturedBody).toEqual({ nombre: 'Ada', apellido: 'Byron' }));
    expect(capturedBody).not.toHaveProperty('userId');
    expect(capturedBody).not.toHaveProperty('actorUserId');
    expect(await screen.findByText('Perfil actualizado correctamente')).toBeInTheDocument();
  });

  it('shows profile validation and backend errors distinctly', async () => {
    server.use(
      http.get('/api/v1/super-admin/profile', () => HttpResponse.json({
        id: 'admin-1',
        email: 'admin@test.com',
        nombre: 'Ada',
        apellido: 'Lovelace',
        role: UserRole.SUPER_ADMIN,
      })),
      http.patch('/api/v1/super-admin/profile/update', () => HttpResponse.json({ message: 'Nombre inválido' }, { status: 400 }))
    );

    renderAdminRoute('/admin/profile');

    await userEvent.clear(await screen.findByLabelText('Nombre'));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar perfil' }));

    expect(await screen.findByText('El nombre es obligatorio')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Nombre'), 'Ada');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar perfil' }));

    expect(await screen.findByText('Nombre inválido')).toBeInTheDocument();
  });
});
