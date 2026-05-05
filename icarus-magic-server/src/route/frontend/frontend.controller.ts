import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { join } from 'path';
import { Public } from '../../transform/public.decorator';

@Controller()
@Public()
export class FrontendController {
  private getPublicPath(): string {
    return join(process.cwd(), 'public');
  }

  @Get()
  serveRoot(@Res() res: Response) {
    res.sendFile('index.html', { root: this.getPublicPath() });
  }

  @Get('projects')
  serveProjects(@Res() res: Response) {
    res.sendFile('index.html', { root: this.getPublicPath() });
  }

  @Get('projects/*')
  serveProjectsAll(@Res() res: Response) {
    res.sendFile('index.html', { root: this.getPublicPath() });
  }

  @Get('projectSpace')
  serveProjectSpace(@Res() res: Response) {
    res.sendFile('index.html', { root: this.getPublicPath() });
  }

  @Get('projectSpace/*')
  serveProjectSpaceAll(@Res() res: Response) {
    res.sendFile('index.html', { root: this.getPublicPath() });
  }

  @Get('tasks')
  serveTasks(@Res() res: Response) {
    res.sendFile('index.html', { root: this.getPublicPath() });
  }

  @Get('login')
  serveLogin(@Res() res: Response) {
    res.sendFile('index.html', { root: this.getPublicPath() });
  }
}
