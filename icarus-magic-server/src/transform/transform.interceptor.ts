import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// 定义你想要的返回格式
export interface Response<T> {
  code: number;
  message: string;
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    // next.handle() 代表原本 Controller 返回的数据
    return next.handle().pipe(
      map(data => ({
        // 在这里统一封装格式
        code: 100, // 你定义的“正常”状态码
        message: '请求成功',
        data: data,
      })),
    );
  }
}