import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PricingService } from './pricing.service';

describe('PricingService', () => {
  let service: PricingService;
  let config: { get: jest.Mock };

  beforeEach(async () => {
    config = {
      get: jest.fn((key: string, _default: unknown) => {
        if (key === 'iva.porcentaje') return 21;
        if (key === 'impuestos.porcentaje') return 0;
        return _default;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [PricingService, { provide: ConfigService, useValue: config }],
    }).compile();

    service = module.get<PricingService>(PricingService);
  });

  it('calcula precioFinal aplicando el % de IVA configurado (default 21)', () => {
    const resultado = service.calcularPrecioFinal(100);
    expect(resultado.toString()).toBe('121');
  });

  it('redondea a 2 decimales', () => {
    const resultado = service.calcularPrecioFinal(33.333);
    expect(resultado.toString()).toBe('40.33');
  });

  it('usa el % de IVA desde ConfigService por defecto', () => {
    service.calcularPrecioFinal(100);
    expect(config.get).toHaveBeenCalledWith('iva.porcentaje', 21);
  });

  it('acepta porcentajeIva personalizado', () => {
    const resultado = service.calcularPrecioFinal(100, 10.5);
    // 100 * 1.105 = 110.5
    expect(resultado.toString()).toBe('110.5');
  });

  it('acepta porcentajeImpuestos adicional', () => {
    const resultado = service.calcularPrecioFinal(100, 21, 5);
    // 100 * (1 + 0.21 + 0.05) = 126
    expect(resultado.toString()).toBe('126');
  });

  it('suma IVA + impuestos correctamente', () => {
    const resultado = service.calcularPrecioFinal(200, 10, 3.5);
    // 200 * (1 + 0.10 + 0.035) = 227
    expect(resultado.toString()).toBe('227');
  });

  it('no llama a config cuando recibe porcentajes', () => {
    config.get.mockClear();
    service.calcularPrecioFinal(100, 21, 0);
    expect(config.get).not.toHaveBeenCalled();
  });
});
