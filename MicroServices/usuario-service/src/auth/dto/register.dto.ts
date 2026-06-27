import { IsEmail, IsString, IsEnum, IsOptional, MinLength } from 'class-validator';
import { UserRole } from '@agua/contracts';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(2)
  nombre: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsString()
  qrToken?: string;
}
