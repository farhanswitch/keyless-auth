import { Module } from '@nestjs/common';
import { configFactory } from './config.factory';
@Module({
  imports: [configFactory('local')],
})
export class ConfigsModule {}
