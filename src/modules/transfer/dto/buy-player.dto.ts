import { IsString, IsUUID } from 'class-validator';

export class BuyPlayerDto {
  @IsString()
  @IsUUID(4, { message: 'Invalid player ID format' })
  playerId: string;
}
