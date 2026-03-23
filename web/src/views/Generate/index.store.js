import { defineStore } from 'pinia'

// 视频生成配置状态管理
export const useGenerateStore = defineStore('generate', {
    state: () => {
        return {
            // 加载状态
            generateLoading: false,
            // 字幕配置
            subtitleType: 'auto',
            subtitleSize: 24,
            subtitleColor: '#ffffff',
            subtitleContent: '',  
            // 声音配置
            /** 自定义 `custom`；预设参考音 `default:<sounds.id>` */
            voiceType: '',
            voiceSpeed: 1,
            voiceVolume: 80,
            backgroundMusic: 'happy',
            // 素材配置
            materialType: 'auto',
            videoDuration: '30',
            materialList: [],
        }
    },
    actions: {
        generateVideo: async () => {
            state.generateLoading = true
            try {
                // 这里可以实现视频生成的逻辑
                console.log('生成视频配置:', {
                    subtitleType: state.subtitleType,
                    subtitleSize: state.subtitleSize,
                    subtitleColor: state.subtitleColor,
                    subtitleContent: state.subtitleContent,
                    voiceType: state.voiceType,
                    voiceSpeed: state.voiceSpeed,
                    voiceVolume: state.voiceVolume,
                    backgroundMusic: state.backgroundMusic,
                    materialType: state.materialType,
                    videoDuration: state.videoDuration,
                    materialList: state.materialList
                })
                // 模拟成功
                return Promise.resolve({ success: true, message: '视频生成任务已提交' })
            } catch (error) {
                console.error('视频生成失败:', error)
                return Promise.reject({ success: false, message: '视频生成失败' })
            } finally {
                state.generateLoading = false
            }
        },
        handleMaterialChange: (file, fileList) => {
            state.materialList = fileList
            console.log('Material changed:', file, fileList)
        },
        handleExceed: (files, fileList) => {
            console.warn('最多只能上传5个文件')
            return false
        }
    }
})
