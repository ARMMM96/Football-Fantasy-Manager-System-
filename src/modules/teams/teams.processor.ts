import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { DatabaseService } from '../../database/database.service';
import { LoggerService } from '../../core/logger/logger.service';
import { POSITIONS, FIRST_NAMES, LAST_NAMES, COUNTRIES } from '../../core/constants/game-data';
import { Prisma } from '../../database/generated/prisma/client';

@Processor('team-creation')
export class TeamsProcessor extends WorkerHost {
  private readonly context = 'TeamsProcessor';

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly logger: LoggerService,
  ) {
    super();
  }

  async process(job: Job<{ userId: string }>): Promise<void> {
    const { userId } = job.data;
    this.logger.log(`Processing team creation for user ${userId}`, this.context);

    try {
      // Check if team already exists
      const existingTeam = await this.databaseService.client.team.findUnique({
        where: { userId },
      });

      if (existingTeam) {
        this.logger.warn(`Team already exists for user ${userId}`, this.context);
        return;
      }

      // Create team with transaction
      await this.databaseService.client.$transaction(async (tx) => {
        // Create team
        const team = await tx.team.create({
          data: {
            userId,
            name: `Team ${Date.now()}`,
            country: this.getRandomItem(COUNTRIES),
            budget: 5000000, // $5M as per requirements
            totalPlayers: 20,
            isTeamReady: false,
          },
        });

        // Generate 20 players (3 GK, 6 DEF, 6 MID, 5 ATT)
        const players: Prisma.PlayerCreateManyInput[] = [];
        for (const [position, config] of Object.entries(POSITIONS)) {
          for (let i = 0; i < config.count; i++) {
            players.push({
              teamId: team.id,
              firstName: this.getRandomItem(FIRST_NAMES),
              lastName: this.getRandomItem(LAST_NAMES),
              nationality: this.getRandomItem(COUNTRIES),
              position: position,
              marketValue: this.generateMarketValue(position),
              age: this.generateAge(),
              isOnTransferList: false,
            });
          }
        }

        // Batch insert players
        await tx.player.createMany({ data: players });

        // Mark team as ready
        await tx.team.update({
          where: { id: team.id },
          data: { isTeamReady: true },
        });

        this.logger.log(`Team created successfully for user ${userId} with 20 players`, this.context);
      });
    } catch (error) {
      this.logger.error(`Failed to create team for user ${userId}`, error.stack, this.context);
      throw error;
    }
  }

  private getRandomItem<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private generateAge(): number {
    // Players aged 18-35
    return Math.floor(Math.random() * 18) + 18;
  }

  private generateMarketValue(position: string): number {
    // Base value between $500K and $1M, with position modifiers
    const baseValue = Math.floor(Math.random() * 500000) + 500000;
    const modifiers: Record<string, number> = {
      GK: 0.8,
      DEF: 0.9,
      MID: 1.1,
      ATT: 1.2,
    };
    return Math.round(baseValue * (modifiers[position] || 1));
  }
}
