import { ConfigModule } from '@nestjs/config';

export enum LIST_MODE {
  local = 'local',
}

export function configFactory(mode: keyof typeof LIST_MODE) {
  return ConfigModule.forRoot({
    envFilePath: `${process.cwd()}/env/${mode}.env`,
    isGlobal: true,
  });
}
