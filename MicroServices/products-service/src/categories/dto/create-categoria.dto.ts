import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCategoriaDto {
  @IsString()
  @MaxLength(255)
  nombre!: string;

  @IsOptional()
  @IsInt()
  orden?: number;
}
