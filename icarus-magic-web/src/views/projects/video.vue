<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useProjectStore } from '../../store/project.store'
import { getProjectVideos, type VideoItem } from '../../api/project'
import { ElMessage } from 'element-plus'

const projectStore = useProjectStore()
const videos = ref<VideoItem[]>([])
const loading = ref(false)
const currentVideo = ref<VideoItem | null>(null)

const hasProject = computed(() => !!projectStore.projectId)

const formatTime = (timeStr: string) => {
  if (!timeStr) return ''
  const d = new Date(timeStr)
  if (isNaN(d.getTime())) return timeStr
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const loadVideos = async () => {
  if (!projectStore.projectId) {
    ElMessage.warning('未选择项目')
    return
  }
  loading.value = true
  try {
    videos.value = await getProjectVideos(Number(projectStore.projectId))
    currentVideo.value = videos.value[0] || null
  } catch (error) {
    console.error('获取视频列表失败:', error)
  } finally {
    loading.value = false
  }
}

// 监听 projectId：刷新时父组件异步 fetch 后才会就绪，菜单进入时已就绪
// immediate 覆盖已就绪场景，后续变化（就绪/切换项目）触发加载
watch(() => projectStore.projectId, (newId) => {
  if (newId) {
    loadVideos()
  }
}, { immediate: true })
</script>

<template>
  <div class="video-page">
    <div class="page-header">
      <h2>视频</h2>
      <el-button size="small" :loading="loading" @click="loadVideos">刷新</el-button>
    </div>

    <!-- 无项目 -->
    <div v-if="!hasProject" class="empty-state">
      <div class="empty-icon">📂</div>
      <p>未选择项目</p>
    </div>

    <!-- 空列表 -->
    <div v-else-if="!loading && videos.length === 0" class="empty-state">
      <div class="empty-icon">🎬</div>
      <p>当前项目暂无生成的视频</p>
      <p class="empty-hint">请前往「生成」页面进行一键成片</p>
    </div>

    <div v-else class="video-layout">
      <!-- 左侧：视频列表 -->
      <div class="video-list">
        <div
          v-for="v in videos"
          :key="v.id"
          class="video-item"
          :class="{ active: currentVideo?.id === v.id }"
          @click="currentVideo = v"
        >
          <div class="item-thumb">🎬</div>
          <div class="item-info">
            <div class="item-title">视频 #{{ v.id }}</div>
            <div class="item-time">{{ formatTime(v.createdAt) }}</div>
          </div>
        </div>
      </div>

      <!-- 右侧：预览 -->
      <div class="video-preview" v-if="currentVideo">
        <div class="preview-card">
          <div class="card-header">
            <span>成片预览 #{{ currentVideo.id }}</span>
            <span class="card-time">{{ formatTime(currentVideo.createdAt) }}</span>
          </div>
          <div class="video-container" v-if="currentVideo.url">
            <video :src="currentVideo.url" controls class="preview-video"></video>
          </div>
          <div class="no-url" v-else>该视频无有效地址</div>
          <div class="video-actions">
            <a v-if="currentVideo.url" :href="currentVideo.url" download class="download-btn">
              <span>⬇️</span>
              <span>下载视频</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.video-page {
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

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 20px;
  background: #fff;
  border-radius: 8px;

  .empty-icon {
    font-size: 48px;
    margin-bottom: 16px;
  }

  p {
    margin: 4px 0;
    color: #909399;
  }

  .empty-hint {
    font-size: 13px;
    color: #c0c4cc;
  }
}

.video-layout {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.video-list {
  width: 240px;
  display: flex;
  flex-direction: column;
  gap: 10px;

  .video-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: #fff;
    border-radius: 8px;
    border: 1px solid transparent;
    cursor: pointer;
    transition: all 0.25s;

    &:hover {
      background: #f5f7fa;
    }

    &.active {
      border-color: #409eff;
      background: #ecf5ff;
    }

    .item-thumb {
      width: 40px;
      height: 40px;
      border-radius: 6px;
      background: #f0f2f5;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      flex-shrink: 0;
    }

    .item-info {
      min-width: 0;

      .item-title {
        font-size: 14px;
        font-weight: 500;
        color: #303133;
      }

      .item-time {
        font-size: 12px;
        color: #909399;
        margin-top: 2px;
      }
    }
  }
}

.video-preview {
  flex: 1;
  min-width: 0;

  .preview-card {
    background: #fff;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      font-size: 14px;
      color: #303133;
      font-weight: 600;

      .card-time {
        font-size: 12px;
        color: #909399;
        font-weight: normal;
      }
    }

    .video-container {
      display: flex;
      justify-content: center;
      padding: 16px;
      background: #000;
      border-radius: 8px;
    }

    .preview-video {
      max-width: 100%;
      max-height: 600px;
      border-radius: 8px;
    }

    .no-url {
      text-align: center;
      padding: 40px;
      color: #909399;
      background: #fafafa;
      border-radius: 8px;
    }

    .video-actions {
      display: flex;
      justify-content: center;
      margin-top: 16px;
    }

    .download-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 22px;
      background: #409eff;
      color: #fff;
      border-radius: 8px;
      text-decoration: none;
      font-size: 14px;
      transition: background 0.3s;

      &:hover {
        background: #66b1ff;
      }
    }
  }
}
</style>
