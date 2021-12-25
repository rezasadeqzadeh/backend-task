import { Controller, Get, Param } from "@nestjs/common";
import { isAddress } from "ethers/lib/utils";
import { ChartService } from "./chart.service";

@Controller("chart")
export class ChartController{
    constructor(private readonly chartService : ChartService){

    };

    @Get("supply/:address")
    getSupplyData(@Param("address") address){
        return this.chartService.findMany(address);
    }

}