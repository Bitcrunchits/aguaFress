import { IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReasignarVendedorDto {
  @ApiProperty({ description: 'New vendor ID', format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  vendedorId!: string;
}
