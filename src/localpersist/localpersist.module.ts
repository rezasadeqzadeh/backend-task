import { Module } from '@nestjs/common';
import { LocalPersistService } from './localpersist.service';

@Module({
  imports: [],
  providers: [LocalPersistService],
  exports: [LocalPersistService],
})
export class LocalPersistModule {}
