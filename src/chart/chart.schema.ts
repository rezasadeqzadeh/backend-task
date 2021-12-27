import * as dynamoose from "dynamoose";

export const ChartSchema = new dynamoose.Schema({
  id: {
    // any unique id of your choice
    // i.e. address-timestamp
    type: String,
    hashKey: true
  },
  timestamp: {
    // the timestamp of the current hour always normalized to
    // the start minute of each hour i.e. 08:00-08:59 = 08:00:00
    type: Number,
    required: true,
    index: {      
      global: true,
    },
  },
  value: {
    // the supply amount in the current hour
    type: Number
  },
  address: {
    // the address of the supply contract
    type: String,
    required: true,
    index: {
      "global": true,
      rangeKey: "timestamp",
    }
  }
});