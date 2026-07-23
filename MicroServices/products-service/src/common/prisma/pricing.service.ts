import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';

/**
 * Regla de seguridad del contrato (products-service.json):
 * "El precio se calcula server-side. El frontend manda precioSinIva,
 *  el service calcula precioFinal."
 *
 * Este servicio es la ÚNICA fuente de verdad para ese cálculo.
 * TODO(equipo): confirmar si el % de IVA es fijo global o configurable
 * por vendedor/categoría — hoy se toma de env (IVA_PORCENTAJE, default 21).
 */
@Injectable()
export class PricingService {
  constructor(private readonly config: ConfigService) {}

  calcularPrecioFinal(precioSinIva: number | Prisma.Decimal): Prisma.Decimal {
    const porcentaje = this.config.get<number>('iva.porcentaje', 21);
    const base = new Prisma.Decimal(precioSinIva.toString());
    const factor = new Prisma.Decimal(1).plus(new Prisma.Decimal(porcentaje).div(100));
    return base.times(factor).toDecimalPlaces(2);
  }
}
