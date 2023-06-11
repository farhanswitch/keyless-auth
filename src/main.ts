import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app/app.module';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: ($origin, cb) => {
      if (true) {
        cb(null, true);
      } else {
        cb(new Error('Not allowed by CORS'));
      }
    },
    credentials: true, // << totally ruins it
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
  app.use(cookieParser());
  await app.listen(3000);
}
bootstrap();
