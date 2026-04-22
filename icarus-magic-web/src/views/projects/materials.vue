<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElCard, ElButton, ElUpload, ElMessage, ElTabPane, ElTabs, ElImage, ElInput, ElIcon, ElMessageBox, ElCheckbox } from 'element-plus'
import { Plus, Delete, Edit, Select } from '@element-plus/icons-vue'
import { addMaterial, getMaterials, deleteMaterial as deleteMaterialApi, renameMaterial, type Material } from '@/api/material'
import { oneClickGenerate } from '@/api/project'
import { useProjectStore } from '@/store/project.store'
import { useCreateDialog } from '@/hook/dialog.hooks'

const projectStore = useProjectStore()
const { openMaterialInfoDialog } = useCreateDialog()
const materials = ref<Material[]>([])
const activeTab = ref<'image' | 'video' | 'voice'>('image')
const uploading = ref(false)
const uploadRef = ref()
const uploadQueue = ref<File[]>([])
const uploadIndex = ref(0)

const editingMaterial = ref<Material | null>(null)
const editingName = ref('')
const nameInputRef = ref()
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

// const getTypeIcon = (type: string) => {
//   const icons: Record<string, string> = {
//     image: '🖼️',
//     video: '🎬',
//     voice: '🔊'
//   }
//   return icons[type] || '📁'
// }

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

const openMaterialDialog = (material: Material) => {
  openMaterialInfoDialog({ materialId: material.id.toString() })
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
  if (!trimmedName || trimmedName === editingMaterial.value.name) {
    editingMaterial.value = null
    return
  }

  try {
    const updatedMaterial = await renameMaterial({
      projectId: projectStore.projectId.toString(),
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
      `确定要删除素材"${material.name}" 吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await deleteMaterialApi({
      projectId: projectStore.projectId.toString(),
      materialId: material.id.toString()
    })

    materials.value = materials.value.filter(m => m.id !== material.id)
    ElMessage.success('删除成功')
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

const toggleSelectMode = () => {
  isSelectMode.value = !isSelectMode.value
  if (!isSelectMode.value) {
    selectedMaterialIds.value = []
  }
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
  const currentTypeMaterials = filteredMaterials()
  selectedMaterialIds.value = currentTypeMaterials.map(m => m.id)
}

const batchDelete = async () => {
  if (selectedMaterialIds.value.length === 0) return

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedMaterialIds.value.length} 个素材吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    for (const materialId of selectedMaterialIds.value) {
      await deleteMaterialApi({
        projectId: projectStore.projectId.toString(),
        materialId: materialId.toString()
      })
    }

    materials.value = materials.value.filter(m => !selectedMaterialIds.value.includes(m.id))
    selectedMaterialIds.value = []
    isSelectMode.value = false
    ElMessage.success('批量删除成功')
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error)
      ElMessage.error('批量删除失败')
    }
  }
}

const handleOneClickGenerate = async () => {
  if (selectedMaterialIds.value.length === 0) {
    ElMessage.warning('请先选择素材')
    return
  }

  const selectedMaterials = materials.value.filter(m => selectedMaterialIds.value.includes(m.id))
  const materialIds = selectedMaterials.map(m => m.id.toString())

  try {
    const result = await oneClickGenerate({
      projectId: projectStore.projectId.toString(),
      materials: materialIds
    })
    console.log('一键成片结果:', result)
    ElMessage.success(result.message || '一键成片功能开发中')
  } catch (error) {
    console.error('一键成片失败:', error)
    ElMessage.error('一键成片失败')
  }
}
</script>

<template>
  <div class="project-materials">
    <div class="materials-header">
      <h2>素材管理</h2>
      <div class="upload-section">
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
      <div>
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
                <el-button @click="selectAll">全选</el-button>
                <el-button @click="toggleSelectMode">取消批量</el-button>
                <el-button type="danger" :icon="Delete" @click="batchDelete">批量删除</el-button>
              </div>
            </div>
          </template>
          <template v-else>
            <div class="batch-buttons">
              <el-button type="primary" :icon="Select" @click="toggleSelectMode">批量选择</el-button>
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
            <div class="material-preview" @click="isSelectMode ? toggleMaterialSelection(material.id) : openMaterialDialog(material)">
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
                  ref="nameInputRef"
                  size="small"
                  @keyup.enter="handleRename"
                  @blur="handleRename"
                />
              </div>
              <div v-else class="material-name-wrapper">
                <span class="material-name">{{ material.name }}</span>
                <el-icon v-if="!isSelectMode" class="rename-icon" @click.stop="startRename(material)"><Edit /></el-icon>
              </div>
            </div>
          </el-card>
        </div>
      </div>
    </div>
    <el-button type="primary" style="margin-top: 20px;" @click="handleOneClickGenerate">一键成片</el-button>
  </div>
</template>

<style scoped>
.project-materials {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
}

.materials-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.upload-section {
  display: flex;
  gap: 12px;
}

.plus-icon {
  margin-right: 4px;
}

.material-tabs {
  margin-bottom: 16px;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
}

.count {
  font-size: 12px;
  color: #909399;
}

.materials-content {
  flex: 1;
  overflow-y: auto;
}

.batch-action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
  transition: all 0.3s;
  border: 1px solid #409eff;
}

.batch-action-bar-active {
  background: #ecf5ff;
}

.search-section {
  flex: 1;
  max-width: 300px;
}

.search-input {
  width: 100%;
}

.batch-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
}

.batch-info {
  font-size: 14px;
  color: #606266;
  margin-right: 8px;
}

.batch-select-btn {
  background: #409eff;
  color: white;
  border: none;
  height: 32px;
}

.batch-select-btn:hover {
  background: #66b1ff;
  color: white;
}

.materials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}

.material-card {
  position: relative;
  cursor: pointer;
  transition: all 0.3s;
}

.material-card:hover {
  transform: translateY(-4px);
}

.material-card.card-selected {
  border-color: #409eff;
  background: #ecf5ff;
}

.select-checkbox {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 10;
}

.delete-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 4px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.3s;
}

.material-card:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: rgba(245, 108, 108, 0.9);
}

.delete-btn .el-icon {
  color: white;
  font-size: 14px;
}

.material-preview {
  width: 100%;
  height: 140px;
  overflow: hidden;
  border-radius: 4px;
  background: #f5f7fa;
}

.preview-image {
  width: 100%;
  height: 100%;
}

.video-preview,
.voice-preview {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.play-icon {
  font-size: 24px;
}

.video-icon,
.voice-icon {
  font-size: 36px;
}

.material-info {
  padding: 12px 8px 8px;
}

.material-name-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.material-name {
  flex: 1;
  font-size: 14px;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rename-icon {
  cursor: pointer;
  color: #909399;
  transition: color 0.3s;
}

.rename-icon:hover {
  color: #409eff;
}

.rename-input-wrapper .el-input {
  width: 100%;
}
</style>
