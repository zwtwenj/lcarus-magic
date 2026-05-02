<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { getSubtitleList, deleteSubtitleConfig, uploadSubtitle, getCustomSubtitleList, type SubtitleConfig, type Subtitle } from '@/api/subititle'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useCreateDialog } from '@/hook/dialog.hooks'
import { useProjectStore } from '@/store/project.store'

const { openSubtitleConfigDialog } = useCreateDialog()
const projectStore = useProjectStore()
const subtitleList = ref<SubtitleConfig[]>([])
const customSubtitleList = ref<Subtitle[]>([])
const activeTab = ref('auto')
const uploading = ref(false)
const windowObj = window

withDefaults(defineProps<{
  isGenerate?: boolean
}>(), {
  isGenerate: false
})

// 同步 tab 值到 store
watch(activeTab, (val) => {
  projectStore.generateParams.subtitleType = val
})

const loadList = async () => {
  try {
    subtitleList.value = await getSubtitleList()
  } catch (error) {
    ElMessage.error('获取字幕列表失败')
  }
}

const loadCustomList = async () => {
  if (!projectStore.projectId) return
  try {
    customSubtitleList.value = await getCustomSubtitleList(parseInt(projectStore.projectId))
  } catch (error) {
    ElMessage.error('获取自定义字幕列表失败')
  }
}

// 监听 projectId 变化，重新加载自定义字幕列表
watch(() => projectStore.projectId, (newVal) => {
  if (newVal) {
    loadCustomList()
  }
}, { immediate: true })

// 处理字幕选择，点击已选中项则取消选中
const handleSubtitleSelect = (type: 'auto' | 'custom', id: number) => {
  const key = `${type}_${id}`
  if (projectStore.generateParams.subtitleId === key) {
    // 点击已选中的项，取消选中
    projectStore.generateParams.subtitleId = null
    projectStore.generateParams.subtitleType = 'auto'
  } else {
    // 选择新的项
    projectStore.generateParams.subtitleId = key
    projectStore.generateParams.subtitleType = type
  }
}

const handleUploadSubtitle = async (file: any) => {
  if (!file || !projectStore.projectId) return
  
  uploading.value = true
  try {
    await uploadSubtitle(file.raw, parseInt(projectStore.projectId))
    ElMessage.success('上传成功')
    await loadCustomList()
  } catch (error) {
    ElMessage.error('上传失败')
  } finally {
    uploading.value = false
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

    <el-tabs v-model="activeTab" class="subtitle-tabs">
      <el-tab-pane label="自动生成" name="auto">
        <div class="list-container">
          <div v-if="subtitleList.length === 0" class="empty-state">
            <div class="empty-icon">📭</div>
            <p>暂无字幕配置</p>
            <el-button type="primary" @click="handleAdd">创建第一个配置</el-button>
          </div>

          <div v-else class="card-grid">
            <el-card
              class="config-card"
              v-for="item in subtitleList"
              :key="item.id"
              :class="{ selected: isGenerate && projectStore.generateParams.subtitleId === ('auto_' + item.id) && projectStore.generateParams.subtitleType === 'auto' }"
            >
              <template #header>
                <div class="card-header" v-if="isGenerate">
                  <el-checkbox 
                    :checked="projectStore.generateParams.subtitleId === ('auto_' + item.id) && projectStore.generateParams.subtitleType === 'auto'"
                    @change="handleSubtitleSelect('auto', item.id)"
                  >
                    {{ item.name }}
                  </el-checkbox>
                </div>
                <div class="card-header" v-else>
                  <div class="config-name">{{ item.name }}</div>
                  <div class="config-date">{{ formatDate(item.createdAt) }}</div>
                </div>
              </template>
              <div class="card-body">
                <div class="config-preview">
                  <div class="preview-label">预览效果:</div>
                  <div class="preview-box" :style="getPreviewStyle(item.config)">
                    字幕预览文本
                  </div>
                </div>
              </div>
              <template #footer>
                <div class="card-footer">
                  <el-button type="danger" @click="handleDelete(item)">删除</el-button>
                </div>
              </template>
            </el-card>
          </div>
        </div>
      </el-tab-pane>
      <el-tab-pane label="自定义" name="custom">
        <div class="custom-tab">
          <div class="custom-header">
            <el-upload
              :show-file-list="false"
              :before-upload="() => false"
              @change="handleUploadSubtitle"
              accept=".ass"
            >
              <el-button type="primary" :loading="uploading">上传字幕文件</el-button>
            </el-upload>
            <span class="upload-tip">支持 .ass 格式</span>
          </div>

          <div v-if="customSubtitleList.length === 0" class="empty-state">
            <div class="empty-icon">📄</div>
            <p>暂无自定义字幕</p>
          </div>

          <div v-else class="custom-list">
            <div 
              class="custom-item" 
              v-for="item in customSubtitleList" 
              :key="item.id"
              :class="{ selected: isGenerate && projectStore.generateParams.subtitleId === ('custom_' + item.id) && projectStore.generateParams.subtitleType === 'custom' }"
            >
              <div class="item-info">
                <template v-if="isGenerate">
                  <el-checkbox 
                    :checked="projectStore.generateParams.subtitleId === ('custom_' + item.id) && projectStore.generateParams.subtitleType === 'custom'"
                    @change="handleSubtitleSelect('custom', item.id)"
                  >
                    {{ item.url.split('/').pop() }}
                  </el-checkbox>
                </template>
                <template v-else>
                  <div class="item-name">{{ item.url.split('/').pop() }}</div>
                  <div class="item-date">{{ formatDate(item.createdAt) }}</div>
                </template>
              </div>
              <div class="item-actions">
                <el-button type="primary" link @click="windowObj.open(item.url, '_blank')">下载</el-button>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
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

.subtitle-tabs {
  :deep(.el-tabs__header) {
    margin-bottom: 20px;
  }

  :deep(.el-tabs__item) {
    font-size: 15px;
  }
}

.custom-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.upload-tip {
  color: #909399;
  font-size: 13px;
}

.custom-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.custom-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  border: 2px solid transparent;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  }

  &.selected {
    border-color: #409eff;
    background-color: #ecf5ff;
  }
}

.item-info {
  flex: 1;

  .item-name {
    font-size: 14px;
    color: #303133;
    margin-bottom: 4px;
  }

  .item-date {
    font-size: 12px;
    color: #909399;
  }
}

.item-actions {
  display: flex;
  gap: 8px;
}

.list-container {
  width: 100%;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.empty-state {
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

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

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

  :deep(.el-button) {
    padding: 6px 16px;
  }
}
</style>