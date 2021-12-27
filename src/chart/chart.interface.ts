import { Exclude } from "class-transformer";

export interface ChartKey {// holds the hashKey/partition key
  id: string;
  timestamp: number;
}

export interface Chart extends ChartKey {
  value: number;
  address: string;
}
