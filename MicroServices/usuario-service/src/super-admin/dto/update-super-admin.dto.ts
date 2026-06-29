import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class UpdateSuperAdminProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  apellido?: string;
}
