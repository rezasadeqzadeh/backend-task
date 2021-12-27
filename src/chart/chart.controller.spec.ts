import { INestApplication } from "@nestjs/common";
import { CollectorService } from "../collector/collector.service";
import { LocalPersistService } from "../localpersist/localpersist.service";
import { ChartService } from "./chart.service";
import { Test } from '@nestjs/testing';
import { ChartModule } from "./chart.module";
import { LocalPersistModule } from "../localpersist/localpersist.module";
import { CollectorModule } from "../collector/collector.module";
import * as request from 'supertest';
import { ConfigService } from "dynamoose/dist/aws/sdk";
import { DynamooseModule } from "nestjs-dynamoose";

describe('ChartController', () => {

    let app: INestApplication;
    let catsService = { findAll: () => ['test'] };

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [ChartModule, CollectorModule, LocalPersistModule, ConfigService, DynamooseModule],
        })
            .overrideProvider([CollectorService, ChartService, LocalPersistService])
            .useValue(catsService)
            .compile();

        app = moduleRef.createNestApplication();
        await app.init();
    });

    it(`/GET chart/supply`, () => {
        return request(app.getHttpServer())
          .get('/chart/supply/0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5')
          .expect(200)
          .expect({
            data: [{
                "value": 0.69200109,
                "timestamp": 1640599200000
            }],
          });
      });
    
      afterAll(async () => {
        await app.close();
      });
});