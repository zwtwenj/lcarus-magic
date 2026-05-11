<script setup lang="ts">
import { ref } from 'vue'
import Text from './text.vue'
import Sound from './sound.vue'
import Subtitle from './subtitle.vue'
import Materials from './materials.vue'
import GenerateVideo from './generateVideo.vue'
import VideoConfig from './videoConfig.vue'
import { useProjectStore } from '@/store/project.store'
import { oneClickGenerate } from '@/api/project'
import { getTaskStatus } from '@/api/task'
import { ElMessage } from 'element-plus'

const projectStore = useProjectStore()

const steps = [
  { key: 'text', label: '文本' },
  { key: 'sound', label: '声音' },
  { key: 'subtitle', label: '字幕' },
  { key: 'materials', label: '素材' },
  { key: 'config', label: '设置' },
  { key: 'video', label: '成片' }
]

const currentStep = ref(0)
const isGenerating = ref(false)
const generateTaskId = ref<number | null>(null)
const videoUrl = ref<string | null>(null)

const setStep = (index: number) => {
  currentStep.value = index
}

const nextStep = () => {
  if (currentStep.value < steps.length - 1) {
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

// 轮询查询任务状态
const pollTask = async () => {
  if (!generateTaskId.value) return
  
  try {
    const statusResponse = await getTaskStatus(generateTaskId.value)
    
    if (statusResponse.status === 'completed') {
      // res 可能是字符串或对象，需要处理
      const res = typeof statusResponse.res === 'string' ? JSON.parse(statusResponse.res) : statusResponse.res
      projectStore.generateVideo = res.ossUrl || ''
      ElMessage.success('视频生成成功')
      isGenerating.value = false
      generateTaskId.value = null
      // 跳转到成片步骤
      currentStep.value = 4
    } else if (statusResponse.status === 'failed') {
      ElMessage.error('视频生成失败')
      isGenerating.value = false
      generateTaskId.value = null
    } else {
      // 继续轮询
      setTimeout(pollTask, 2000)
    }
  } catch (error) {
    console.error('查询任务状态失败:', error)
    ElMessage.error('查询任务状态失败')
    isGenerating.value = false
    generateTaskId.value = null
  }
}

const handleGenerate = async () => {
  if (projectStore.generateParams.selectedMaterialIds.length === 0) {
    ElMessage.warning('请先选择素材')
    return
  }

  if (isGenerating.value) {
    ElMessage.warning('正在生成中，请稍候')
    return
  }

  try {
    const materialIds = projectStore.generateParams.selectedMaterialIds.map(id => id.toString())
    // 处理 subtitleId：从格式 "type_id" 中提取纯数字ID
    let subtitleId: string | undefined;
    let subtitleType: 'auto' | 'custom' | undefined;
    if (projectStore.generateParams.subtitleId) {
      const [type, id] = projectStore.generateParams.subtitleId.split('_');
      subtitleId = id;
      subtitleType = type as 'auto' | 'custom';
    }
    
    const result = await oneClickGenerate({
      projectId: projectStore.projectId.toString(),
      materials: materialIds,
      subtitleId,
      subtitleType,
      videoConfig: projectStore.generateParams.videoConfig
    })
    
    if (result.taskId) {
      isGenerating.value = true
      generateTaskId.value = result.taskId
      videoUrl.value = null
      ElMessage.info('视频生成中，请稍候...')
      // 开始轮询
      setTimeout(pollTask, 2000)
    }
  } catch (error) {
    console.error('一键成片失败:', error)
    ElMessage.error('一键成片失败')
  }
}

const isLastStep = () => currentStep.value === steps.length - 1
const isConfigStep = () => currentStep.value === 4
</script>

<template>
  <div class="generate-page">
    <!-- 顶部步骤条 -->
    <div class="steps-bar">
      <div
        v-for="(step, index) in steps"
        :key="step.key"
        class="step-tab"
        :class="{ active: currentStep === index }"
        @click="setStep(index)"
      >
        <span class="step-num">{{ index + 1 }}</span>
        <span class="step-label">{{ step.label }}</span>
      </div>
    </div>

    <!-- 步骤内容区域 -->
    <div class="content-area">
      <!-- 文本步骤 -->
      <div v-if="currentStep === 0" class="step-content">
        <Text />
      </div>

      <!-- 声音步骤 -->
      <div v-else-if="currentStep === 1" class="step-content">
        <Sound />
      </div>

      <!-- 字幕步骤 -->
      <div v-else-if="currentStep === 2" class="step-content">
        <Subtitle :isGenerate="true" />
      </div>

      <!-- 素材步骤 -->
      <div v-else-if="currentStep === 3" class="step-content">
        <Materials :isGenerate="true" />
      </div>

      <!-- 设置步骤 -->
      <div v-else-if="currentStep === 4" class="step-content">
        <VideoConfig />
      </div>

      <!-- 成片步骤 -->
      <div v-else-if="currentStep === 5" class="step-content">
        <GenerateVideo />
      </div>
    </div>

    <!-- 底部导航按钮 -->
    <div class="step-actions">
      <el-button size="large" :disabled="currentStep === 0" @click="prevStep">上一步</el-button>
      <el-button v-if="isConfigStep()" size="large" type="primary" :loading="isGenerating" @click="handleGenerate">
        <span v-if="isGenerating">生成中...</span>
        <span v-else>一键成片</span>
      </el-button>
      <el-button v-else size="large" :disabled="isLastStep()" type="primary" @click="nextStep">下一步</el-button>
    </div>
  </div>
</template>

<style scoped lang="less">
.generate-page {
  display: flex;
  flex-direction: column;
}

.steps-bar {
  display: flex;
  align-items: center;
  padding: 16px 24px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  margin-bottom: 20px;
}

.step-tab {
  display: flex;
  align-items: center;
  padding: 10px 20px;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.3s ease;
  flex:1;

  &:hover {
    background: #f5f7fa;
  }

  &.active {
    background: #ecf5ff;

    .step-num {
      background: #409eff;
      color: #fff;
    }

    .step-label {
      color: #409eff;
      font-weight: 600;
    }
  }

  .step-num {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #e4e7ed;
    color: #909399;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 600;
    margin-right: 8px;
    transition: all 0.3s ease;
  }

  .step-label {
    font-size: 14px;
    color: #606266;
    transition: all 0.3s ease;
  }
}

.content-area {
  flex: 1;
  background: #eee;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  padding: 20px;
}

.step-content {
  height: 100%;
  display: flex;
  justify-content: center;
  width: 100%;
}

.step-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;

  :deep(.el-button) {
    padding: 12px 32px;
    font-size: 16px;
    border-radius: 8px;
  }
}

.content-card {
  text-align: center;
  padding: 48px;
  background: #fafafa;
  border-radius: 16px;

  .content-icon {
    font-size: 64px;
    margin-bottom: 20px;
  }

  h2 {
    font-size: 24px;
    font-weight: 600;
    color: #303133;
    margin: 0 0 12px 0;
  }

  p {
    font-size: 14px;
    color: #909399;
    margin: 0 0 24px 0;
    line-height: 1.6;
  }

  :deep(.el-button) {
    padding: 12px 32px;
    font-size: 16px;
    border-radius: 8px;
  }
}
</style>