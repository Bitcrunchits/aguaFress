import { TransformInterceptor } from './transform.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, firstValueFrom } from 'rxjs';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor;

  const createMockContext = (url = '/test') => ({
    switchToHttp: () => ({
      getRequest: () => ({ url, method: 'GET' }),
    }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  } as unknown as ExecutionContext);

  beforeEach(() => {
    interceptor = new TransformInterceptor();
  });

  it('should wrap response in { data, timestamp, path }', async () => {
    const context = createMockContext('/vendedores');
    const callHandler: CallHandler = { handle: () => of({ id: '1', nombre: 'Test' }) };

    const result = await firstValueFrom(interceptor.intercept(context, callHandler));

    expect(result).toHaveProperty('data');
    expect(result.data).toEqual({ id: '1', nombre: 'Test' });
    expect(result).toHaveProperty('timestamp');
    expect(result).toHaveProperty('path', '/vendedores');
  });

  it('should not double-wrap responses that already have data property', async () => {
    const context = createMockContext('/auth/login');
    const alreadyWrapped = {
      data: { token: 'abc' },
      timestamp: '2026-01-01T00:00:00.000Z',
    };
    const callHandler: CallHandler = { handle: () => of(alreadyWrapped) };

    const result = await firstValueFrom(interceptor.intercept(context, callHandler));

    expect(result).toBe(alreadyWrapped);
  });

  it('should pass null/undefined through', async () => {
    const context = createMockContext('/empty');
    const callHandler: CallHandler = { handle: () => of(null) };

    const result = await firstValueFrom(interceptor.intercept(context, callHandler));

    expect(result).toBeNull();
  });

  it('should wrap arrays in data property', async () => {
    const context = createMockContext('/vendedores');
    const items = [{ id: '1' }, { id: '2' }];
    const callHandler: CallHandler = { handle: () => of(items) };

    const result = await firstValueFrom(interceptor.intercept(context, callHandler));

    expect(result.data).toEqual(items);
  });
});
