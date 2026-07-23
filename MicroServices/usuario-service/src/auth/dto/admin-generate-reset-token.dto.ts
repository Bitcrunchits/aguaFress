import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdminGenerateResetTokenDto {
  @ApiProperty({ description: 'UUID del usuario para resetear la contraseña' })
  @IsString()
  @IsUUID()
  userId: string;
}
