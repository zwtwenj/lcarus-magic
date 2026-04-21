import { createDialog } from '@/utils/dialog.ts'

export const useCreateDialog = () => {
  // 创建项目
  const createProjectDialog = async (options: Record<string, any> = {}) => {
    const { default: CreateProjectDialog } = await import('@/dialog/createProject.vue')
    return createDialog(CreateProjectDialog, options, {
      title: '创建项目',
      width: 600
    })
  }

  // 打开素材详情
  const openMaterialInfoDialog = async (options: Record<string, any> = {}) => {
    const { default: MaterialInfoDialog } = await import('@/dialog/materialInfo.vue')
    return createDialog(MaterialInfoDialog, options, {
      title: '素材信息',
      width: 1200
    })
  }

  return {
    createProjectDialog,
    openMaterialInfoDialog
  }
}
