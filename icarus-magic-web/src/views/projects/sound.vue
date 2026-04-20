<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useProjectStore } from '@/store/project.store'
import { getVoiceList, type VoiceItem } from '@/api/voice'
import { generateSound, generateProjectSounds, type GenerateSoundRequest, type Segment } from '@/api/sound'
import { getTaskStatus } from '@/api/task'
import { ElForm, ElFormItem, ElSelect, ElOption, ElMessage, ElCard, ElSlider, ElTag, ElButton } from 'element-plus'

const projectStore = useProjectStore()

const segments = computed(() => {
  return projectStore.projectData.segments || []
})

const voiceList = ref<VoiceItem[]>([])
const selectedVoice = ref<string | null>(null)
const loading = ref(false)
const previewAudios = ref<Record<number, string>>({})
const previewLoading = ref<Record<number, boolean>>({})
const currentPlaying = ref<number | null>(null)
const audioElement = ref<HTMLAudioElement | null>(null)
const generatingAll = ref(false)

const voiceConfig = ref({
  volume: 50,
  rate: 1,
  pitch: 1,
  emotion: 'neutral' as 'neutral' | 'happy' | 'sad' | 'angry' | 'surprise'
})

const emotionOptions = [
  { label: 'neutral', value: 'neutral', tagType: 'info' as const },
  { label: 'happy', value: 'happy', tagType: 'success' as const },
  { label: 'sad', value: 'sad', tagType: 'warning' as const },
  { label: 'angry', value: 'angry', tagType: 'danger' as const },
  { label: 'surprise', value: 'surprise', tagType: 'warning' as const }
]

const getEmotionLabel = (emotion: string) => {
  const labels: Record<string, string> = {
    neutral: '一般',
    happy: '开心',
    sad: '悲伤',
    angry: '生气',
    surprise: '惊讶'
  }
  return labels[emotion] || emotion
}

// 监听项目数据变化
watch(
  () => projectStore.projectData,
  (newData) => {
    // 如果项目有保存的 voiceId 和 parameters，则恢复
    if (newData.voiceId) {
      selectedVoice.value = newData.voiceId
    }
    if (newData.parameters) {
      const params = newData.parameters
      voiceConfig.value = {
        volume: params.volume ?? 50,
        rate: params.rate ?? 1,
        pitch: params.pitch ?? 1,
        emotion: (params.emotion as 'neutral' | 'happy' | 'sad' | 'angry' | 'surprise') ?? 'neutral'
      }
    }
    // 用 segments 的数据初始化试听数组
    const segments = newData.segments || []
    segments.forEach((segment: Segment) => {
      if (segment.sound) {
        previewAudios.value[segment.sort] = segment.sound
      }
    })
  },
  { deep: true, immediate: true }
)

onMounted(async () => {
  await fetchVoiceList()
})

const fetchVoiceList = async () => {
  loading.value = true
  try {
    voiceList.value = await getVoiceList()
  } catch (error) {
    console.error('获取音声列表失败:', error)
    ElMessage.error('获取音声列表失败')
  } finally {
    loading.value = false
  }
}

const generatePreviewVoice = async (segment: any) => {
  if (!selectedVoice.value) {
    ElMessage.warning('请先选择音声')
    return
  }

  previewLoading.value[segment.sort] = true
  try {
    const request: GenerateSoundRequest = {
      voiceId: selectedVoice.value,
      text: segment.text,
      projectId: projectStore.projectData.id!,
      parameters: voiceConfig.value
    }

    const response = await generateSound(request)
    const taskId = response.taskId

    // 轮询查询任务状态
    const pollTask = async () => {
      try {
        const statusResponse = await getTaskStatus(taskId)
        
        if (statusResponse.status === 'completed') {
          previewAudios.value[segment.sort] = statusResponse.res.url
          ElMessage.success('试听语音生成成功')
        } else if (statusResponse.status === 'failed') {
          ElMessage.error('试听语音生成失败')
        } else {
          // 继续轮询
          setTimeout(pollTask, 1000)
        }
      } catch (error) {
        console.error('查询任务状态失败:', error)
        ElMessage.error('查询任务状态失败')
      } finally {
        previewLoading.value[segment.sort] = false
      }
    }

    pollTask()
  } catch (error) {
    console.error('生成试听语音失败:', error)
    ElMessage.error('生成试听语音失败')
    previewLoading.value[segment.sort] = false
  }
}

const playPreviewVoice = (sort: number) => {
  // 查找对应的 segment
  const segment = segments.value.find(s => s.sort === sort)
  // 优先使用 segment.sound，其次使用 previewAudios
  const audioUrl = segment?.sound || previewAudios.value[sort]
  if (!audioUrl) {
    ElMessage.warning('请先生成试听语音')
    return
  }

  // 停止当前播放
  if (audioElement.value) {
    audioElement.value.pause()
    audioElement.value.currentTime = 0
  }

  // 如果点击的是当前播放的，则停止
  if (currentPlaying.value === sort) {
    currentPlaying.value = null
    return
  }

  // 播放新的音频
  audioElement.value = new Audio(audioUrl)
  currentPlaying.value = sort
  
  audioElement.value.onended = () => {
    currentPlaying.value = null
  }

  audioElement.value.onerror = () => {
    ElMessage.error('播放音频失败')
    currentPlaying.value = null
  }

  audioElement.value.play()
}

const generateAndSaveAll = async () => {
  if (!selectedVoice.value) {
    ElMessage.warning('请先选择音声')
    return
  }

  if (segments.value.length === 0) {
    ElMessage.warning('暂无文案段落')
    return
  }

  generatingAll.value = true
  try {
    const request = {
      voiceId: selectedVoice.value,
      segments: segments.value,
      projectId: projectStore.projectData.id!,
      parameters: voiceConfig.value
    }

    const response = await generateProjectSounds(request)
    const taskId = response.taskId

    ElMessage.success('开始生成语音，请稍候...')

    // 轮询查询任务状态
    const pollTask = async () => {
      try {
        const statusResponse = await getTaskStatus(taskId)

        if (statusResponse.status === 'completed') {
          ElMessage.success('语音生成并保存成功')
          // 刷新项目数据
          await projectStore.fetchProjectDetail(projectStore.projectData.id!)
          // 将生成的音频URL赋值给试听数组
          if (statusResponse.res && Array.isArray(statusResponse.res)) {
            statusResponse.res.forEach((segment: Segment) => {
              if (segment.sound) {
                previewAudios.value[segment.sort] = segment.sound
              }
            })
          }
        } else if (statusResponse.status === 'failed') {
          ElMessage.error('语音生成失败')
        } else {
          // 继续轮询
          setTimeout(pollTask, 3000)
        }
      } catch (error) {
        console.error('查询任务状态失败:', error)
        ElMessage.error('查询任务状态失败')
      } finally {
        generatingAll.value = false
      }
    }

    pollTask()
  } catch (error) {
    console.error('生成语音失败:', error)
    ElMessage.error('生成语音失败')
    generatingAll.value = false
  }
}
</script>

<template>
  <div class="project-sound">
    <h2>声音设置</h2>

    <div class="content-container">
      <div class="left-column">
        <div class="left-scroll">
          <el-card class="sound-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <h3>选择音声</h3>
              </div>
            </template>
            <el-form label-position="top">
              <el-form-item label="音声类型">
                <el-select
                  v-model="selectedVoice"
                  placeholder="请选择音声"
                  style="width: 100%"
                  :loading="loading"
                  class="voice-select"
                >
                  <el-option
                    v-for="voice in voiceList"
                    :key="voice.voiceId"
                    :label="voice.name"
                    :value="voice.voiceId"
                  >
                    <div class="voice-option">
                      <span class="voice-name">{{ voice.name }}</span>
                      <span v-if="voice.isDefault" class="default-tag">默认</span>
                    </div>
                  </el-option>
                </el-select>
              </el-form-item>
            </el-form>
          </el-card>

          <el-card class="config-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <h3>参数配置</h3>
              </div>
            </template>
            <el-form label-position="top" :disabled="!selectedVoice">
              <el-form-item label="音量">
                <div class="config-item">
                  <el-slider v-model="voiceConfig.volume" :min="0" :max="100" />
                  <span class="config-value">{{ voiceConfig.volume }}</span>
                </div>
              </el-form-item>

              <el-form-item label="语速">
                <div class="config-item">
                  <el-slider v-model="voiceConfig.rate" :min="0.5" :max="2" :step="0.1" />
                  <span class="config-value">{{ voiceConfig.rate.toFixed(1) }}</span>
                </div>
              </el-form-item>

              <el-form-item label="音调">
                <div class="config-item">
                  <el-slider v-model="voiceConfig.pitch" :min="0.5" :max="2" :step="0.1" />
                  <span class="config-value">{{ voiceConfig.pitch.toFixed(1) }}</span>
                </div>
              </el-form-item>

              <el-form-item label="情感">
                <el-select v-model="voiceConfig.emotion" placeholder="请选择情感" style="width: 100%">
                  <el-option
                    v-for="option in emotionOptions"
                    :key="option.value"
                    :label="getEmotionLabel(option.value)"
                    :value="option.value"
                  >
                    <div class="emotion-option">
                      <el-tag :type="option.tagType" size="small">{{ getEmotionLabel(option.value) }}</el-tag>
                    </div>
                  </el-option>
                </el-select>
              </el-form-item>
            </el-form>
          </el-card>
        </div>
      </div>

      <div class="right-column">
        <div class="right-scroll">
          <el-card class="text-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <h3>文案段落</h3>
                <span class="paragraph-count">{{ segments.length }} 段</span>
              </div>
            </template>

            <div v-if="segments.length === 0" class="empty-text">
              <div class="empty-icon">📝</div>
              <p>暂无文案内容</p>
              <p class="empty-hint">请先在文案页面添加内容</p>
            </div>

            <div v-else class="paragraph-list">
              <div
                v-for="segment in segments"
                :key="segment.sort"
                class="paragraph-item"
              >
                <div class="paragraph-header">
                  <div class="paragraph-number">{{ segment.sort }}</div>
                  <div class="paragraph-info">
                    <span class="char-count">{{ segment.text.length }} 字</span>
                    <span v-if="segment.sound" class="has-voice-tag">
                      已生成语音
                    </span>
                  </div>
                  <div class="paragraph-actions">
                    <el-button
                      v-if="segment.sound || previewAudios[segment.sort]"
                      type="primary"
                      size="small"
                      :loading="previewLoading[segment.sort]"
                      @click="playPreviewVoice(segment.sort)"
                    >
                      {{ currentPlaying === segment.sort ? '停止' : '试听' }}
                    </el-button>
                    <el-button
                      type="default"
                      size="small"
                      :loading="previewLoading[segment.sort]"
                      @click="generatePreviewVoice(segment)"
                    >
                      {{ segment.sound || previewAudios[segment.sort] ? '重新生成' : '生成试听' }}
                    </el-button>
                  </div>
                </div>
                <div class="paragraph-content">{{ segment.text }}</div>
              </div>
            </div>

            <div class="generate-all-section">
              <el-button
                type="primary"
                size="large"
                :loading="generatingAll"
                :disabled="!selectedVoice || segments.length === 0"
                @click="generateAndSaveAll"
              >
                生成并保存
              </el-button>
            </div>
          </el-card>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.project-sound {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 20px;

  h2 {
    margin-top: 0;
    margin-bottom: 32px;
    font-size: 24px;
    font-weight: 700;
    color: #1a1a1a;
  }

  .content-container {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
    flex: 1;
    min-height: 0;

    @media (min-width: 1024px) {
      grid-template-columns: 340px 1fr;
    }
  }

  .left-column {
    height: 700px;

    .left-scroll {
      height: 100%;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding-right: 8px;

      &::-webkit-scrollbar {
        width: 6px;
      }

      &::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 3px;
      }

      &::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 3px;
      }

      &::-webkit-scrollbar-thumb:hover {
        background: #a8a8a8;
      }
    }
  }

  .right-column {
    height: 700px;

    .right-scroll {
      height: 100%;
      overflow-y: auto;
      padding-right: 8px;

      &::-webkit-scrollbar {
        width: 6px;
      }

      &::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 3px;
      }

      &::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 3px;
      }

      &::-webkit-scrollbar-thumb:hover {
        background: #a8a8a8;
      }
    }
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 4px;

    h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #303133;
    }
  }

  .sound-card,
  .config-card,
  .text-card {
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.08);
    transition: all 0.3s ease;

    &:hover {
      box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.12);
    }
  }

  .config-item {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 8px;
    width: 100%;

    :deep(.el-slider) {
      flex: 1;
      min-width: 0;
    }

    :deep(.el-slider__runway) {
      height: 6px;
      border-radius: 3px;
    }

    :deep(.el-slider__bar) {
      height: 6px;
      border-radius: 3px;
      background: linear-gradient(90deg, #409eff, #667eea);
    }

    :deep(.el-slider__button) {
      width: 16px;
      height: 16px;
      margin-top: -5px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
      transition: all 0.3s ease;

      &:hover {
        transform: scale(1.1);
        box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3);
      }
    }

    .config-value {
      background: linear-gradient(135deg, #409eff, #667eea);
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      min-width: 40px;
      text-align: center;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
      white-space: nowrap;
    }
  }

  .el-form-item {
    margin-bottom: 20px;

    &:last-child {
      margin-bottom: 0;
    }

    .el-form-item__label {
      font-weight: 500;
      color: #303133;
      font-size: 14px;
      margin-bottom: 4px;
    }
  }

  .voice-select {
    width: 100%;

    :deep(.el-select__caret) {
      color: #409eff;
    }

    :deep(.el-select__input) {
      font-size: 14px;
    }

    :deep(.el-select-dropdown) {
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
  }

  .voice-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 8px 0;

    .voice-name {
      font-weight: 500;
      font-size: 14px;
    }

    .default-tag {
      font-size: 12px;
      color: #409eff;
      background-color: #ecf5ff;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 500;
    }
  }

  .emotion-option {
    display: flex;
    align-items: center;
    gap: 8px;

    :deep(.el-tag) {
      font-size: 13px;
      padding: 2px 10px;
    }
  }

  .text-card {
    .empty-text {
      text-align: center;
      padding: 60px 20px;
      color: #909399;

      .empty-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }

      p {
        margin: 8px 0;
      }

      .empty-hint {
        font-size: 14px;
        color: #c0c4cc;
      }
    }

    .paragraph-list {
      display: flex;
      flex-direction: column;
      gap: 20px;

      .paragraph-item {
        background-color: #f9f9f9;
        border-radius: 8px;
        padding: 16px;
        transition: all 0.3s ease;

        &:hover {
          background-color: #f0f5ff;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
        }

        .paragraph-header {
          display: flex;
          align-items: center;
          margin-bottom: 12px;
          flex-wrap: wrap;
          gap: 8px;

          .paragraph-number {
            width: 28px;
            height: 28px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: 600;
            flex-shrink: 0;
          }

          .paragraph-info {
            flex: 1;
            padding-left: 12px;
            display: flex;
            align-items: center;
            gap: 8px;

            .char-count {
              font-size: 12px;
              color: #909399;
            }

            .has-voice-tag {
              font-size: 12px;
              color: #67c23a;
              background-color: #f0f9eb;
              padding: 2px 8px;
              border-radius: 4px;
            }
          }

          .paragraph-actions {
            display: flex;
            gap: 8px;
            flex-shrink: 0;
          }
        }

        .paragraph-content {
          line-height: 1.7;
          color: #303133;
          white-space: pre-wrap;
          font-size: 14px;
        }
      }
    }

    .generate-all-section {
      margin-top: 20px;
      padding: 20px;
      border-top: 1px solid #e4e7ed;
      text-align: center;

      .el-button {
        min-width: 200px;
        height: 44px;
        font-size: 16px;
        font-weight: 600;
        border-radius: 8px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        transition: all 0.3s ease;

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        &:active {
          transform: translateY(0);
        }

        &:disabled {
          background: #c0c4cc;
          box-shadow: none;
          transform: none;
        }
      }
    }
  }
}
</style>
