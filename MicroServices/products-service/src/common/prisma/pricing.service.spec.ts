import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PricingService } from './pricing.service';

describe('PricingService', () => {
  let service: PricingService;
  let config: { get: jest.Mock };

  beforeEach(async () => {
    config = { get: jest.fn().mockReturnValue(21) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [PricingService, { provide: ConfigService, useValue: config }],
    }).compile();

    service = module.get<PricingService>(PricingService);
  });

  it('calcula precioFinal aplicando el % de IVA configurado', () => {
    const resultado = service.calcularPrecioFinal(100);
    expect(resultado.toString()).toBe('121');
  });

  it('redondea a 2 decimales', () => {
    const resultado = service.calcularPrecioFinal(33.333);
    expect(resultado.toString()).toBe('40.33');
  });

  it('usa el % de IVA desde ConfigService', () => {
    service.calcularPrecioFinal(100);
    expect(config.get).toHaveBeenCalledWith('iva.porcentaje', 21);
  });
});
