import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import QRPage from '../features/qr/pages/QRPage';

let createdQr = false;
let deactivatedQr = false;

const server = setupServer(
  http.get('/api/v1/qr/vendor/list', () => HttpResponse.json({
    data: [{ id: 'qr-1', qrCode: 'base64', url: 'https://agua.app/invitar/qr-1', expiresAt: '2026-07-29T00:00:00.000Z', activo: true }],
    pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
  })),
  http.get('/api/v1/link-invitacion/vendor/list', () => HttpResponse.json({
    data: [{ id: 'link-1', linkUrl: 'https://agua.app/invitar/link-1', token: 'link-1', expiresAt: '2026-07-29T00:00:00.000Z', activo: true }],
    pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
  })),
  http.post('/api/v1/qr/vendor/create', () => {
    createdQr = true;
    return HttpResponse.json({ qrCode: 'new-base64', url: 'https://agua.app/invitar/new-qr', expiresAt: '2026-07-29T00:00:00.000Z' });
  }),
  http.patch('/api/v1/qr/vendor/deactivate/qr-1', () => {
    deactivatedQr = true;
    return HttpResponse.json({ deactivated: true });
  })
);

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <QRPage />
    </QueryClientProvider>
  );
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  createdQr = false;
  deactivatedQr = false;
  server.resetHandlers();
});
afterAll(() => server.close());

describe('QRPage', () => {
  it('renders invitation lists and creates a QR', async () => {
    renderPage();

    expect(await screen.findByText('https://agua.app/invitar/qr-1')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Crear QR' }));

    expect(createdQr).toBe(true);
    expect(await screen.findByText(/new-qr/)).toBeInTheDocument();
  });

  it('deactivates a vendor QR through the gateway', async () => {
    renderPage();

    expect(await screen.findByText('https://agua.app/invitar/qr-1')).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: 'Desactivar' })[0]);

    expect(deactivatedQr).toBe(true);
  });
});
