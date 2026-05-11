<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useProjectStore } from '@/store/project.store'
import { ElForm, ElFormItem, ElInputNumber } from 'element-plus'

const projectStore = useProjectStore()

const width = ref(projectStore.generateParams.videoConfig.width || 1920)
const height = ref(projectStore.generateParams.videoConfig.height || 1080)

const syncToStore = () => {
  projectStore.generateParams.videoConfig = { width: width.value, height: height.value }
}

watch([width, height], syncToStore, { deep: true })

onMounted(syncToStore)
</script>

<template>
  <div class="video-config">
    <div class="page-header">
      <h2>视频设置</h2>
    </div>
    <ElForm label-width="80px" class="config-form">
      <ElFormItem label="视频宽度">
        <div class="input-group">
          <ElInputNumber v-model="width" :min="100" :max="7680" style="width: 150px" />
          <span class="unit">px</span>
        </div>
      </ElFormItem>
      <ElFormItem label="视频高度">
        <div class="input-group">
          <ElInputNumber v-model="height" :min="100" :max="7680" style="width: 150px" />
          <span class="unit">px</span>
        </div>
      </ElFormItem>
    </ElForm>
  </div>
</template>

<style lang="less" scoped>
.video-config {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        
        h2 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            color: #303133;
            height: 38px;
            line-height: 38px;
        }
    }
}

.config-form {
  width: 100%;
  max-width: 300px;
}

.input-group {
  display: flex;
  align-items: center;
}

.unit {
  margin-left: 8px;
  color: #909399;
  font-size: 14px;
}
</style>