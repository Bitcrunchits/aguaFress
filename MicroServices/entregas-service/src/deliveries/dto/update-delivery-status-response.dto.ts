import { ApiProperty } from '@nestjs/swagger';
import { DeliveryEstado } from '@agua/contracts';

export class UpdateDeliveryStatusResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: DeliveryEstado })
  estado!: DeliveryEstado;

  @ApiProperty({ default: true })
  updated!: boolean;
}
