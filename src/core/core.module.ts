import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { LoggerService } from './logger/logger.service';
import { ConfigModule } from '@nestjs/config';
import config from '../config';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [config] }),
    DatabaseModule,
  ],
  providers: [LoggerService],
  exports: [DatabaseModule, LoggerService],
})
export class CoreModule {}
