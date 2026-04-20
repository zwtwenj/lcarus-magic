<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElCard, ElButton, ElUpload, ElMessage, ElTabPane, ElTabs, ElImage, ElInput, ElIcon, ElMessageBox, ElImageViewer, ElCheckbox } from 'element-plus'
import { Plus, Delete, Edit, Select } from '@element-plus/icons-vue'
import { addMaterial, getMaterials, deleteMaterial as deleteMaterialApi, renameMaterial, type Material } from '@/api/material'
import { useProjectStore } from '@/store/project.store'

const projectStore = useProjectStore()
const materials = ref<Material[]>([])
const activeTab = ref<'image' | 'video' | 'voice'>('image')
const uploading = ref(false)
const uploadRef = ref()
const uploadQueue = ref<File[]>([])
const uploadIndex = ref(0)

const editingMaterial = ref<Material | null>(null)
const editingName = ref('')
const nameInputRef = ref()
const previewVisible = ref(false)
const previewUrl = ref('')
const isSelectMode = ref(false)
const selectedMaterialIds = ref<number[]>([])
const searchKeyword = ref('')

const fetchMaterials = async () => {
  if (!projectStore.projectId) return
  try {
    const data = await getMaterials({
      projectId: projectStore.projectId,
      type: 'image',
      keyword: searchKeyword.value
    })
    materials.value = data
  } catch (error) {
    console.error('获取素材列表失败:', error)
  }
}

watch(
  () => projectStore.projectId,
  (newProjectId) => {
    if (newProjectId) {
      fetchMaterials()
    }
  },
  { immediate: true }
)

watch(
  () => searchKeyword.value,
  () => {
    fetchMaterials()
  }
)

const filteredMaterials = () => {
  return materials.value.filter(m => m.type === activeTab.value)
}

const getTypeIcon = (type: string) => {
  const icons: Record<string, string> = {
    image: '🖼️',
    video: '🎬',
    voice: '🔊'
  }
  return icons[type] || '📁'
}

const processQueue = async () => {
  if (uploadIndex.value >= uploadQueue.value.length) {
    ElMessage.success(`成功上传 ${uploadQueue.value.length} 个文件`)
    uploadQueue.value = []
    uploadIndex.value = 0
    uploading.value = false
    uploadRef.value?.clearFiles()
    fetchMaterials()
    return
  }

  const file = uploadQueue.value[uploadIndex.value]

  try {
    const material = await addMaterial({ projectId: projectStore.projectId, file })
    materials.value.push(material)
    uploadIndex.value++
    await processQueue()
  } catch (error) {
    console.error('上传失败:', error)
    ElMessage.error(`上传 ${file.name} 失败`)
    uploadIndex.value++
    await processQueue()
  }
}

const handleUpload = async (file: File) => {
  if (!file) return false

  uploadQueue.value.push(file)

  if (!uploading.value) {
    uploading.value = true
    await processQueue()
  }

  return false
}

const previewMedia = (material: Material) => {
  if (material.type === 'image') {
    previewUrl.value = material.url
    previewVisible.value = true
  } else if (material.type === 'voice' || material.type === 'video') {
    window.open(material.url)
  }
}

const startRename = (material: Material) => {
  editingMaterial.value = material
  editingName.value = material.name
  setTimeout(() => {
    nameInputRef.value?.focus()
  }, 100)
}

const handleRename = async () => {
  if (!editingMaterial.value) return

  const trimmedName = editingName.value.trim()
  
  if (!trimmedName) {
    editingName.value = editingMaterial.value.name
    editingMaterial.value = null
    return
  }

  try {
    const updatedMaterial = await renameMaterial({
      projectId: projectStore.projectId,
      materialId: editingMaterial.value.id.toString(),
      newName: trimmedName
    })
    
    const index = materials.value.findIndex(m => m.id === updatedMaterial.id)
    if (index > -1) {
      materials.value[index] = updatedMaterial
    }
    
    ElMessage.success('重命名成功')
    editingMaterial.value = null
  } catch (error) {
    console.error('重命名失败:', error)
    ElMessage.error('重命名失败')
  }
}

const deleteMaterial = async (material: Material) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除素材 "${material.name}" 吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await deleteMaterialApi({
      projectId: projectStore.projectId,
      materialId: material.id.toString()
    })
    
    const index = materials.value.findIndex(m => m.id === material.id)
    if (index > -1) {
      materials.value.splice(index, 1)
    }
    
    ElMessage.success('删除成功')
  } catch (error) {
    // 用户取消或关闭弹窗时不显示错误
    if (typeof error === 'string' && ['cancel', 'close'].includes(error)) {
      return
    }
    // Element Plus v2.x 可能抛出对象
    if (typeof error === 'object' && error !== null && 'type' in error) {
      if (error.type === 'cancel' || error.type === 'close') {
        return
      }
    }
    console.error('删除失败:', error)
    ElMessage.error('删除失败')
  }
}

const toggleSelectMode = () => {
  isSelectMode.value = !isSelectMode.value
  selectedMaterialIds.value = []
}

const toggleMaterialSelection = (materialId: number) => {
  const index = selectedMaterialIds.value.indexOf(materialId)
  if (index > -1) {
    selectedMaterialIds.value.splice(index, 1)
  } else {
    selectedMaterialIds.value.push(materialId)
  }
}

const selectAll = () => {
  const currentMaterials = filteredMaterials()
  selectedMaterialIds.value = currentMaterials.map(m => m.id)
}

const batchDelete = async () => {
  if (selectedMaterialIds.value.length === 0) {
    ElMessage.warning('请先选择要删除的素材')
    return
  }

  // try {
  //   await ElMessageBox.confirm(
  //     `确定要删除选中的 ${selectedMaterialIds.value.length} 个素材吗？`,
  //     '批量删除确认',
  //     {
  //       confirmButtonText: '确定',
  //       cancelButtonText: '取消',
  //       type: 'warning'
  //     }
  //   )

  //   for (const id of selectedMaterialIds.value) {
  //     await deleteMaterialApi({
  //       projectId: projectStore.projectId,
  //       materialId: id.toString()
  //     })
  //   }

  //   ElMessage.success(`成功删除 ${selectedMaterialIds.value.length} 个素材`)
  //   selectedMaterialIds.value = []
  //   isSelectMode.value = false
  //   fetchMaterials()
  // } catch (error) {
  //   if (error.type === 'cancel' || error.type === 'close') {
  //     return
  //   }
  //   console.error('批量删除失败:', error)
  //   ElMessage.error('批量删除失败')
  // }
}
</script>

<template>
  <div class="project-materials">
    <div class="header">
      <div class="header-left">
        <h2>素材管理</h2>
      </div>
      <div class="header-right">
        <el-upload
          ref="uploadRef"
          :show-file-list="false"
          :http-request="(options: any) => handleUpload(options.file)"
          multiple
          accept="image/*,video/*,audio/*"
        >
          <el-button type="primary" :loading="uploading" size="default">
            <el-icon class="plus-icon"><Plus /></el-icon>
            {{ uploading ? `上传中 ${uploadIndex + 1}/${uploadQueue.length}` : '上传素材' }}
          </el-button>
        </el-upload>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="material-tabs">
      <el-tab-pane label="🖼️ 图片" name="image">
        <template #label>
          <span class="tab-label">
            <span>🖼️</span>
            <span>图片</span>
            <span class="count">({{ materials.filter(m => m.type === 'image').length }})</span>
          </span>
        </template>
      </el-tab-pane>
      <el-tab-pane label="🎬 视频" name="video">
        <template #label>
          <span class="tab-label">
            <span>🎬</span>
            <span>视频</span>
            <span class="count">({{ materials.filter(m => m.type === 'video').length }})</span>
          </span>
        </template>
      </el-tab-pane>
      <el-tab-pane label="🔊 音频" name="voice">
        <template #label>
          <span class="tab-label">
            <span>🔊</span>
            <span>音频</span>
            <span class="count">({{ materials.filter(m => m.type === 'voice').length }})</span>
          </span>
        </template>
      </el-tab-pane>
    </el-tabs>

    <div class="materials-content">
      <div v-if="filteredMaterials().length === 0" class="empty-state">
        <div class="empty-icon">{{ getTypeIcon(activeTab) }}</div>
        <p>暂无{{ activeTab === 'image' ? '图片' : activeTab === 'video' ? '视频' : '音频' }}素材</p>
        <p class="empty-hint">点击上方上传按钮添加素材</p>
      </div>

      <div v-else>
        <div class="batch-action-bar" :class="{ 'batch-action-bar-active': isSelectMode }">
          <div class="search-section">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索素材名称..."
              clearable
              class="search-input"
            />
          </div>
          <template v-if="isSelectMode">
            <div class="batch-actions">
              <div class="batch-buttons">
                <span class="batch-info">已选择 <strong>{{ selectedMaterialIds.length }}</strong> 个素材</span>
                <el-button size="small" @click="selectAll">全选</el-button>
                <el-button size="small" @click="toggleSelectMode">取消批量</el-button>
                <el-button size="small" type="danger" :icon="Delete" @click="batchDelete">批量删除</el-button>
              </div>
            </div>
          </template>
          <template v-else>
            <div class="batch-buttons">
              <el-button size="small" :icon="Select" @click="toggleSelectMode" class="batch-select-btn">批量选择</el-button>
            </div>
          </template>
        </div>
        <div class="materials-grid">
        <el-card
          v-for="material in filteredMaterials()"
          :key="material.id"
          class="material-card"
          :class="{ 'card-selected': selectedMaterialIds.includes(material.id) }"
          shadow="hover"
        >
          <div v-if="isSelectMode" class="select-checkbox" @click.stop="toggleMaterialSelection(material.id)">
            <el-checkbox :model-value="selectedMaterialIds.includes(material.id)" size="large" />
          </div>
          <div v-else class="delete-btn" @click.stop="deleteMaterial(material)">
            <el-icon><Delete /></el-icon>
          </div>
          <div class="material-preview" @click="isSelectMode ? toggleMaterialSelection(material.id) : previewMedia(material)">
            <template v-if="material.type === 'image'">
              <el-image :src="material.url" fit="cover" class="preview-image" />
            </template>
            <template v-else-if="material.type === 'video'">
              <div class="video-preview">
                <span class="play-icon">▶️</span>
                <span class="video-icon">🎬</span>
              </div>
            </template>
            <template v-else>
              <div class="voice-preview">
                <span class="voice-icon">🔊</span>
              </div>
            </template>
          </div>

          <div class="material-info">
            <div v-if="editingMaterial && editingMaterial.id === material.id" class="rename-input-wrapper">
              <el-input
                v-model="editingName"
                @keyup.enter="handleRename"
                @blur="handleRename"
                ref="nameInputRef"
                autofocus
              />
            </div>
            <div v-else class="material-name-wrapper" @dblclick="!isSelectMode && startRename(material)">
              <p class="material-name" :title="material.name">{{ material.name }}</p>
              <el-icon v-if="!isSelectMode" class="rename-icon" @click.stop="startRename(material)"><Edit /></el-icon>
            </div>
          </div>
        </el-card>
        </div>
      </div>
    </div>
    <el-image-viewer
      v-if="previewVisible"
      :url-list="[previewUrl]"
      :initial-index="0"
      @close="previewVisible = false"
    />
  </div>
</template>

<style scoped lang="less">
.project-materials {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 20px;
  background: #f5f7fa;

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .header-right {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    h2 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      color: #1a1a1a;
      letter-spacing: -0.3px;
    }

    .plus-icon {
      margin-right: 6px;
      font-size: 16px;
    }

    :deep(.el-button) {
      padding: 10px 20px;
      height: auto;
      font-weight: 500;
      border-radius: 8px;
      transition: all 0.2s ease;

      &:hover {
        transform: translateY(-1px);
      }

      &:active {
        transform: translateY(0);
      }

      &:not(.el-button--primary) {
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
        
        &:hover {
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
      }
    }
  }

  .batch-action-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    padding: 12px 16px;
    margin-bottom: 20px;
    border-radius: 10px;
    border: 1px solid #e4e8eb;
    background: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

    .search-section {
      flex: 1;
      max-width: 320px;

      .search-input {
        :deep(.el-input__wrapper) {
          border-radius: 8px;
          box-shadow: 0 0 0 1px #e4e8eb inset;
          transition: all 0.2s ease;

          &:hover {
            box-shadow: 0 0 0 1px #c0c4cc inset;
          }

          &.is-focus {
            box-shadow: 0 0 0 1px #409eff inset;
          }
        }
      }
    }

    .batch-actions {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      flex: 1;
    }

    .batch-info {
      font-size: 14px;
      color: #606266;
      font-weight: 500;
      margin-right: 12px;
      white-space: nowrap;

      strong {
        font-size: 18px;
        margin: 0 4px;
      }
    }

    .batch-buttons {
      display: flex;
      gap: 8px;
      align-items: center;

      :deep(.el-button) {
        border-radius: 8px;
        font-weight: 500;
        transition: all 0.2s ease;
        padding: 10px 20px !important;
        height: auto !important;

        &:hover {
          transform: translateY(-1px);
        }

        &:active {
          transform: translateY(0);
        }

        &:not(.el-button--danger):not(.batch-select-btn) {
          background: white;
          border: 1px solid #dcdfe6;
          color: #606266;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

          &:hover {
            border-color: #409eff;
            color: #409eff;
            box-shadow: 0 2px 6px rgba(64, 158, 255, 0.2);
          }
        }

        &.el-button--danger {
          background: linear-gradient(135deg, #f56c6c 0%, #f78989 100%);
          border: none;
          box-shadow: 0 2px 8px rgba(245, 108, 108, 0.3);

          &:hover {
            background: linear-gradient(135deg, #e65a5a 0%, #f56c6c 100%);
            box-shadow: 0 4px 12px rgba(245, 108, 108, 0.4);
          }
        }
      }

      .batch-select-btn {
        background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
        color: white;
        border: none;
        border-radius: 8px;
        padding: 10px 20px !important;
        height: auto !important;
        font-weight: 500;
        box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
        transition: all 0.2s ease;

        &:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(64, 158, 255, 0.4);
          background: linear-gradient(135deg, #337ecc 0%, #409eff 100%);
        }

        &:active {
          transform: translateY(0);
        }
      }
    }

    &.batch-action-bar-active {
      background: linear-gradient(135deg, #ecf5ff 0%, #e6f7ff 100%);
      border-color: #b3d8ff;

      .batch-info {
        color: #409eff;
      }
    }
  }

  .material-tabs {
    background: white;
    padding: 0 20px;
    border-radius: 12px;
    margin-bottom: 24px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

    :deep(.el-tabs__header) {
      margin: 0;
    }

    :deep(.el-tabs__nav-wrap::after) {
      background: #e4e8eb;
      height: 1px;
    }

    :deep(.el-tabs__item) {
      font-size: 15px;
      font-weight: 500;
      height: 56px;
      line-height: 56px;
      padding: 0 28px;
      color: #606266;
      transition: all 0.2s ease;

      &:hover {
        color: #409eff;
      }

      &.is-active {
        color: #409eff;
        font-weight: 600;
      }
    }

    :deep(.el-tabs__active-bar) {
      height: 3px;
      border-radius: 3px 3px 0 0;
    }
  }

  .tab-label {
    display: flex;
    align-items: center;
    gap: 8px;

    .count {
      color: #909399;
      font-size: 13px;
      padding: 2px 8px;
      border-radius: 10px;
      font-weight: 500;
    }
  }

  .materials-content {
    flex: 1;

    .batch-action-bar {
      margin-bottom: 16px;
    }

    .empty-state {
      background: white;
      border-radius: 12px;
      text-align: center;
      padding: 100px 40px;
      color: #909399;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

      .empty-icon {
        font-size: 72px;
        margin-bottom: 24px;
        opacity: 0.6;
      }

      p {
        margin: 8px 0;
        font-size: 16px;
        color: #606266;
      }

      .empty-hint {
        font-size: 14px;
        color: #909399;
        margin-top: 12px;
      }
    }

    .materials-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 24px;

      .material-card {
        border-radius: 16px;
        overflow: hidden;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        cursor: pointer;
        position: relative;
        background: white;
        border: 1px solid #e4e8eb;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

        &.card-selected {
          border-color: #409eff;
          box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.15), 0 4px 16px rgba(0, 0, 0, 0.1);
          transform: translateY(-4px);

          .select-checkbox {
            :deep(.el-checkbox__inner) {
              background-color: #409eff;
              border-color: #409eff;
            }
          }
        }

        &:hover {
          transform: translateY(-6px);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
          border-color: #d9d9d9;
          
          .delete-btn {
            opacity: 1;
            transform: scale(1);
          }
          
          .rename-icon {
            opacity: 1;
          }
        }

        .select-checkbox {
          position: absolute;
          top: 12px;
          left: 12px;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 10;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transition: all 0.2s ease;
          
          &:hover {
            transform: scale(1.05);
          }
        }

        .delete-btn {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transform: scale(0.9);
          transition: all 0.2s ease;
          cursor: pointer;
          z-index: 10;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          
          &:hover {
            background: #f56c6c;
            color: white;
            transform: scale(1.05);
          }
        }

        .material-preview {
          height: 180px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          cursor: pointer;
          position: relative;
          overflow: hidden;

          &::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.03) 100%);
            pointer-events: none;
          }

          .preview-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.4s ease;
          }

          &:hover .preview-image {
            transform: scale(1.05);
          }

          .video-preview,
          .voice-preview {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
            position: relative;
            z-index: 1;

            .play-icon {
              font-size: 36px;
              opacity: 0.8;
            }

            .video-icon,
            .voice-icon {
              font-size: 56px;
              opacity: 0.7;
            }
          }
        }

        .material-info {
          padding: 16px 16px 0 16px;

          .rename-input-wrapper {
            width: 100%;
          }

          .material-name-wrapper {
            display: flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;

            .material-name {
              margin: 0;
              flex: 1;
              font-size: 14px;
              font-weight: 500;
              color: #303133;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              line-height: 1.4;
            }

            .rename-icon {
              color: #909399;
              opacity: 1;
              transition: all 0.2s ease;
              cursor: pointer;
              padding: 6px;
              border-radius: 6px;
              flex-shrink: 0;

              &:hover {
                color: #409eff;
                background: #ecf5ff;
              }
            }
          }
        }
      }
    }
  }
}
</style>
