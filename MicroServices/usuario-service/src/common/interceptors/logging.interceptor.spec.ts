import { LoggingInterceptor } from './logging.interceptor';
import { ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { of, throwError, firstValueFrom } from 'rxjs';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;

  const createMockContext = (requestOverrides = {}) => {
    const request = {
      method: 'GET',
      url: '/test',
      user: { id: 'user-1' },
      ...requestOverrides,
    };
    const response = { statusCode: 200 };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
  });

  it('should log successfully for 2xx responses', async () => {
    const context = createMockContext();
    const callHandler: CallHandler = { handle: () => of('data') };
    const spy = jest.spyOn(Logger.prototype, 'log').mockImplementation();

    await firstValueFrom(interceptor.intercept(context, callHandler));

    expect(spy).toHaveBeenCalledWith(
      expect.stringMatching(/GET \/test 200 \d+ms — user:user-1/),
    );
  });

  it('should warn for 4xx responses', async () => {
    const context = createMockContext();
    const response = context.switchToHttp().getResponse() as any;
    response.statusCode = 404;

    const callHandler: CallHandler = { handle: () => of(null) };
    const spy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    await firstValueFrom(interceptor.intercept(context, callHandler));

    expect(spy).toHaveBeenCalledWith(
      expect.stringMatching(/GET \/test 404 \d+ms — user:user-1/),
    );
  });

  it('should log anonymous when no user', async () => {
    const context = createMockContext({ user: undefined });
    const callHandler: CallHandler = { handle: () => of('data') };
    const spy = jest.spyOn(Logger.prototype, 'log').mockImplementation();

    await firstValueFrom(interceptor.intercept(context, callHandler));

    expect(spy).toHaveBeenCalledWith(
      expect.stringMatching(/user:anonymous/),
    );
  });

  it('should error-log when handler throws', async () => {
    const context = createMockContext();
    const error = new Error('Test error');
    const callHandler: CallHandler = { handle: () => throwError(() => error) };
    const spy = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    await expect(
      firstValueFrom(interceptor.intercept(context, callHandler)),
    ).rejects.toThrow('Test error');

    expect(spy).toHaveBeenCalledWith(
      expect.stringMatching(/GET \/test .* Test error/),
      expect.any(String),
    );
  });
});
