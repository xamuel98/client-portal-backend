import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: any;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  Response<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        const response = {
          success: true,
          message: data?.message || 'Operation successful',
          data: data?.data ?? data,
          meta: data?.meta
            ? {
                timestamp: new Date().toISOString(),
                ...data.meta,
              }
            : {
                timestamp: new Date().toISOString(),
              },
        };

        if (data?.meta) {
          console.log(
            '[TransformInterceptor] Meta found and mapped:',
            JSON.stringify(response.meta),
          );
        }

        return response;
      }),
    );
  }
}
