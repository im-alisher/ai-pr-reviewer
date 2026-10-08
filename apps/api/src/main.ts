import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const corsOrigin = process.env.CORS_ORIGIN;
  app.enableCors(corsOrigin ? { origin: corsOrigin.split(',') } : { origin: true });
  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
}

void bootstrap().catch((error: unknown) => {
  console.error('Failed to start API', error);
  process.exit(1);
});
