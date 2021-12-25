import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ApplicationModule } from './app.module';
import { GraphCollector } from './collector/collector.graph';
import { CollectorService } from './collector/collector.service';
import {Test} from "./test/test.service";

async function bootstrap() {
  const app = await NestFactory.create(ApplicationModule);
  app.useGlobalPipes(new ValidationPipe({ forbidUnknownValues: true }));
  app.enableCors();
  //var t = new Test();
  //t.start();

  //var g = new GraphCollector();
  //g.collect();

  const configService  = app.get(ConfigService);
  const port  = configService.get("port");
  await app.listen(port);

}
bootstrap();
