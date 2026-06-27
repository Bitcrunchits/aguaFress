import { IsUUID, IsNotEmpty } from 'class-validator';

export class ReasignarVendedorDto {
  @IsUUID()
  @IsNotEmpty()
  vendedorId!: string;
}
