import {ApiProperty, ApiPropertyOptional} from "@nestjs/swagger";
import { DeliveryEstado, DeliveryResponse, DireccionEntrega } from "@agua/contracts";

class ClienteDto {
  @ApiProperty()
  nombre!: string;

  @ApiPropertyOptional()
  telefono?: string;
}
class DireccionEntregaDto implements DireccionEntrega {
    @ApiProperty()
    calle!: string;
    @ApiProperty()
    numero!: string;
    @ApiPropertyOptional()
    pisoDepto?: string;
    @ApiPropertyOptional()
    referencia?: string;
    @ApiPropertyOptional()
    barrio?: string;
    @ApiPropertyOptional()
    ciudad?: string;
    @ApiPropertyOptional()
    codigoPostal?: string;
    @ApiPropertyOptional()
    provincia?: string;
    @ApiPropertyOptional()
    latitude?: number;
    @ApiPropertyOptional()
    longitude?: number;
}
export class DeliveryResponseDto implements DeliveryResponse {
    @ApiProperty({format: 'uuid'})
    id!: string;
    @ApiProperty({format: 'uuid'})
    orderId!: string;
    @ApiProperty({format: 'uuid'})
    vendedorId!: string;
    @ApiProperty({enum: DeliveryEstado})
    estado!: DeliveryEstado;
    @ApiProperty({type: ClienteDto})
    cliente!: ClienteDto;
    @ApiProperty({type: DireccionEntregaDto})
    direccion!: DireccionEntregaDto;
    @ApiProperty({example: '2026-07-01T12:00:00Z'})
    fechaAsignacion!: string;
    @ApiPropertyOptional()
    fechaEntrega?: string;
    @ApiPropertyOptional()
    notas?: string;
}