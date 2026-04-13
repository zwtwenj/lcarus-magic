import { Controller, Post, Body, Query, ParseIntPipe, Logger, Inject } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
