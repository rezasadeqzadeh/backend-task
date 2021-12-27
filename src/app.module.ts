import { Module } from '@nestjs/common';
import { DynamooseModule } from 'nestjs-dynamoose';
import { ChartModule } from './chart/chart.module';
import { ConfigModule } from '@nestjs/config';
import { CollectorModule } from './collector/collector.module';
import {config} from  "./config"
import { LocalPersistModule } from './localpersist/localpersist.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config]
    }),
    DynamooseModule.forRoot({
      local: true,
      aws: {      
        region: 'us-east-1',
        accessKeyId: 'temp',
        secretAccessKey: 'temp',
      },
      model: {
        create: true,        
      },      
    }),
    CollectorModule,
    ChartModule,
    LocalPersistModule
  ],
})
export class ApplicationModule {}
