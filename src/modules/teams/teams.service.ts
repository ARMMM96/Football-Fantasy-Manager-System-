import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class TeamsService {
  constructor(
    private readonly databaseService: DatabaseService,
    @InjectQueue('team-creation') private readonly teamQueue: Queue,
  ) {}

  /**
   * Queue team creation job for a new user
   */
  async queueTeamCreation(userId: string): Promise<void> {
    await this.teamQueue.add('create-team', { userId });
  }

  /**
   * Get team by user ID
   */
  async getTeamByUserId(userId: string) {
    return this.databaseService.client.team.findUnique({
      where: { userId },
      include: { players: true },
    });
  }

  /**
   * Check if user has a team
   */
  async userHasTeam(userId: string): Promise<boolean> {
    const team = await this.databaseService.client.team.findUnique({
      where: { userId },
    });
    return !!team && team.isTeamReady;
  }
}
