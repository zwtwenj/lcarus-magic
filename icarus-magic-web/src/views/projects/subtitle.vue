<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getSubtitleList, type SubtitleConfig } from '@/api/subititle'
import { ElMessage } from 'element-plus'
import { useCreateDialog } from '@/hook/dialog.hooks'

const { openSubtitleConfigDialog } = useCreateDialog()
const subtitleList = ref<SubtitleConfig[]>([])

const loadList = async () => {
  try {
    subtitleList.value = await getSubtitleList()
  } catch (error) {
    ElMessage.error('获取字幕列表失败')
  }
}

onMounted(async () => {
  await loadList()
})

const handleAdd = () => {
  openSubtitleConfigDialog({
    onSuccess: () => {
      loadList()
    }
  })
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<template>
  <div class="subtitle-page">
    <div class="header">
      <h1>字幕配置管理</h1>
      <el-button type="primary" @click="handleAdd">+ 新增字幕配置</el-button>
    </div>
    
    <div class="list-container">
      <div v-if="subtitleList.length === 0" class="empty-state">
        <div class="empty-icon">📭</div>
        <p>暂无字幕配置</p>
        <el-button type="primary" @click="handleAdd">创建第一个配置</el-button>
      </div>
      
      <el-card v-else class="config-card" v-for="item in subtitleList" :key="item.id">
        <div class="card-header">
          <div class="config-name">{{ item.name }}</div>
          <div class="config-date">{{ formatDate(item.createdAt) }}</div>
        </div>
        <div class="card-body">
          <div class="config-preview">
            <div class="preview-label">预览效果:</div>
            <div class="preview-box" :style="getPreviewStyle(item.config)">
              字幕预览文本
            </div>
          </div>
        </div>
        <div class="card-footer">
          <el-button size="small">编辑</el-button>
          <el-button size="small" type="danger">删除</el-button>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  methods: {
    getPreviewStyle(configStr: string) {
      try {
        const config = JSON.parse(configStr)
        return {
          fontFamily: config.fontname || 'Microsoft YaHei',
          fontSize: (config.fontsize || 24) + 'px',
          color: config.primaryColor || '#FFFFFF',
          textShadow: `-2px -2px 0 ${config.outlineColor || '#000000'}, 2px -2px 0 ${config.outlineColor || '#000000'}, -2px 2px 0 ${config.outlineColor || '#000000'}, 2px 2px 0 ${config.outlineColor || '#000000'}`,
          backgroundColor: config.backColor || 'rgba(0,0,0,0.5)'
        }
      } catch {
        return {}
      }
    }
  }
}
</script>

<style scoped lang="less">
.subtitle-page {
  padding: 24px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  
  h1 {
    font-size: 20px;
    font-weight: 600;
    color: #303133;
    margin: 0;
  }
}

.list-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
}

.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  background: #fafafa;
  border-radius: 12px;
  
  .empty-icon {
    font-size: 48px;
    margin-bottom: 16px;
  }
  
  p {
    color: #909399;
    margin-bottom: 20px;
  }
}

.config-card {
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  
  &:hover {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
    transform: translateY(-2px);
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
  
  .config-name {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }
  
  .config-date {
    font-size: 12px;
    color: #909399;
  }
}

.card-body {
  margin-bottom: 16px;
}

.config-preview {
  .preview-label {
    font-size: 12px;
    color: #909399;
    margin-bottom: 8px;
  }
  
  .preview-box {
    padding: 12px 16px;
    border-radius: 8px;
    text-align: center;
    min-height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 500;
  }
}

.card-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
  
  :deep(.el-button) {
    padding: 6px 16px;
  }
}
</style>