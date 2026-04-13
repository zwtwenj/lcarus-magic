import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Injectable,
    Logger,
    LoggerService,
} from '@nestjs/common';
import { Response, Request } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
    catch(exception: HttpException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        // http状态码
        const status = exception.getStatus();
        response.status(status).json({
            code: status,
            message: exception.message,
            path: request.url,
            method: request.method,
            timestamp: new Date().toISOString(),
        });
    }
}
