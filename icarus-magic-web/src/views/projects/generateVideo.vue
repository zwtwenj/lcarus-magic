<script setup lang="ts">
import { useProjectStore } from '@/store/project.store'

const projectStore = useProjectStore()
</script>

<template>
  <div class="generate-video-page">
    <div class="video-card">
      <div class="card-header">
        <div class="content-icon">🎬</div>
        <h2>成片预览</h2>
      </div>
      
      <div class="video-container" v-if="projectStore.generateVideo">
        <video :src="projectStore.generateVideo" controls class="preview-video"></video>
      </div>
      
      <div class="empty-state" v-else>
        <div class="empty-icon">📹</div>
        <p>暂未生成视频</p>
        <p class="empty-hint">请先在素材步骤点击"一键成片"</p>
      </div>
      
      <div class="video-actions">
        <a v-if="projectStore.generateVideo" :href="projectStore.generateVideo" download class="download-btn">
          <span>⬇️</span>
          <span>下载视频</span>
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.generate-video-page {
//   padding: 20px;
  width: 100%;
}

.video-card {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  
  .content-icon {
    font-size: 32px;
  }
  
  h2 {
    margin: 0;
    font-size: 20px;
    color: #333;
  }
}

.video-container {
  display: flex;
  justify-content: center;
  padding: 20px;
  background: #000;
  border-radius: 8px;
  width: 375px;
  height: 667px;
  margin: 0 auto;
}

.preview-video {
  max-width: 100%;
  border-radius: 8px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  background: #fafafa;
  border-radius: 8px;
  
  .empty-icon {
    font-size: 48px;
    margin-bottom: 16px;
  }
  
  p {
    margin: 8px 0;
    color: #999;
  }
  
  .empty-hint {
    font-size: 14px;
    color: #ccc;
  }
}

.video-actions {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.download-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: #1890ff;
  color: #fff;
  border-radius: 8px;
  text-decoration: none;
  font-size: 14px;
  transition: background 0.3s;
  
  &:hover {
    background: #40a9ff;
  }
}
</style>