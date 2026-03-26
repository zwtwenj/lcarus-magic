import { defineStore } from 'pinia'
import { oneClickGenerate } from '../../api/generate'

// 视频生成配置状态管理
export const useGenerateStore = defineStore('generate', {
    state: () => {
        return {
            generateLoading: false,
            subtitleType: '',
            subtitleSize: 24,
            subtitleColor: '#ffffff',
            subtitleContent: '',
            subtitleSegments: [''],
            /** 参考音公网 URL：预设为选项 ossUrl，自定义上传后同为该字段 */
            voiceUrl: '',
            voiceSpeed: 1,
            voiceVolume: 80,
            backgroundMusic: 'happy',
            materialType: 'auto',
            videoDuration: '30',
            materialList: [],
        }
    },
    actions: {
        /** POST /api/generate：subtitle_segments + voice_url */
        async generateVideo() {
            const lines = this.subtitleSegments
                .map((s) => String(s ?? '').trim())
                .filter(Boolean)

            const voice_url = String(this.voiceUrl ?? '').trim()
            const materialList = (this.materialList || [])
                .map((m) => {
                    if (typeof m === 'string') return m.trim()
                    return String(m?.ossUrl || m?.url || '').trim()
                })
                .filter(Boolean)

            if (!voice_url || !/^https?:\/\//i.test(voice_url)) {
                throw new Error('请选择预设语音或上传自定义参考音频')
            }
            if (lines.length === 0) {
                throw new Error('请至少保留一条有效字幕')
            }

            const subtitleType = String(this.subtitleType ?? '').trim()

            this.generateLoading = true
            try {
                const { data } = await oneClickGenerate({
                    voice_url,
                    subtitle_segments: lines,
                    materialList,
                    ...(subtitleType ? { subtitles_type: subtitleType } : {}),
                })
                return data
            } catch (e) {
                const msg =
                    e?.response?.data?.message ||
                    e?.response?.data?.detail ||
                    e?.message ||
                    '生成失败'
                throw new Error(msg)
            } finally {
                this.generateLoading = false
            }
        },
        handleMaterialChange(file, fileList) {
            this.materialList = fileList
            console.log('Material changed:', file, fileList)
        },
        handleExceed(files, fileList) {
            console.warn('最多只能上传5个文件')
            return false
        },
    },
})
