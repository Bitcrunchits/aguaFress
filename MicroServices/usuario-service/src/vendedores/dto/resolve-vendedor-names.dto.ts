import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class ResolveVendedorNamesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  vendedorIds: string[];
}
