import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';

/**
 * Regla de seguridad del contrato (products-service.json):
 * "El precio se calcula server-side. El frontend manda precioSinIva,
 *  el service calcula precioFinal."
 *
 * Modelo A — IVA + impuestos adicionales:
 * - Cada producto tiene su propio porcentajeIva (default 21%) y porcentajeImpuestos (default 0%).
 * - El precioFinal incluye AMBOS: precioSinIva * (1 + iva/100 + impuestos/100).
 * - El cálculo es server-side. Los porcentajes se persisten por producto para flexibilidad fiscal.
 */
@Injectable()
export class PricingService {
  constructor(private readonly config: ConfigService) {}

  calcularPrecioFinal(
    precioSinIva: number | Prisma.Decimal,
    porcentajeIva?: number,
    porcentajeImpuestos?: number,
  ): Prisma.Decimal {
    const iva = porcentajeIva ?? this.config.get<number>('iva.porcentaje', 21);
    const imp = porcentajeImpuestos ?? this.config.get<number>('impuestos.porcentaje', 0);
    const base = new Prisma.Decimal(precioSinIva.toString());
    const factor = new Prisma.Decimal(1)
      .plus(new Prisma.Decimal(iva).div(100))
      .plus(new Prisma.Decimal(imp).div(100));
    return base.times(factor).toDecimalPlaces(2);
  }
}
