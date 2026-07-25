import { IsString, MaxLength } from 'class-validator';

export class CreateMarcaDto {
  @IsString()
  @MaxLength(255)
  nombre!: string;
}
