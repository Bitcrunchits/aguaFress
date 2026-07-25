import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateMarcaDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  nombre!: string;
}
