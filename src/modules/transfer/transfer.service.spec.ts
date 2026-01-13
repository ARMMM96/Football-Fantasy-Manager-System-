import { Test, TestingModule } from '@nestjs/testing';
import { TransferService } from './transfer.service';
import { DatabaseService } from '../../database/database.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

const mockDatabaseService = {
  client: {
    player: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockTx)),
  },
};

const mockTx = {
  team: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  player: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  transferTransaction: {
    create: jest.fn(),
  },
};

describe('TransferService', () => {
  let service: TransferService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransferService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    service = module.get<TransferService>(TransferService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('buyPlayer', () => {
    const buyerId = 'buyer-uuid';
    const sellerId = 'seller-uuid';
    const playerId = 'player-uuid';

    const mockBuyerTeam = {
      id: 'buyer-team-id',
      userId: buyerId,
      budget: 10000000,
      players: Array(20).fill({}), // 20 players
    };

    const mockSellerTeam = {
      id: 'seller-team-id',
      userId: sellerId,
      budget: 5000000,
      players: Array(20).fill({}), // 20 players
    };

    const mockPlayer = {
      id: playerId,
      teamId: 'seller-team-id',
      isOnTransferList: true,
      askingPrice: 1000000,
      team: mockSellerTeam,
    };

    it('should successfully buy a player', async () => {
      mockTx.team.findUnique.mockResolvedValueOnce(mockBuyerTeam);
      mockTx.player.findUnique.mockResolvedValueOnce(mockPlayer);

      const result = await service.buyPlayer(buyerId, playerId);

      // Verify transaction logic
      expect(mockTx.team.update).toHaveBeenCalledTimes(2); // Buyer & Seller updates
      expect(mockTx.player.update).toHaveBeenCalledWith({
        where: { id: playerId },
        data: expect.objectContaining({
          teamId: mockBuyerTeam.id,
          isOnTransferList: false,
        }),
      });
      expect(result.message).toBe('Player purchased successfully');
    });

    it('should fail if buyer team is full (25 players)', async () => {
      const fullBuyerTeam = { ...mockBuyerTeam, players: Array(25).fill({}) };
      mockTx.team.findUnique.mockResolvedValueOnce(fullBuyerTeam);

      await expect(service.buyPlayer(buyerId, playerId))
        .rejects.toThrow(BadRequestException);
    });

    it('should fail if seller team has minimum players (15)', async () => {
      const minSellerTeam = { ...mockSellerTeam, players: Array(15).fill({}) };
      const playerFromMinTeam = { ...mockPlayer, team: minSellerTeam };

      mockTx.team.findUnique.mockResolvedValueOnce(mockBuyerTeam);
      mockTx.player.findUnique.mockResolvedValueOnce(playerFromMinTeam);

      await expect(service.buyPlayer(buyerId, playerId))
        .rejects.toThrow(BadRequestException);
    });

    it('should fail if insuficient funds', async () => {
      const poorBuyerTeam = { ...mockBuyerTeam, budget: 100 }; // Less than 1M
      mockTx.team.findUnique.mockResolvedValueOnce(poorBuyerTeam);
      mockTx.player.findUnique.mockResolvedValueOnce(mockPlayer);

      await expect(service.buyPlayer(buyerId, playerId))
        .rejects.toThrow(BadRequestException);
    });
  });
});
