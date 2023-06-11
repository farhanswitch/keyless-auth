import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigsModule } from 'src/configs/configs.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ConfigsModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
