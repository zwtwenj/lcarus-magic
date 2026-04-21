<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElImage, ElButton, ElMessage, ElInputTag } from 'element-plus'
import type { Material } from '@/api/material'
import { tagMaterial, getMaterialDetail, renameMaterial, updateMaterialTags } from '@/api/material'

interface Props {
  materialId: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  update: [material: Material]
}>()

const material = ref<Material | null>(null)
const isTagging = ref(false)
const isLoading = ref(false)
const isRenaming = ref(false)
const isEditingTags = ref(false)
const newName = ref('')
const editableTags = ref<string[]>([])

onMounted(async () => {
  isLoading.value = true
  try {
    material.value = await getMaterialDetail({ materialId: props.materialId })
  } catch (error) {
    console.error('获取素材详情失败:', error)
    ElMessage.error('获取素材详情失败')
  } finally {
    isLoading.value = false
  }
})

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

const formattedFileSize = computed(() => formatFileSize(material.value?.fileSize))

const handleAutoTag = async () => {
  if (!material.value) return

  isTagging.value = true
  try {
    const updatedMaterial = await tagMaterial({
      projectId: material.value.projectId.toString(),
      materialId: material.value.id.toString()
    })
    material.value = updatedMaterial
    emit('update', updatedMaterial)
    ElMessage.success('打标成功')
  } catch (error) {
    console.error('打标失败:', error)
    ElMessage.error('打标失败')
  } finally {
    isTagging.value = false
  }
}

const handleRename = async () => {
  if (!material.value || !newName.value.trim()) return

  isRenaming.value = true
  try {
    const updatedMaterial = await renameMaterial({
      projectId: material.value.projectId.toString(),
      materialId: material.value.id.toString(),
      newName: newName.value.trim()
    })
    material.value = updatedMaterial
    emit('update', updatedMaterial)
    ElMessage.success('重命名成功')
    newName.value = ''
  } catch (error) {
    console.error('重命名失败:', error)
    ElMessage.error('重命名失败')
  } finally {
    isRenaming.value = false
  }
}

const startRename = () => {
  if (!material.value) return
  newName.value = material.value.name
  isRenaming.value = true
}

const cancelRename = () => {
  isRenaming.value = false
  newName.value = ''
}

const handleManualTag = async () => {
  if (!material.value) return
  editableTags.value = [...(material.value.tags || [])]
  isEditingTags.value = true
}

const handleSaveTags = async () => {
  if (!material.value) return

  isTagging.value = true
  try {
    const updatedMaterial = await updateMaterialTags({
      projectId: material.value.projectId.toString(),
      materialId: material.value.id.toString(),
      tags: editableTags.value
    })
    material.value = updatedMaterial
    emit('update', updatedMaterial)
    ElMessage.success('保存成功')
    isEditingTags.value = false
  } catch (error) {
    console.error('保存标签失败:', error)
    ElMessage.error('保存标签失败')
  } finally {
    isTagging.value = false
  }
}

const cancelEditTags = () => {
  isEditingTags.value = false
  editableTags.value = []
}
</script>

<template>
  <div class="material-info-container" v-loading="isLoading">
    <div class="material-left">
      <template v-if="material?.type === 'image'">
        <el-image :src="material?.url" fit="contain" class="material-display" />
      </template>
      <template v-else-if="material?.type === 'video'">
        <div class="video-display">
          <span class="video-icon">🎬</span>
          <span class="video-text">{{ material?.name }}</span>
        </div>
      </template>
      <template v-else>
        <div class="voice-display">
          <span class="voice-icon">🔊</span>
          <span class="voice-text">{{ material?.name }}</span>
        </div>
      </template>
    </div>
    <div class="material-right">
      <div class="info-section" v-if="material">
        <div class="material-title-row">
          <template v-if="isRenaming">
            <el-input v-model="newName" size="default" style="flex: 1;" />
            <el-button type="primary" :loading="isRenaming" @click="handleRename">确认</el-button>
            <el-button @click="cancelRename">取消</el-button>
          </template>
          <template v-else>
            <h3 class="material-title">{{ material.name }}</h3>
            <el-button type="primary" link @click="startRename">编辑</el-button>
          </template>
        </div>
        <div class="detail-item">
          <label>所属项目：</label>
          <span>{{ material.project?.name || '-' }}</span>
        </div>
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
        <div class="detail-item tags-detail-item">
          <label>素材标签：</label>
          <div class="tags-content">
            <div class="tags-top-buttons">
              <el-button type="primary" :loading="isTagging" @click="handleAutoTag">自动打标</el-button>
              <el-button type="primary" @click="handleManualTag">手动打标</el-button>
            </div>
            <div class="tags-edit-area">
              <div v-if="isEditingTags" class="tags-editing">
                <el-input-tag v-model="editableTags" placeholder="输入标签后按回车添加" class="tags-input" />
                <el-button type="primary" :loading="isTagging" @click="handleSaveTags">保存</el-button>
                <el-button @click="cancelEditTags">取消</el-button>
              </div>
              <div v-else class="tags-display">
                <div class="tags-wrapper" v-if="material.tags && material.tags.length > 0">
                  <div class="tags-container">
                    <span v-for="tag in material.tags" :key="tag" class="tag-item">{{ tag }}</span>
                  </div>
                </div>
                <div v-if="material.tags && material.tags.length > 0" class="edit-tag-btn">
                  <el-button type="primary" link @click="handleManualTag">编辑标签</el-button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
}

.video-icon,
.voice-icon {
  font-size: 64px;
}

.video-text,
.voice-text {
  font-size: 16px;
  color: #909399;
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

.material-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.material-title-row .material-title {
  flex: 1;
}

.tags-detail-item {
  align-items: baseline;
}

.tags-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.tags-top-buttons {
  margin-bottom: 20px;
  display: flex;
  gap: 8px;
}

.tags-edit-area {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.tags-editing {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tags-input {
  flex: 1;
  margin-bottom: 20px;
}

.tags-display {
  display: flex;
  align-items: center;
  gap: 10px;
}

.tags-wrapper {
  flex: 1;
  display: flex;
}

.edit-tag-btn {
  display: flex;
  align-items: center;
}

.detail-item {
  display: flex;
  gap: 8px;
  font-size: 14px;
  align-items: center;
}

.detail-item label {
  color: #909399;
  white-space: nowrap;
}

.detail-item span {
  color: #303133;
}

.detail-item .el-input-tag {
  flex: 1;
  max-width: 400px;
}

.tags-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tags-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.no-tags {
  color: #909399;
  font-size: 14px;
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
