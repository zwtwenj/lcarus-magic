<script setup lang="ts">
import { ref } from 'vue'
import Text from './text.vue'
import Sound from './sound.vue'
import Subtitle from './subtitle.vue'

const steps = [
  { key: 'text', label: '文本' },
  { key: 'sound', label: '声音' },
  { key: 'subtitle', label: '字幕' },
  { key: 'materials', label: '素材' },
  { key: 'video', label: '成片' }
]

const currentStep = ref(0)

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
        <!-- <div class="content-card">
          <div class="content-icon">📝</div>
          <h2>文本编辑</h2>
          <p>在这里编辑视频的文案内容，支持分段编辑和时长设置。</p>
          <el-button type="primary" size="large">编辑文本</el-button>
        </div> -->
        <Text />
      </div>
      
      <!-- 声音步骤 -->
      <div v-else-if="currentStep === 1" class="step-content">
        <!-- <div class="content-card">
          <div class="content-icon">🎙️</div>
          <h2>声音合成</h2>
          <p>选择语音类型、调整语速和音量，预览合成效果。</p>
          <el-button type="primary" size="large">选择声音</el-button>
        </div> -->
        <Sound />
      </div>
      
      <!-- 字幕步骤 -->
      <div v-else-if="currentStep === 2" class="step-content">
        <!-- <div class="content-card">
          <div class="content-icon">📄</div>
          <h2>字幕配置</h2>
          <p>配置字幕样式，包括字体、颜色、大小等效果。</p>
          <el-button type="primary" size="large">配置字幕</el-button>
        </div> -->
        <Subtitle :isGenerate="true" />
      </div>
      
      <!-- 素材步骤 -->
      <div v-else-if="currentStep === 3" class="step-content">
        <div class="content-card">
          <div class="content-icon">🎨</div>
          <h2>素材管理</h2>
          <p>添加背景图片、背景音乐等素材资源。</p>
          <el-button type="primary" size="large">管理素材</el-button>
        </div>
      </div>
      
      <!-- 成片步骤 -->
      <div v-else-if="currentStep === 4" class="step-content">
        <div class="content-card">
          <div class="content-icon">🎬</div>
          <h2>生成成片</h2>
          <p>预览效果并生成最终视频文件。</p>
          <el-button type="primary" size="large">开始生成</el-button>
        </div>
      </div>
    </div>
    
    <!-- 底部导航按钮 -->
    <div class="step-actions">
      <el-button size="large" :disabled="currentStep === 0" @click="prevStep">上一步</el-button>
      <el-button size="large" :disabled="currentStep === steps.length - 1" type="primary" @click="nextStep">下一步</el-button>
    </div>
  </div>
</template>

<style scoped lang="less">
.generate-page {
  // height: calc(100vh - 80px);
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
  
  .step-arrow {
    margin-left: 16px;
    color: #c0c4cc;
    font-size: 16px;
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