import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  StreamableFile,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    return next.handle().pipe(
      map((data) => {
        // Si alguna ruta devuelve archivo/stream (ej: PDF), NO lo envolvemos.
        if (data instanceof StreamableFile) return data;

        return {
          statusCode: response.statusCode,
          timestamp: new Date().toISOString(),
          path: request.url,
          method: request.method,
          data,
        };
      }),
    );
  }
}
