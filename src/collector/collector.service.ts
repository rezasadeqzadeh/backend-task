import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel, Model } from 'nestjs-dynamoose';
import { readFileSync } from 'fs';

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
import { Chart, ChartKey } from '../chart/chart.interface';
import { ethers } from 'ethers';
import { formatEther } from 'ethers/lib/utils';
import { LocalPersistService } from '../localpersist/localpersist.service';

@Injectable()
export class CollectorService extends TransactionSupport implements OnModuleInit {
  clientMetadata: ApolloClient<NormalizedCacheObject>;

  //totalSupplyByHour holds hours(in timestamp) with mint values per market  
  // for example          "market1": { 1640537178873 : 1000 },{ 1640537278873 : 2000 }
  totalSupplyByHour = new Map<string, Map<number, number>>();

  constructor(
    private readonly localPersistService: LocalPersistService,
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
    this.fillZeroTotalSupplyByHour();
  }

  //fillZeroTotalSupplyByHour set total supply value with 0 for each hour
  //to prevent miss hours when there is no event for specified hours.
  fillZeroTotalSupplyByHour() {
    let now = new Date();
    now = new Date(now.setUTCMinutes(0,0,0));
    let lastFetchTime = new Date(this.lastFetchTime() *1000);

    let marketAddresses = this.configService.get("marketAddresses");
    marketAddresses.forEach((address: string) => {
      while (lastFetchTime <= now) {
        if (this.totalSupplyByHour[address] == undefined) {
          this.totalSupplyByHour[address] = new Map<number, number>();
        }
        this.totalSupplyByHour[address][lastFetchTime.getTime()] = 0;
        //add one hour
        lastFetchTime.setTime(lastFetchTime.getTime() + (60 * 60 * 1000) );
      }
    });
  }

  onModuleInit() {
    // start events listers
    this.listenToEvents();

    // fetch data from compound's the graph
    this.fetchFromTheGraph();
  }

  listenToEvents() {
    // loop over each market and start listening to Mint and Reedem Event and long in console
    let marketAddresses = this.configService.get("marketAddresses");
    marketAddresses.forEach((address: string) => {
      let contract = this.getContract(address);

      contract.on("Mint", (minter, mintAmount, mintTokens) => {
        let timestamp = new Date();
        timestamp.setUTCMinutes(0, 0, 0);
        let amount = parseFloat(mintAmount);
        this.updateTotalSupply(address, timestamp.getTime(), amount);
        this.localPersistService.persist({ lastFetchTime: new Date().getTime() });
        console.debug("saved lastFetchTime in settings");
        console.debug(`Mint Event,\t  market:${address} minter: ${minter} amount: ${formatEther(mintAmount)} mintTokens: ${mintTokens} `);
      });

      contract.on("Redeem", (redeemer, redeemAmount, redeemTokens) => {
        console.debug(`Redeem Event \t market:${address} redeemer: ${redeemer} amount: ${formatEther(redeemAmount)} redeemTokens: ${redeemTokens} `);
      });
    });
  }


  fetchFromTheGraph() {
    // fetch, transform and save data from compound's the graph
    // playground: https://thegraph.com/hosted-service/subgraph/graphprotocol/compound-v2?selected=playground
    let marketAddresses = this.configService.get("marketAddresses");
    this.clientMetadata
      .query({
        query: gql(this.getFetchQuery()),
      }).then(async (result) => {
        result.data.mintEvents.forEach(element => {
          let cTokenContractAddress = element["from"];
          //needed to perisst this evnet?
          if (marketAddresses.includes(cTokenContractAddress)) {
            this.groupByHour(element);
          }
        });
        await this.storeAllTotalSupply();
        console.debug("Successfully retrived Mint events, Rows:", result.data.mintEvents.length);
      }).catch((err: TypeError) => {
        console.debug('Error fetching data: ', err);
      });
  }

  //groupByHour preprcess and aggreagate mint data 
  groupByHour(element) {
    let date = new Date(element['blockTime'] * 1000);
    date.setUTCMinutes(0, 0, 0);
    let cTokenAddress = element["from"];

    if (this.totalSupplyByHour[cTokenAddress] == undefined) {
      this.totalSupplyByHour[cTokenAddress] = new Map<number, number>();
    }
    let oldValue = parseFloat(this.totalSupplyByHour[cTokenAddress][date.getTime()]) || 0;
    let newValue = parseFloat(element['amount']);
    this.totalSupplyByHour[cTokenAddress][date.getTime()] = oldValue + newValue;
  }

  //storeAllTotalSupply store all mint amount values
  async storeAllTotalSupply() {
    for (const [marketAddress, hours] of Object.entries(this.totalSupplyByHour)) {
      console.debug("persisting for market: ", marketAddress);
      for (const [timestamp, amount] of Object.entries(hours)) {
        await this.updateTotalSupply(marketAddress, parseInt(timestamp), parseFloat(amount + ""));
      };
    };
    this.localPersistService.persist({ lastFetchTime: new Date().getTime() });
    console.debug("saved lastFetchTime in settings");
  }

  //updateTotalSupply upsert one total supply item in the chart table  
  async updateTotalSupply(marketAddress: string, timestamp: number, amount: number) {
    console.debug("persisting total supply, market:", marketAddress, " timestamp:", timestamp, " amount:", amount);
    let chartPoints = this.chartService.findByAddressAndTimestamp(marketAddress, timestamp);
    chartPoints
      .then(async (result) => {
        if (result.count == 0) {
          const c: Chart = {
            id: uuid(),
            timestamp: timestamp,
            value: amount,
            address: marketAddress
          }

          this.chartService.create(c).then(() => {
            console.debug("Chart Point created successfully. Market:", marketAddress, " Timestamp:", timestamp, " Amount:", amount);
          }).catch(err => {
            console.debug("Error in creating total supply, err:", err);
          });
        } else {
          //update chartPoint
          const c = {
            value: amount + result[0]["value"]
          }
          let chartKey: ChartKey = {
            id: result[0]["id"],
            timestamp: result[0]["timestamp"]
          }
          this.chartService.update(chartKey, c).then(() => {
            console.debug("Chart Point updated successfully. Market:", marketAddress, " Timestamp:", timestamp, " Amount:", amount);
          }).catch(err => {
            console.debug("Error in updating total supply, err:", err);
          });
        }
      })
      .catch((err) => {
        console.debug(err);
      });

  }
  //getFetchQuery return a graph query to fetch data
  getFetchQuery() {
    console.log("lastFetchTime:", this.lastFetchTime());
    return `
        {
          mintEvents(
            where: {
                    blockTime_gt : ${this.lastFetchTime()}
            },
            skip: 0, 
            orderBy : blockTime,
            orderDirection : asc)
          {
            amount
            from
            blockTime
            cTokenSymbol
          }
        }
        `
  }

  // getContract get an compound smart contract address and return an contract object.
  // please find the contract addresses from the below link:
  // https://compound.finance/docs#networks
  // to fetch data for a contract, please set contract address in config.ts file, in marketAddresses property
  // currently kovan and mainnet network are supporting now. to support more network please downlaod abi 
  // json file from above link and put in the the path.
  // also you should update abiPath property in the config.ts file
  getContract(marketAddress: string) {
    let netName = this.configService.get("netName");

    const provider = new ethers.providers.InfuraProvider(netName, this.configService.get("infuraProjectId"));
    const abi = JSON.parse(readFileSync(this.configService.get("abiPath"), 'utf8'));
    const contract = new ethers.Contract(marketAddress, abi, provider);

    contract.name().then(n => {
      console.debug(n);
    }).catch((e: TypeError) => {
      console.debug("Error in connecting to contract ", marketAddress, e);
    });
    return contract;
  }

  // lastFetchTime return the last time successfully retrieved graph data or event received.
  // due to the multiple stop/start application we need to prevent duplicate insert the total supply 
  // in the db so, we save the last fetch time.
  // event listeners also will update the lastFetchTime after event income.
  // for the first time the lastFetchTime is the beginning of the current day.
  lastFetchTime(): number {
    let start = this.localPersistService.read()["lastFetchTime"];
    if (start == undefined) {
      let now = new Date();
      // subtract one day
      now.setDate(now.getDate() - 1);
      // set time to minute 0
      now.setUTCMinutes(0, 0, 0);
      // conert to unix
      return Math.floor(now.getTime() / 1000);
    }
    return Math.floor(start / 1000);
  }
}



