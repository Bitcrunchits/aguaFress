import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCategoriaDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  nombre!: string;

  @IsOptional()
  @IsInt()
  orden?: number;
}
