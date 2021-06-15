import { Injectable, OnModuleInit } from '@nestjs/common';

import {
  ApolloClient,
  gql,
  HttpLink,
  InMemoryCache,
  NormalizedCacheObject,
} from '@apollo/client/core';
import fetch from 'cross-fetch';
import { ChartService } from '../chart/chart.service';

const getLatestIndexedBlock = `
query {
  indexingStatusForCurrentVersion(subgraphName: "graphprotocol/compound-v2") { chains { latestBlock { hash number }}}
}
`;

@Injectable()
export class CollectorService implements OnModuleInit {
  clientMetadata: ApolloClient<NormalizedCacheObject>;
  // add your own properties

  constructor(private readonly chartService: ChartService) {
    this.clientMetadata = new ApolloClient({
      cache: new InMemoryCache(),
      link: new HttpLink({
        uri: 'https://api.thegraph.com/index-node/graphql',
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
    // start event listeners
  }

  async fetchFromTheGraph() {
    // Simplified example on how to get currently synced block number on compound's the graph.
    // This is useful for BONUS if you decide to update the data from the event listener.
    // You need to sychnronize the current blocks so no events are missed before GQL data is parsed
    // and listener started to listen.
    this.clientMetadata
      .query({
        query: gql(getLatestIndexedBlock),
      })
      .then((data) =>
        console.log(
          'Latest block: ',
          data.data.indexingStatusForCurrentVersion.chains[0].latestBlock
            .number,
        ),
      )
      .catch((err) => {
        console.log('Error fetching data: ', err);
      });

    // fetch, transform and save data from compound's the graph
  }
}
