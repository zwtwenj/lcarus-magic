import { SetMetadata } from '@nestjs/common';

// 定义一个元数据 key
export const IS_PUBLIC_KEY = 'isPublic';

// 创建装饰器
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);