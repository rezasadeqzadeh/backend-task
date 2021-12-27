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
import { Chart, ChartKey } from 'src/chart/chart.interface';
import { ethers } from 'ethers';
import { formatEther } from 'ethers/lib/utils';
import { LocalPersistService } from 'src/localpersist/localpersist.service';

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
  }

  onModuleInit() {
    // start events listers
    this.listenToEvents();

    // fetch data from compound's the graph
    this.fetchFromTheGraph();
  }

  async listenToEvents() {
    // loop over each market and start listening to Mint and Reedem Event and long in console
    var marketAddresses = this.configService.get("marketAddresses");
    marketAddresses.forEach((address: string) => {
      var contract = this.getContract(address);
      
      contract.on("Mint", (minter, mintAmount, mintTokens) => {
        var timestamp = new Date();
        timestamp.setUTCMinutes(0,0,0);
        var amount = mintAmount.getValue();
        console.log("bigDecimal amount:", amount);
        this.updateTotalSupply(address, timestamp.getTime(), mintAmount);
        this.localPersistService.persist({lastFetchTime : new Date().getTime()});
        console.log("saved lastFetchTime in settings");    
        console.log(`Mint Event,\t  market:${address} minter: ${minter} amount: ${formatEther(mintAmount)} mintTokens: ${mintTokens} `);
      });

      contract.on("Redeem", (redeemer, redeemAmount, redeemTokens) => {
        console.log(`Redeem Event \t market:${address} redeemer: ${redeemer} amount: ${formatEther(redeemAmount)} redeemTokens: ${redeemTokens} `);
      });
    });
  }


  async fetchFromTheGraph() {
    // fetch, transform and save data from compound's the graph
    // playground: https://thegraph.com/hosted-service/subgraph/graphprotocol/compound-v2?selected=playground
    var marketAddresses = this.configService.get("marketAddresses");
    this.clientMetadata
      .query({
        query: gql(this.getFetchQuery()),
      }).then((result) => {
        result.data.mintEvents.forEach(element => {
          var cTokenContractAddress = element["from"];
          //needed to perisst this evnet?
          if (marketAddresses.indexOf(cTokenContractAddress) !== -1) {
            this.groupByHour(element);
          }
        });
        this.storeAllTotalSupply();
        console.log("Successfully retrived Mint events, Rows:", result.data.mintEvents.length);
      }).catch((err: TypeError) => {
        console.log('Error fetching data: ', err);
      });
  }

  //groupByHour preprcess and aggreagate mint data 
  groupByHour(element) {
    var date = new Date(element['blockTime'] * 1000);  
    date.setUTCMinutes(0,0,0);
    var cTokenAddress = element["from"];

    if (this.totalSupplyByHour[cTokenAddress] == undefined){
      this.totalSupplyByHour[cTokenAddress] = new Map<number, number>();
    }
    var oldValue = parseFloat(this.totalSupplyByHour[cTokenAddress][date.getTime()]) || 0;
    var newValue = parseFloat(element['amount']);
    this.totalSupplyByHour[cTokenAddress][date.getTime()] = oldValue + newValue;
  }

  //storeAllTotalSupply store all mint amount values
  async storeAllTotalSupply() {
    for (const [marketAddress, hours ] of Object.entries(this.totalSupplyByHour)) {
      console.log("persisting for market: ", marketAddress);
      for (const [timestamp, amount] of Object.entries(hours)){
        this.updateTotalSupply(marketAddress, parseInt(timestamp), parseFloat(amount+""));
      };
    };
    this.localPersistService.persist({lastFetchTime : new Date().getTime()});
    console.log("saved lastFetchTime in settings");          
  }

  //updateTotalSupply upsert one total supply item in the chart table  
  updateTotalSupply(marketAddress: string, timestamp: number, amount: number) {
    console.log("persisting total supply, market:", marketAddress, " timestamp:", timestamp, " amount:", amount);
    var chartPoints = this.chartService.findByAddressAndTimestamp(marketAddress, timestamp);
    chartPoints
    .then( (result) => {
      if (result.count == 0){
        const c: Chart = {
          id: uuid(),
          timestamp: timestamp,
          value: amount,
          address: marketAddress
        }
    
        this.chartService.create(c).then(() => {
          console.log("Chart Point created successfully. Market:", marketAddress," Timestamp:", timestamp, " Amount:", amount);
        }).catch(err => {
            console.log("Error in creating total supply, err:", err);
        });
      }else{
        //update chartPoint
        const c  = {
          value: amount + result[0]["value"]
        }
        var chartKey : ChartKey = {
            id: result[0]["id"],
            timestamp: result[0]["timestamp"]
        }
        this.chartService.update(chartKey, c).then(() => {
          console.log("Chart Point updated successfully. Market:", marketAddress," Timestamp:", timestamp, " Amount:", amount);
        }).catch(err => {
            console.log("Error in updating total supply, err:", err);
        });
      }
    })
    .catch( (err) => {
      console.log(err);
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
    var netName = this.configService.get("netName");

    const provider = new ethers.providers.InfuraProvider(netName, this.configService.get("infuraProjectId"));
    const abi = JSON.parse(readFileSync(this.configService.get("abiPath"), 'utf8'));
    const contract = new ethers.Contract(marketAddress, abi, provider);

    contract.name().then(n => {
      console.log(n);
    }).catch((e: TypeError) => {
      console.log("Error in connecting to contract ", marketAddress, e);
    });
    return contract;
  }

  //lastFetchTime return the last time successfully retrieved graph data or event received.
  //due to the multiple stop/start application we need to prevent duplicate insert the total supply 
  //in the db so, we save the last fetch time.
  //event listeners also will update the lastFetchTime after event income.
  //for the first time the lastFetchTime is the beginning of the current day.
  lastFetchTime() {
    var start = this.localPersistService.read()["lastFetchTime"];
    if (start == undefined) {
      var now = new Date();
      now.setUTCHours(0, 0, 0, 0);
      return Math.floor(now.getTime() / 1000);
    }
    return Math.floor(start / 1000);
  }
}

