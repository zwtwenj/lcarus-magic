<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getSubtitleList, deleteSubtitleConfig, type SubtitleConfig } from '@/api/subititle'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useCreateDialog } from '@/hook/dialog.hooks'
import { useProjectStore } from '@/store/project.store'

const { openSubtitleConfigDialog } = useCreateDialog()
const projectStore = useProjectStore()
const subtitleList = ref<SubtitleConfig[]>([])

const props = withDefaults(defineProps<{
  isGenerate?: boolean
}>(), {
  isGenerate: false
})

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

const handleDelete = async (item: SubtitleConfig) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除字幕配置"${item.name}"吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await deleteSubtitleConfig(item.id)
    ElMessage.success('删除成功')
    await loadList()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const handleSelect = (item: SubtitleConfig) => {
  projectStore.generateParams.subtitleId = item.id
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

const getPreviewStyle = (configStr: string) => {
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
</script>

<template>
  <div class="subtitle-page">
    <div class="page-header">
      <h2>字幕设置</h2>
      <el-button type="primary" @click="handleAdd">+ 新增字幕配置</el-button>
    </div>
    
    <div class="list-container">
      <div v-if="subtitleList.length === 0" class="empty-state">
        <div class="empty-icon">📭</div>
        <p>暂无字幕配置</p>
        <el-button type="primary" @click="handleAdd">创建第一个配置</el-button>
      </div>
      
      <el-card v-else class="config-card" v-for="item in subtitleList" :key="item.id" :class="{ selected: projectStore.generateParams.subtitleId === item.id }">
        <div class="card-radio" v-if="isGenerate">
          <el-radio :model-value="projectStore.generateParams.subtitleId === item.id" @change="handleSelect(item)">
            {{ item.name }}
          </el-radio>
        </div>
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
        <div class="card-footer" v-if="!isGenerate">
          <el-button type="danger" @click="handleDelete(item)">删除</el-button>
        </div>
      </el-card>
    </div>
  </div>
</template>

<style scoped lang="less">
.subtitle-page {
  width: 100%;
}

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

.list-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
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
  border: 2px solid transparent;
  
  &:hover {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
    transform: translateY(-2px);
  }
  
  &.selected {
    border-color: #409eff;
    background-color: #ecf5ff;
  }
}

.card-radio {
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
  
  :deep(.el-radio__label) {
    font-weight: 600;
    color: #303133;
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