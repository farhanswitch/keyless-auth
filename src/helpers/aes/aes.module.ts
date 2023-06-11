import { Module } from '@nestjs/common';
import { AesService } from './services/aes.service';

@Module({
  providers: [AesService],
  exports: [AesService],
})
export class AesModule {}
