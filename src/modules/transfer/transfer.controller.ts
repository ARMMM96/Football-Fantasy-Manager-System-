import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Delete,
  Patch,
} from '@nestjs/common';
import { TransferService } from './transfer.service';
import { ListTransfersDto } from './dto/list-transfers.dto';
import { AddToTransferListDto } from './dto/create-listing.dto';
import { BuyPlayerDto } from './dto/buy-player.dto';
import { JwtAuthGuard } from '../../core/auth/auth.guard';

@Controller('transfers')
@UseGuards(JwtAuthGuard)
export class TransferController {
  constructor(private readonly transferService: TransferService) {}

  @Get()
  async getTransferList(@Query() filters: ListTransfersDto) {
    return this.transferService.getTransferList(filters);
  }

  @Post('list/:playerId')
  async addToTransferList(
    @Request() req,
    @Param('playerId') playerId: string,
    @Body() dto: AddToTransferListDto,
  ) {
    return this.transferService.addToTransferList(req.user.id, playerId, dto);
  }

  @Delete('list/:playerId')
  async removeFromTransferList(
    @Request() req,
    @Param('playerId') playerId: string,
  ) {
    return this.transferService.removeFromTransferList(req.user.id, playerId);
  }

  @Post('buy')
  async buyPlayer(@Request() req, @Body() dto: BuyPlayerDto) {
    return this.transferService.buyPlayer(req.user.id, dto.playerId);
  }
}
