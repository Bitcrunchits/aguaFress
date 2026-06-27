import { IsEmail, IsString, IsOptional, MinLength } from 'class-validator';

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
  telefono: string;

  @IsOptional()
  @IsString()
  ciudad?: string;

  @IsOptional()
  @IsString()
  zonaEntrega?: string;
}
