import { ref, computed } from 'vue'

// 视频生成配置状态管理
export function useGenerateStore() {
    // 加载状态
    const generateLoading = ref(false)
    
    // 字幕配置
    const subtitleType = ref('auto')
    const subtitleSize = ref(24)
    const subtitleColor = ref('#ffffff')
    const subtitleContent = ref('')
    
    // 声音配置
    const voiceType = ref('female')
    const voiceSpeed = ref(1)
    const voiceVolume = ref(80)
    const backgroundMusic = ref('happy')
    
    // 素材配置
    const materialType = ref('auto')
    const videoDuration = ref('30')
    const materialList = ref([])
    
    // 生成视频函数
    async function generateVideo() {
        generateLoading.value = true
        try {
            // 这里可以实现视频生成的逻辑
            console.log('生成视频配置:', {
                subtitleType: subtitleType.value,
                subtitleSize: subtitleSize.value,
                subtitleColor: subtitleColor.value,
                subtitleContent: subtitleContent.value,
                voiceType: voiceType.value,
                voiceSpeed: voiceSpeed.value,
                voiceVolume: voiceVolume.value,
                backgroundMusic: backgroundMusic.value,
                materialType: materialType.value,
                videoDuration: videoDuration.value,
                materialList: materialList.value
            })
            // 模拟成功
            return Promise.resolve({ success: true, message: '视频生成任务已提交' })
        } catch (error) {
            console.error('视频生成失败:', error)
            return Promise.reject({ success: false, message: '视频生成失败' })
        } finally {
            generateLoading.value = false
        }
    }
    
    // 素材上传处理函数
    function handleMaterialChange(file, fileList) {
        materialList.value = fileList
        console.log('Material changed:', file, fileList)
    }
    
    function handleExceed(files, fileList) {
        console.warn('最多只能上传5个文件')
        return false
    }
    
    return {
        // 状态
        generateLoading,
        // 字幕配置
        subtitleType,
        subtitleSize,
        subtitleColor,
        subtitleContent,
        // 声音配置
        voiceType,
        voiceSpeed,
        voiceVolume,
        backgroundMusic,
        // 素材配置
        materialType,
        videoDuration,
        materialList,
        // 方法
        generateVideo,
        handleMaterialChange,
        handleExceed
    }
}
