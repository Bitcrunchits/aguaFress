import { UserRole } from '@agua/contracts';
import { ActivityLogsTcpController } from './activity-logs.tcp.controller';
import { ActivityLogsService } from './activity-logs.service';
import { TcpPayloadAdapter } from '../tcp/tcp-payload-adapter.service';
import type { TcpPayload } from '../tcp/tcp-payload';

describe('ActivityLogsTcpController', () => {
  it('dispatches activity_logs.list only after SUPER_ADMIN enforcement', async () => {
    const { controller, service, adapter } = setup();
    const payload = authenticatedPayload({ query: { page: '1', limit: '20' } });

    await expect(controller.list(payload)).resolves.toEqual({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } });

    expect(adapter.requireRole).toHaveBeenCalledWith(payload, UserRole.SUPER_ADMIN);
    expect(service.list).toHaveBeenCalledWith({ page: 1, limit: 20 });
  });

  it('dispatches activity_logs.get-by-id with id from trusted route metadata', async () => {
    const { controller, service, adapter } = setup();
    const payload = authenticatedPayload({ params: { id: '64d000000000000000000001' }, body: { userId: 'attacker' } });

    await expect(controller.getById(payload)).resolves.toEqual({ data: expect.objectContaining({ id: '64d000000000000000000001' }) });

    expect(adapter.requireRole).toHaveBeenCalledWith(payload, UserRole.SUPER_ADMIN);
    expect(service.getById).toHaveBeenCalledWith({ id: '64d000000000000000000001' });
  });
});

function setup() {
  const service = {
    list: jest.fn().mockResolvedValue({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } }),
    getById: jest.fn().mockResolvedValue({ data: { id: '64d000000000000000000001', metadata: {} } }),
  };
  const adapter = new TcpPayloadAdapter();
  jest.spyOn(adapter, 'requireRole');
  jest.spyOn(adapter, 'listRequest');
  jest.spyOn(adapter, 'getByIdRequest');

  return { controller: new ActivityLogsTcpController(service as unknown as ActivityLogsService, adapter), service, adapter };
}

function authenticatedPayload(overrides: Partial<TcpPayload> = {}): TcpPayload {
  return {
    user: { sub: 'admin-1', email: 'admin@aguafress.test', role: UserRole.SUPER_ADMIN },
    ...overrides,
  };
}
