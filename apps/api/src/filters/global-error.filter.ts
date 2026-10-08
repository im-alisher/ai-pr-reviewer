import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { isReviewerError } from '@ai-pr-reviewer/shared';

type HttpErrorResponse = {
  status(code: number): { json(body: unknown): unknown };
};

@Catch()
export class GlobalErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<HttpErrorResponse>();

    if (isReviewerError(exception)) {
      response.status(exception.status).json({
        statusCode: exception.status,
        code: exception.code,
        message: exception.message,
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const payload: Record<string, unknown> =
        typeof body === 'string'
          ? { statusCode: status, code: 'http_error', message: body }
          : {
              code: 'http_error',
              ...(typeof body === 'object' && body !== null ? body : {}),
              statusCode: status,
            };
      if (Array.isArray(payload.message)) {
        payload.message = (payload.message as unknown[]).join(' ');
      }
      response.status(status).json(payload);
      return;
    }

    console.error('[api] unhandled error:', exception);
    response.status(500).json({
      statusCode: 500,
      code: 'internal_error',
      message: 'Internal server error',
    });
  }
}
