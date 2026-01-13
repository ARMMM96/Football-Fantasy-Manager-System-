import { IsNumber, Min, IsPositive } from 'class-validator';

export class AddToTransferListDto {
  @IsNumber()
  @IsPositive({ message: 'Price must be a positive number' })
  askingPrice: number;
}
