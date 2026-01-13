import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TeamsService } from './teams.service';
import { TeamsProcessor } from './teams.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'team-creation',
    }),
  ],
  providers: [TeamsService, TeamsProcessor],
  exports: [TeamsService],
})
export class TeamsModule {}
