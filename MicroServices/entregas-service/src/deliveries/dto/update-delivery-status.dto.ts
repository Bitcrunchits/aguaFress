import { IsIn, IsOptional, IsString } from "class-validator";
import { DeliveryEstado, UpdateDeliveryStatusRequest } from "@agua/contracts";

export class UpdateDeliveryStatusDto implements UpdateDeliveryStatusRequest {
  @IsIn([DeliveryEstado.EN_CAMINO, DeliveryEstado.ENTREGADA])
  estado!: DeliveryEstado.EN_CAMINO | DeliveryEstado.ENTREGADA;
  
  @IsOptional()
  @IsString()
  notas?: string;
}