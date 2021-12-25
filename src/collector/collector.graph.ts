import axios, { AxiosResponse, AxiosError } from "axios";

export class GraphCollector {
    totalSupplyByHour = new Array<number>(24);
    constructor(){
        this.totalSupplyByHour.fill(0)
    }
    collect(){    

       axios.post("https://api.thegraph.com/subgraphs/name/graphprotocol/compound-v2",
       {
           query : `
           {
            mintEvents(
              where: {
                      blockTime_gt : 1640291400
              },
              first: 1000, 
              skip: 0, 
              orderBy : blockTime,
              orderDirection : asc)
            {
              amount
              blockTime
              cTokenSymbol
            }
          }
           `
       }
       )
       .then((result) => {
            result.data.data.mintEvents.forEach(element => {
                this.groupByHour(element);                
            });
            this.storeTotalSupply();
       })
       .catch((e) => {
            console.log(e);
       });    
    }

    groupByHour(item){    
        var date = new Date(item['blockTime']*1000);
        var hour = date.getHours();
        console.log("Hour:", hour);
        console.log("Value:", item['amount']);
        this.totalSupplyByHour[hour] += +item['amount'];
    }

    storeTotalSupply(){
        this.totalSupplyByHour.forEach( (value, index) => {
            console.log("Index:", index,  "Value" , value);    
            
        });
    }
}
