import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: 'Email address', format: 'email' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Password', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;
}
