import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../transform/jwt-auth.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './auth.dto';
import { Public } from '../../transform/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('/login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // 根据token获取用户信息
  @Post('/getUser')
  @UseGuards(JwtAuthGuard)
  getUser(@Req() req: any) {
    return {
      user: req.user
    };
  }
}
