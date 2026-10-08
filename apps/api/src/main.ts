import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { readEnv } from './env';

async function bootstrap(): Promise<void> {
  const env = readEnv();
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({ origin: env.corsOrigins });
  await app.listen(env.port);
}

void bootstrap().catch((error: unknown) => {
  console.error('Failed to start API', error);
  process.exit(1);
});
