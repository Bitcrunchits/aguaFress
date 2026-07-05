import { IsEmail, IsString, IsOptional, MinLength, MaxLength, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterVendedorDto {
  @ApiProperty({ description: 'Email address', format: 'email' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Password', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ description: 'First name', minLength: 2 })
  @IsString()
  @MinLength(2)
  nombre: string;

  @ApiProperty({ description: 'Last name', minLength: 2, maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  apellido: string;

  @ApiProperty({ description: 'DNI', minLength: 8, maxLength: 8 })
  @IsString()
  @Length(8, 8)
  dni: string;

  @ApiPropertyOptional({ description: 'CUIL', maxLength: 15 })
  @IsOptional()
  @IsString()
  @MaxLength(15)
  cuil?: string;

  @ApiPropertyOptional({ description: 'CUIT', maxLength: 15 })
  @IsOptional()
  @IsString()
  @MaxLength(15)
  cuit?: string;

  @ApiProperty({ description: 'Phone number' })
  @IsString()
  telefono: string;

  @ApiProperty({ description: 'City', minLength: 2 })
  @IsString()
  @MinLength(2)
  ciudad: string;

  @ApiPropertyOptional({ description: 'Delivery zone' })
  @IsOptional()
  @IsString()
  zonaEntrega?: string;
}
