import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@ai-pr-reviewer/shared';

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: 'ai-pr-reviewer-api',
      time: new Date().toISOString(),
    };
  }
}
