import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class ResolveClienteNamesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  authUserIds: string[];
}
