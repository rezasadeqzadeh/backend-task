import { Module } from '@nestjs/common';
import { ChartModule } from 'src/chart/chart.module';
import { LocalPersistModule } from 'src/localpersist/localpersist.module';
import { CollectorService } from './collector.service';

@Module({
  imports: [ChartModule, LocalPersistModule],
  providers: [CollectorService],
  exports: [],
})
export class CollectorModule {}
