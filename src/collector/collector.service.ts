import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel, Model } from 'nestjs-dynamoose';
import {
  ApolloClient,
  gql,
  HttpLink,
  InMemoryCache,
  NormalizedCacheObject,
} from '@apollo/client/core';
import fetch from 'cross-fetch';
import { ChartService } from '../chart/chart.service';
import { ConfigService } from '@nestjs/config';
import { v4 as uuid } from 'uuid';
import { TransactionSupport } from 'nestjs-dynamoose';
import { Chart, ChartKey } from 'src/chart/chart.interface';

const getLatestIndexedBlock = `
query {
  indexingStatusForCurrentVersion(subgraphName: "graphprotocol/compound-v2") { chains { latestBlock { hash number }}}
}
`;

@Injectable()
export class CollectorService extends TransactionSupport implements OnModuleInit {
  clientMetadata: ApolloClient<NormalizedCacheObject>;
  // add your own properties
  totalSupplyByHour = new Array<number>(24);

  constructor(
    private readonly chartService: ChartService,
    private readonly configService: ConfigService) {
    super();
    this.clientMetadata = new ApolloClient({
      cache: new InMemoryCache(),
      link: new HttpLink({
        uri: 'https://api.thegraph.com/subgraphs/name/graphprotocol/compound-v2',
        fetch,
      }),
    });
    this.totalSupplyByHour.fill(0);
  }

  onModuleInit() {
    // start events listers
    this.listenToEvents();

    // fetch data from compound's the graph
    this.fetchFromTheGraph();
  }

  async listenToEvents() {
    console.log("listen to events started");

    // start event listeners
  }

  async fetchFromTheGraph() {
    // fetch, transform and save data from compound's the graph
    this.clientMetadata
      .query({
        query: gql(this.getFetchQuery()),
      }).then((result) => {
        result.data.mintEvents.forEach(element => {
          this.groupByHour(element);
        });
        console.log("Successfully retrived Mint events, Rows:", result.data.mintEvents.length);
        this.storeTotalSupply();
      }).catch((err) => {
        console.log('Error fetching data: ', err);
      });
  }

  groupByHour(item) {
    var date = new Date(item['blockTime'] * 1000);
    var hour = date.getHours();
    this.totalSupplyByHour[hour] += +item['amount'];
  }

  storeTotalSupply() {
    this.totalSupplyByHour.forEach((value, index) => {
      const c: Chart = {
        id: uuid(),
        timestamp: new Date().getTime(),
        value: value,
        address: "address1"
      }
      this.chartService.create(c).then(() => {
        console.log("inserted in db, Index:", index, "Value", value);
      })
        .catch(err => {
          console.log("Error in storing total supply, err:", err);
        });
    });
  }

  getFetchQuery() {
    var start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    var lastDateTimestamp = start.getTime() / 1000;
    console.log(lastDateTimestamp);
    return `
        {
          mintEvents(
            where: {
                    blockTime_gt : ${lastDateTimestamp}
            },
            skip: 0, 
            orderBy : blockTime,
            orderDirection : asc)
          {
            amount
            to
            blockTime
            cTokenSymbol
          }
        }
        `
  }

}
function chart(chart: any) {
  throw new Error('Function not implemented.');
}

