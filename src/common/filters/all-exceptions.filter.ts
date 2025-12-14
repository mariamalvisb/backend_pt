import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();

    // Base
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: any = 'Internal server error';
    let errorName = exception?.name || 'Error';
    let details: any = undefined;

    // HttpException (Nest)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const r = exception.getResponse();

      if (typeof r === 'string') {
        message = r;
      } else {
        // típico: { message, error, statusCode }
        message = (r as any).message ?? exception.message ?? 'Error';
        details = r;
      }
    } else if (exception?.name?.includes('Prisma')) {
      // Prisma (sin importar tipos, para no romper builds)
      // https://www.prisma.io/docs/orm/reference/error-reference
      const code = exception?.code;
      details = {
        code,
        meta: exception?.meta,
      };

      if (code === 'P2002') {
        status = HttpStatus.CONFLICT;
        message = 'Conflicto: ya existe un registro con un valor único.';
      } else if (code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = 'No se encontró el registro solicitado.';
      } else if (code === 'P2003') {
        status = HttpStatus.CONFLICT;
        message = 'Conflicto: restricción de llave foránea.';
      } else {
        status = HttpStatus.BAD_REQUEST;
        message = exception?.message ?? 'Error de base de datos.';
      }
    } else if (exception?.message) {
      message = exception.message;
    }

    // Log
    this.logger.error(
      `[${req.method}] ${req.url} -> ${status} | ${errorName} | ${String(message)}`,
      exception?.stack,
    );

    res.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: req.url,
      method: req.method,
      error: errorName,
      message,
      ...(details ? { details } : {}),
    });
  }
}
