import { DynamooseModule } from 'nestjs-dynamoose';
import { ChartSchema } from './chart.schema';
import { ChartService } from './chart.service';
import { Module } from '@nestjs/common';
import { ChartController } from './chart.controller';

@Module({ 
  imports: [
    DynamooseModule.forFeature([{ name: 'Chart', schema: ChartSchema }]),
  ],
  controllers: [ChartController],
  providers: [ChartService],
  exports: [ChartService],
})
export class ChartModule {}