import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { ListTransfersDto } from './dto/list-transfers.dto';
import { AddToTransferListDto } from './dto/create-listing.dto';
import { Prisma } from '../../database/generated/prisma/client';

@Injectable()
export class TransferService {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * List players on transfer market with filters
   */
  async getTransferList(filters: ListTransfersDto) {
    const where: Prisma.PlayerWhereInput = {
      isOnTransferList: true,
    };

    if (filters.teamName) {
      where.team = {
        name: { contains: filters.teamName, mode: 'insensitive' },
      };
    }

    if (filters.playerName) {
      where.OR = [
        { firstName: { contains: filters.playerName, mode: 'insensitive' } },
        { lastName: { contains: filters.playerName, mode: 'insensitive' } },
      ];
    }

    if (filters.maxPrice) {
      where.askingPrice = { lte: filters.maxPrice };
    }

    return this.databaseService.client.player.findMany({
      where,
      include: {
        team: {
          select: { name: true, country: true },
        },
      },
    });
  }

  /**
   * Add player to transfer list
   */
  async addToTransferList(
    userId: string,
    playerId: string,
    dto: AddToTransferListDto,
  ) {
    // Verify ownership
    const player = await this.databaseService.client.player.findFirst({
      where: { id: playerId, team: { userId } },
      include: { team: true },
    });

    if (!player) {
      throw new NotFoundException('Player not found or does not belong to your team');
    }

    if (player.isOnTransferList) {
      throw new BadRequestException('Player is already on the transfer list');
    }

    return this.databaseService.client.player.update({
      where: { id: playerId },
      data: {
        isOnTransferList: true,
        askingPrice: dto.askingPrice,
      },
    });
  }

  /**
   * Remove player from transfer list
   */
  async removeFromTransferList(userId: string, playerId: string) {
    const player = await this.databaseService.client.player.findFirst({
      where: { id: playerId, team: { userId } },
    });

    if (!player) {
      throw new NotFoundException('Player not found or does not belong to your team');
    }

    if (!player.isOnTransferList) {
      throw new BadRequestException('Player is not on the transfer list');
    }

    return this.databaseService.client.player.update({
      where: { id: playerId },
      data: {
        isOnTransferList: false,
        askingPrice: null,
      },
    });
  }

  /**
   * Buy a player
   */
  async buyPlayer(userId: string, playerId: string) {
    return this.databaseService.client.$transaction(async (tx) => {
      // 1. Get Buyer Team
      const buyerTeam = await tx.team.findUnique({
        where: { userId },
        include: { players: true },
      });

      if (!buyerTeam) {
        throw new NotFoundException('Your team not found');
      }

      if (buyerTeam.players.length >= 25) {
        throw new BadRequestException('Your team is full (max 25 players)');
      }

      // 2. Get Player and Seller Team
      const player = await tx.player.findUnique({
        where: { id: playerId },
        include: { team: { include: { players: true } } },
      });

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      if (!player.isOnTransferList) {
        throw new BadRequestException('Player is not for sale');
      }

      if (player.teamId === buyerTeam.id) {
        throw new BadRequestException('You cannot buy your own player');
      }

      const sellerTeam = player.team;
      if (sellerTeam.players.length <= 15) {
        throw new BadRequestException('Seller team cannot sell more players (min 15 limit reached)');
      }

      // 3. Check Budget
      const price = Number(player.askingPrice);
      const buyerBudget = Number(buyerTeam.budget);

      if (buyerBudget < price) {
        throw new BadRequestException('Insufficient funds');
      }

      // 4. Execute Transaction
      // Buyer pays 100%, Seller gets 95%
      const sellerRevenue = price * 0.95;
      const commission = price * 0.05;

      // Update Buyer Budget
      await tx.team.update({
        where: { id: buyerTeam.id },
        data: {
          budget: { decrement: price },
          totalPlayers: { increment: 1 },
        },
      });

      // Update Seller Budget
      await tx.team.update({
        where: { id: sellerTeam.id },
        data: {
          budget: { increment: sellerRevenue },
          totalPlayers: { decrement: 1 },
        },
      });

      // Transfer Player
      await tx.player.update({
        where: { id: player.id },
        data: {
          teamId: buyerTeam.id,
          isOnTransferList: false,
          askingPrice: null,
          marketValue: { increment: price * (Math.random() * 0.1) }, // Random value increase
        },
      });

      // Log Transaction (Optional but good for history)
      // Note: Assuming we might want to log this in a Transaction table if it existed,
      // but sticking to "Simple" core requirements: just update the connection.
      // Actually, schema has TransferTransaction model. Let's use it.
      await tx.transferTransaction.create({
        data: {
          playerId: player.id,
          sellerTeamId: sellerTeam.id,
          buyerTeamId: buyerTeam.id,
          askingPrice: price,
          salePrice: sellerRevenue, // Recording what seller got? or what passed hands?
          commission: commission,
        },
      });

      return { message: 'Player purchased successfully', playerId: player.id, price, commission };
    });
  }
}
