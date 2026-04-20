import { defineStore } from 'pinia'
import { getProjectInfo } from '../api/project'

interface Segment {
  sort: number
  text: string
  sound: string | null
}

interface VoiceParameters {
  volume?: number
  rate?: number
  pitch?: number
  role?: string
  emotion?: string
}

interface ProjectData {
  id?: number
  name?: string
  text?: string
  description?: string
  status?: string
  createdAt?: string
  segments?: Segment[]
  voiceId?: string
  parameters?: VoiceParameters
}

interface MenuItem {
  key: string
  label: string
  icon: string
}

export const useProjectStore = defineStore('project', {
  state: () => ({
    // 项目id
    projectId: '',
    // 项目数据
    projectData: {} as ProjectData,
    // 项目菜单，包含总览、文案、素材、音效等
    menu: [
      { key: 'overview', label: '总览', icon: 'House' },
      { key: 'text', label: '文本', icon: 'Document' },
      { key: 'materials', label: '素材', icon: 'Picture' },
      { key: 'sound', label: '声音', icon: 'Microphone' }
    ] as MenuItem[],
    // 当前菜单
    currentMenu: 'overview'
  }),
  actions: {
    async fetchProjectDetail(projectId: number) {
      try {
        const project = await getProjectInfo(projectId)
        this.projectId = projectId.toString()
        this.projectData = project
        return project
      } catch (error) {
        console.error('获取项目详情失败:', error)
        throw error
      }
    }
  }
})
