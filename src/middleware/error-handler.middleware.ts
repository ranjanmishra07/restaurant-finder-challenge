import type { FastifyInstance } from 'fastify';
import { AppError } from '../utils/app-error.js';
import {
  resolveClientErrorMessage,
  resolveValidationErrorMessage,
} from '../utils/api-error-messages.js';

type HandlerError = Error & {
  statusCode?: number;
  code?: string;
  validation?: Array<{ keyword: string }>;
};

function toHandlerError(error: unknown): HandlerError {
  if (error instanceof Error) {
    return error as HandlerError;
  }
  return new Error(String(error));
}

function resolveStatusCode(error: HandlerError): number {
  if (error instanceof AppError) {
    return error.statusCode;
  }
  if (typeof error.statusCode === 'number' && error.statusCode >= 400) {
    return error.statusCode;
  }
  return 500;
}

function resolveMessage(error: HandlerError, statusCode: number): string {
  if (error instanceof AppError) {
    return error.message;
  }
  if (error.code === 'FST_ERR_VALIDATION') {
    return resolveValidationErrorMessage(error);
  }
  return resolveClientErrorMessage(error, statusCode);
}

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    if (reply.sent) {
      return;
    }

    const handlerError = toHandlerError(error);
    const statusCode = resolveStatusCode(handlerError);
    const message = resolveMessage(handlerError, statusCode);

    if (statusCode >= 500) {
      request.log.error({ err: error }, 'request failed');
    } else {
      request.log.info({ err: error, statusCode }, 'client request rejected');
    }

    reply.status(statusCode).send({ message });
  });
}
