import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  // 核心逻辑：在激活守卫前进行检查
  canActivate(context: ExecutionContext) {
    // 1. 检查是否有 @Public() 装饰器
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 2. 如果有，直接放行（跳过 JWT 验证）
    if (isPublic) {
      return true;
    }

    // 3. 如果没有，执行默认的 JWT 验证逻辑
    return super.canActivate(context);
  }
}