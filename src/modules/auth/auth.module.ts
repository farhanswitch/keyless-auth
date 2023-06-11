import { Module } from '@nestjs/common';
import { AesModule } from 'src/helpers/aes/aes.module';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';

@Module({
  imports: [AesModule],
  providers: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
