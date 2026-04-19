<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useProjectStore } from '@/store/project.store'
import { getVoiceList, type VoiceItem } from '@/api/voice'
import { generateSound } from '@/api/sound'
import { ElForm, ElFormItem, ElSelect, ElOption, ElMessage, ElCard, ElSlider, ElTag } from 'element-plus'

const projectStore = useProjectStore()
const projectText = computed(() => projectStore.projectData.text || '')
const projectId = computed(() => projectStore.projectId)

const paragraphs = computed(() => {
  if (!projectText.value) return []
  return projectText.value.split('\n\n').filter(paragraph => paragraph.trim())
})

const voiceList = ref<VoiceItem[]>([])
const selectedVoice = ref<string | null>(null)
// const selectedVoiceInfo = computed(() => {
//   if (!selectedVoice.value) return null
//   return voiceList.value.find(v => v.voiceId === selectedVoice.value)
// })
const loading = ref(false)

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

interface ParagraphVoice {
  text: string
  voiceUrl: string | null
  loading: boolean
}

const paragraphVoices = ref<ParagraphVoice[]>([])

onMounted(async () => {
  await fetchVoiceList()
  initializeParagraphVoices()
})

const initializeParagraphVoices = () => {
  const currentParagraphs = paragraphs.value
  paragraphVoices.value = currentParagraphs.map(text => ({
    text,
    voiceUrl: null,
    loading: false
  }))
}

watch(paragraphs, () => {
  initializeParagraphVoices()
}, { deep: true })

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

// const getEmotionTagType = (emotion: string) => {
//   const option = emotionOptions.find(o => o.value === emotion)
//   return option?.tagType || 'info'
// }

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

const generateVoice = async (index: number) => {
  if (!selectedVoice.value) {
    ElMessage.warning('请先选择音声')
    return
  }
  if (!projectId.value) {
    ElMessage.warning('项目ID不存在')
    return
  }
  if (index < 0 || index >= paragraphVoices.value.length) {
    ElMessage.warning('段落索引无效')
    return
  }

  paragraphVoices.value[index].loading = true
  
  try {
    const response = await generateSound({
      voiceId: selectedVoice.value,
      parameters: {
        volume: voiceConfig.value.volume,
        rate: voiceConfig.value.rate,
        pitch: voiceConfig.value.pitch,
        emotion: voiceConfig.value.emotion
      },
      text: paragraphVoices.value[index].text,
      projectId: Number(projectId.value)
    })
    
    paragraphVoices.value[index].voiceUrl = response.url
    ElMessage.success('语音生成成功')
  } catch (error) {
    console.error('语音生成失败:', error)
    ElMessage.error('语音生成失败')
  } finally {
    if (index >= 0 && index < paragraphVoices.value.length) {
      paragraphVoices.value[index].loading = false
    }
  }
}

const playVoice = (voiceUrl: string) => {
  if (!voiceUrl) return
  
  const audio = new Audio(voiceUrl)
  audio.play().catch(error => {
    console.error('试听失败:', error)
    ElMessage.error('试听失败')
  })
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
                <span class="paragraph-count">{{ paragraphs.length }} 段</span>
              </div>
            </template>

            <div v-if="paragraphs.length === 0" class="empty-text">
              <div class="empty-icon">📝</div>
              <p>暂无文案内容</p>
              <p class="empty-hint">请先在文案页面添加内容</p>
            </div>

            <div v-else class="paragraph-list">
              <div
                v-for="(paragraph, index) in paragraphs.concat(paragraphs)"
                :key="index"
                class="paragraph-item"
              >
                <div class="paragraph-header">
                  <div class="paragraph-number">{{ index + 1 }}</div>
                  <div class="paragraph-info">
                    <span class="char-count">{{ paragraph.length }} 字</span>
                    <span v-if="paragraphVoices[index]?.voiceUrl" class="has-voice-tag">
                      已生成语音
                    </span>
                  </div>
                  <div class="paragraph-actions">
                    <button 
                      v-if="!paragraphVoices[index]?.voiceUrl" 
                      class="action-btn generate-btn" 
                      title="生成"
                      @click="generateVoice(index)"
                      :disabled="!selectedVoice || paragraphVoices[index]?.loading"
                    >
                      <span v-if="paragraphVoices[index]?.loading" class="loading-spinner"></span>
                      <span v-else class="action-icon">🎤</span>
                    </button>
                    
                    <template v-else>
                      <button class="action-btn play-btn" title="试听" @click="playVoice(paragraphVoices[index]?.voiceUrl || '')">
                        <span class="action-icon">🔊</span>
                      </button>
                      <button 
                        class="action-btn regenerate-btn" 
                        title="重新生成"
                        @click="generateVoice(index)"
                        :disabled="!selectedVoice || paragraphVoices[index]?.loading"
                      >
                        <span v-if="paragraphVoices[index]?.loading" class="loading-spinner"></span>
                        <span v-else class="action-icon">🔄</span>
                      </button>
                    </template>
                  </div>
                </div>
                <div class="paragraph-content">{{ paragraph }}</div>
              </div>
            </div>
          </el-card>
        </div>
      </div>
    </div>

    <div class="bottom-actions">
      <el-button type="primary" size="large" style="width: 200px;">生成并保存</el-button>
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
    // min-height: 500px;
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
    // height: 70vh;
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

  .bottom-actions {
    margin-top: 16px;
    text-align: center;
    padding: 16px 0 0 0;
    border-top: 1px solid #e4e7ed;
    background-color: #ffffff;
    // position: sticky;
    bottom: 0;
    z-index: 10;
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
      // transform: translateY(-2px);
    }
  }

  .selected-voice-info {
    margin-top: 16px;
    padding: 16px;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    border-radius: 8px;
    border-left: 4px solid #409eff;

    .voice-detail {
      .detail-item {
        display: flex;
        align-items: center;
        margin-bottom: 10px;

        .label {
          color: #606266;
          font-size: 14px;
          min-width: 60px;
          font-weight: 500;
        }

        .value {
          color: #303133;
          font-weight: 600;
        }
      }
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

  .el-form-item {
    margin-bottom: 16px;

    &:last-child {
      margin-bottom: 0;
    }

    .el-form-item__label {
      font-weight: 500;
      color: #303133;
      margin-bottom: 8px;
    }
  }

  .el-select {
    width: 100%;

    :deep(.el-select__input) {
      font-size: 14px;
    }

    :deep(.el-select-dropdown) {
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
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

            .action-btn {
              background: none;
              border: none;
              cursor: pointer;
              padding: 8px;
              border-radius: 6px;
              transition: all 0.3s ease;
              position: relative;

              &:hover:not(:disabled) {
                background-color: rgba(64, 158, 255, 0.1);
                transform: translateY(-1px);
              }

              &:disabled {
                opacity: 0.5;
                cursor: not-allowed;
              }

              .action-icon {
                font-size: 16px;
              }

              .loading-spinner {
                display: inline-block;
                width: 16px;
                height: 16px;
                border: 2px solid rgba(64, 158, 255, 0.3);
                border-top-color: #409eff;
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
              }

              &.generate-btn {
                &:hover:not(:disabled) {
                  background-color: rgba(103, 194, 58, 0.1);
                }
              }

              &.play-btn {
                &:hover:not(:disabled) {
                  background-color: rgba(64, 158, 255, 0.1);
                }
              }

              &.regenerate-btn {
                &:hover:not(:disabled) {
                  background-color: rgba(230, 162, 60, 0.1);
                }
              }
            }
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
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>