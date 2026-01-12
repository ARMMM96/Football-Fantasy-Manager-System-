import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { LoggerService } from './logger/logger.service';
import { ConfigModule } from '@nestjs/config';
import config from '../config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TransformResponseInterceptor } from './interceptors/transform-response/transform-response.interceptor';
import { CacheService } from './cache/cache.service';
import { JwtAuthGuard } from './auth/auth.guard';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [config] }),
    DatabaseModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformResponseInterceptor,
    },
    LoggerService,
    CacheService,
    JwtAuthGuard,
  ],
  exports: [DatabaseModule, LoggerService, CacheService, JwtAuthGuard],
})
export class CoreModule {}
