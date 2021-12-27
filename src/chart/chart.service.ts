import { Injectable } from '@nestjs/common';
import { QueryResponse } from 'dynamoose/dist/DocumentRetriever';
import { SortOrder } from 'dynamoose/dist/General';
import { InjectModel, Model } from 'nestjs-dynamoose';
import { Chart, ChartKey } from './chart.interface';

@Injectable()
export class ChartService {
  constructor(
    @InjectModel('Chart')
    public chartModel: Model<Chart, ChartKey>,
  ) {}

  create(chart: Chart) :  Promise<Chart>{
    return this.chartModel.create(chart);
  }

  update(key: ChartKey, chart: Partial<Chart>) {
    return this.chartModel.update(key, chart);
  }

  findOne(key: ChartKey) : Promise<Chart>{
    return this.chartModel.get(key);
  }

  findByAddressAndTimestamp(address : string, timestamp : number) {
    return this.chartModel
      .query("address")
      .eq(address)
      .where("timestamp")
      .eq(timestamp).
      exec();
  }
  
  // useful for API endpoint
  findMany(address: string, limitFields : boolean) {    
    let query = this.chartModel
      .query('address')    
      .eq(address)
      .where('timestamp')
      .ge(Date.now() - 8.64e7)     
    if (limitFields){
      query.attributes(["value", "timestamp"])
    }
    query.sort(SortOrder.ascending)
    return query.exec()
  }

  findAll() {
    return this.chartModel.scan().exec();
  }
}

