<script setup lang="ts">
import { computed } from 'vue'
import { ElImage } from 'element-plus'
import type { Material } from '@/api/material'

interface Props {
  material: Material
}

const props = defineProps<Props>()

const formatFileSize = (bytes: string | undefined): string => {
  if (!bytes) return '-'
  const size = parseInt(bytes)
  if (isNaN(size)) return bytes

  if (size < 1024) {
    return size + ' B'
  } else if (size < 1024 * 1024) {
    return (size / 1024).toFixed(2) + ' KB'
  } else if (size < 1024 * 1024 * 1024) {
    return (size / (1024 * 1024)).toFixed(2) + ' MB'
  } else {
    return (size / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
  }
}

const formattedFileSize = computed(() => formatFileSize(props.material.fileSize))
</script>

<template>
  <div class="material-info-container">
    <div class="material-left">
      <template v-if="material.type === 'image'">
        <el-image :src="material.url" fit="contain" class="material-display" />
      </template>
      <template v-else-if="material.type === 'video'">
        <div class="video-display">
          <span class="video-icon">🎬</span>
          <span class="video-text">{{ material.name }}</span>
        </div>
      </template>
      <template v-else>
        <div class="voice-display">
          <span class="voice-icon">🔊</span>
          <span class="voice-text">{{ material.name }}</span>
        </div>
      </template>
    </div>
    <div class="material-right">
      <div class="info-section">
        <h3 class="material-title">{{ material.name }}</h3>
        <div class="detail-item">
          <label>素材类型：</label>
          <span>{{ material.type === 'image' ? '图片' : material.type === 'video' ? '视频' : '音频' }}</span>
        </div>
        <div class="detail-item">
          <label>上传时间：</label>
          <span>{{ material.createdAt || '-' }}</span>
        </div>
        <div class="detail-item" v-if="material.fileSize">
          <label>文件大小：</label>
          <span>{{ formattedFileSize }}</span>
        </div>
        <div class="detail-item" v-if="material.tags && material.tags.length > 0">
          <label>素材标签：</label>
          <div class="tags-container">
            <span v-for="tag in material.tags" :key="tag" class="tag-item">{{ tag }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.material-info-container {
  display: flex;
  gap: 24px;
  height: 500px;
}

.material-left {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  border-radius: 8px;
  overflow: hidden;
}

.material-display {
  width: 100%;
  height: 100%;
}

.video-display,
.voice-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;

  .video-icon,
  .voice-icon {
    font-size: 64px;
  }

  .video-text,
  .voice-text {
    font-size: 16px;
    color: #606266;
  }
}

.material-right {
  width: 600px;
  padding: 20px 0;
}

.info-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.material-title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin: 0;
  word-break: break-all;
}

.detail-item {
  display: flex;
  gap: 8px;
  font-size: 14px;

  label {
    color: #909399;
    white-space: nowrap;
  }

  span {
    color: #303133;
  }
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-item {
  padding: 4px 12px;
  background: #ecf5ff;
  color: #409eff;
  border-radius: 4px;
  font-size: 12px;
}
</style>
