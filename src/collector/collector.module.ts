import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChartModule } from '../chart/chart.module';
import { LocalPersistModule } from '../localpersist/localpersist.module';
import { CollectorService } from './collector.service';

@Module({
  imports: [ChartModule, LocalPersistModule, ConfigModule],
  providers: [CollectorService, ConfigService] ,
  exports: [],
})
export class CollectorModule {}
