import { Injectable } from "@nestjs/common";

@Injectable()
export class LocalPersistService {
    read(){        
        try{
            const fs = require('fs');
            var val = JSON.parse(fs.readFileSync('settings.json', 'utf8'));
            return val
        }catch{
            return {}
        }
    }

    persist(json){
        const fs = require('fs');
        fs.writeFileSync('settings.json', JSON.stringify(json));
    }
}