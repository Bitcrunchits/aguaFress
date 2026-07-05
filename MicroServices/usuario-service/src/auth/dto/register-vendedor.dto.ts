import { IsEmail, IsString, IsOptional, MinLength, MaxLength, Length } from 'class-validator';

export class RegisterVendedorDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(2)
  nombre: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  apellido: string;

  @IsString()
  @Length(8, 8)
  dni: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  cuil?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  cuit?: string;

  @IsString()
  telefono: string;

  @IsString()
  @MinLength(2)
  ciudad: string;

  @IsOptional()
  @IsString()
  zonaEntrega?: string;
}
