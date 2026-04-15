import { createDialog } from '@/utils/dialog'

export const useCreateDialog = () => {
  // 创建项目
  const createProjectDialog = async (options: Record<string, any> = {}) => {
    const { default: CreateProjectDialog } = await import('@/dialog/createProject.vue')
    return createDialog(CreateProjectDialog, options, {
      title: '创建项目',
      width: 600
    })
  }

  return {
    createProjectDialog
  }
}
