import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString } from "class-validator";
import { DeliveryEstado, UpdateDeliveryStatusRequest } from "@agua/contracts";

export class UpdateDeliveryStatusDto implements UpdateDeliveryStatusRequest {
  @ApiProperty({
    enum: [DeliveryEstado.EN_CAMINO, DeliveryEstado.ENTREGADA],
    description: "Nuevo estado de la entrega",
    example: DeliveryEstado.EN_CAMINO,
  })
  @IsIn([DeliveryEstado.EN_CAMINO, DeliveryEstado.ENTREGADA])
  estado!: DeliveryEstado.EN_CAMINO | DeliveryEstado.ENTREGADA;

  @ApiPropertyOptional({
    description: "Notas sobre el estado de la entrega",
    example: "El repartidor está en camino.",
  })
  @IsOptional()
  @IsString()
  notas?: string;
}