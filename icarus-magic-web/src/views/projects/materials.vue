<script setup lang="ts">
import { ref } from 'vue'
import { uploadMaterial, uploadSound } from '@/api/common'

const uploading = ref(false)
const materialUrl = ref('')
const soundUrl = ref('')

const handleMaterialUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  uploading.value = true
  try {
    const url = await uploadMaterial(file)
    materialUrl.value = url
  } catch (error) {
    console.error('上传失败:', error)
  } finally {
    uploading.value = false
  }
}

const handleSoundUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  uploading.value = true
  try {
    const url = await uploadSound(file)
    soundUrl.value = url
  } catch (error) {
    console.error('上传失败:', error)
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div class="project-materials">
    <h2>素材页面上传测试</h2>

    <div class="upload-section">
      <h3>上传素材</h3>
      <input type="file" @change="handleMaterialUpload" :disabled="uploading" />
      <p v-if="materialUrl">素材地址: {{ materialUrl }}</p>
    </div>

    <div class="upload-section">
      <h3>上传声音</h3>
      <input type="file" @change="handleSoundUpload" :disabled="uploading" />
      <p v-if="soundUrl">声音地址: {{ soundUrl }}</p>
    </div>
  </div>
</template>

<style scoped>
.project-materials {
  padding: 20px;
}

.upload-section {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.upload-section h3 {
  margin-bottom: 15px;
}

.upload-section input {
  margin-bottom: 10px;
}

.upload-section p {
  word-break: break-all;
  color: #409eff;
}
</style>