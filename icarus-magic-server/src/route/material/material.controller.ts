import { Controller, Post, Body, Req, UseGuards, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../transform/jwt-auth.guard';
import { MaterialService } from './material.service';

@Controller('material')
export class MaterialController {
  constructor(private materialService: MaterialService) {}

  @Post('add')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadMaterial(
    @Body('projectId') projectId: string,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.materialService.uploadMaterial(projectId, file, userId);
  }

  @Post('list')
  @UseGuards(JwtAuthGuard)
  async getProjectMaterials(
    @Body('projectId') projectId: string,
    @Body('type') type: string,
    @Body('keyword') keyword: string,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.materialService.getProjectMaterials(projectId, type, keyword, userId);
  }

  @Post('detail')
  @UseGuards(JwtAuthGuard)
  async getMaterialDetail(
    @Body('materialId') materialId: string,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.materialService.getMaterialDetail(materialId, userId);
  }

  @Post('delete')
  @UseGuards(JwtAuthGuard)
  async deleteMaterial(
    @Body('projectId') projectId: string,
    @Body('materialId') materialId: string,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.materialService.deleteMaterial(projectId, materialId, userId);
  }

  @Post('rename')
  @UseGuards(JwtAuthGuard)
  async renameMaterial(
    @Body('projectId') projectId: string,
    @Body('materialId') materialId: string,
    @Body('newName') newName: string,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.materialService.renameMaterial(projectId, materialId, newName, userId);
  }

  @Post('tag')
  @UseGuards(JwtAuthGuard)
  async tagMaterialImage(
    @Body('projectId') projectId: string,
    @Body('materialId') materialId: string,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.materialService.tagMaterialImage(projectId, materialId, userId);
  }

  @Post('updateTags')
  @UseGuards(JwtAuthGuard)
  async updateMaterialTags(
    @Body('projectId') projectId: string,
    @Body('materialId') materialId: string,
    @Body('tags') tags: string[],
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.materialService.updateMaterialTags(projectId, materialId, tags, userId);
  }
}
