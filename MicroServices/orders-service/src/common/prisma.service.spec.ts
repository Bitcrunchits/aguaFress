import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  it('connects during Nest module initialization', async () => {
    const service = new PrismaService();
    const connectSpy = jest.spyOn(service, '$connect').mockResolvedValue(undefined);

    await service.onModuleInit();

    expect(connectSpy).toHaveBeenCalledTimes(1);
  });

  it('disconnects during Nest module shutdown', async () => {
    const service = new PrismaService();
    const disconnectSpy = jest.spyOn(service, '$disconnect').mockResolvedValue(undefined);

    await service.onModuleDestroy();

    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });
});
