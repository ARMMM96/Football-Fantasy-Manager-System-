import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from './generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { LoggerService } from '../core/logger/logger.service';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;
  public prisma: PrismaClient;
  private readonly context = 'DatabaseService';

  constructor(
    private configService: ConfigService,
    private logger: LoggerService,
  ) {
    const connectionString =
      this.configService.getOrThrow<string>('DATABASE_URL');

    this.pool = new Pool({
      connectionString,
      max: 10,
    });

    const adapter = new PrismaPg(this.pool);

    this.prisma = new PrismaClient({
      adapter,
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' },
      ],
    });

    (this.prisma as any).$on('query', (e: any) => {
      this.logger.log(`Query: ${e.query}`, this.context, {
        duration: e.duration,
      });
    });
  }

  async onModuleInit() {
    try {
      await this.prisma.$connect();
      this.logger.log('✅ Database connected successfully!', this.context);
    } catch (error) {
      this.logger.error(
        '❌ Database connection failed',
        error.stack,
        this.context,
      );
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
    await this.pool.end();
    this.logger.warn('🔌 Database disconnected', this.context);
  }

  get client() {
    return this.prisma;
  }
}
