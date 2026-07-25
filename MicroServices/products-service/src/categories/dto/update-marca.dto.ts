import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMarcaDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nombre?: string;
}
