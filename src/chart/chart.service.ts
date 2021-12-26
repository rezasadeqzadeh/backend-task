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
    this.chartModel
    .query('address')
    .eq(address)
    .where('timestamp')
    .eq(timestamp)
    .exec( (error , result) => {
      if(error){
        console.log("error in fetching chartModel, err", error);
        return [];
      }else{
        return result; 
      }
    });
    return [];
  }
  
  // useful for API endpoint
  findMany(address: string, inLast?: 'day') {
    return this.chartModel
      .query('address')
      .eq(address)
      .where('timestamp')
      .ge(Date.now() - 8.64e7) // get results from last day
      .exec();
  }

  findAll() {
    return this.chartModel.scan().exec();
  }
}
