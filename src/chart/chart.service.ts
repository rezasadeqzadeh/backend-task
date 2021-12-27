import { Injectable } from '@nestjs/common';
import { InjectModel, Model } from 'nestjs-dynamoose';
import { Chart, ChartKey } from './chart.interface';

@Injectable()
export class ChartService {
  constructor(
    @InjectModel('Chart')
    public chartModel: Model<Chart, ChartKey>,
  ) {}

  create(chart: Chart) {
    return this.chartModel.create(chart);
  }

  update(key: ChartKey, chart: Partial<Chart>) {
    return this.chartModel.update(key, chart);
  }

  findOne(key: ChartKey) {
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
    var query = this.chartModel
      .query('address')    
      .eq(address)
      .where('timestamp')
      .ge(Date.now() - 8.64e7)
    if (limitFields){
      query.attributes(["value", "timestamp"])
    }
    return query.exec()
  }

  findAll() {
    return this.chartModel.scan().exec();
  }
}

