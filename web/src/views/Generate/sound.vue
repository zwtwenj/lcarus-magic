<script setup>
import { useGenerateStore } from './index.store'
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

const { voiceType, voiceSpeed, voiceVolume, backgroundMusic } = useGenerateStore()

// 语音上传相关
const uploadLoading = ref(false)
const uploadSuccess = ref(false)
const uploadedFile = ref(null)

// 处理文件上传
const handleUpload = async (file) => {
    uploadLoading.value = true
    uploadSuccess.value = false
    
    try {
        const formData = new FormData()
        formData.append('audio', file.raw)
        
        const response = await fetch('/api/sound/enroll', {
            method: 'POST',
            body: formData
        })
        
        if (!response.ok) {
            throw new Error('上传失败')
        }
        
        const data = await response.json()
        uploadedFile.value = data.data
        uploadSuccess.value = true
        ElMessage.success('音频文件上传成功，可用于声音复刻')
    } catch (error) {
        ElMessage.error('上传失败，请重试')
        console.error('上传失败:', error)
    } finally {
        uploadLoading.value = false
    }
}

// 处理上传前的验证
const beforeUpload = (file) => {
    const isWav = file.type === 'audio/wav' || file.name.endsWith('.wav')
    if (!isWav) {
        ElMessage.error('只支持上传wav格式的音频文件')
        return false
    }
    const isLt50M = file.size / 1024 / 1024 < 50
    if (!isLt50M) {
        ElMessage.error('文件大小不能超过50MB')
        return false
    }
    return true
}

// 重置上传状态
const resetUpload = () => {
    uploadSuccess.value = false
    uploadedFile.value = null
}
</script>

<template>
    <el-card class="config-card">
        <template #header>
            <div class="config-header">
                <span>声音配置</span>
            </div>
        </template>
        <div class="config-content">
            <el-form :inline="true" label-width="80px">
                <el-form-item label="语音类型">
                    <el-select v-model="voiceType" placeholder="选择语音类型">
                        <el-option label="男声" value="male"></el-option>
                        <el-option label="女声" value="female"></el-option>
                        <el-option label="中性" value="neutral"></el-option>
                        <el-option label="自定义" value="custom"></el-option>
                    </el-select>
                </el-form-item>
                <el-form-item label="语速">
                    <el-slider v-model="voiceSpeed" :min="0.5" :max="2" :step="0.1"></el-slider>
                </el-form-item>
                <el-form-item label="音量">
                    <el-slider v-model="voiceVolume" :min="0" :max="100" :step="1"></el-slider>
                </el-form-item>
            </el-form>
            <el-form-item label="背景音乐">
                <el-select v-model="backgroundMusic" placeholder="选择背景音乐">
                    <el-option label="轻松愉快" value="happy"></el-option>
                    <el-option label="紧张刺激" value="exciting"></el-option>
                    <el-option label="温馨感人" value="warm"></el-option>
                    <el-option label="无背景音乐" value="none"></el-option>
                </el-select>
            </el-form-item>
            
            <!-- 语音上传功能 -->
            <el-form-item label="语音上传" v-if="voiceType === 'custom'">
                <el-upload
                    class="upload-demo"
                    :auto-upload="false"
                    :on-change="handleUpload"
                    :before-upload="beforeUpload"
                    :disabled="uploadSuccess"
                    accept=".wav"
                >
                    <el-button type="primary" :loading="uploadLoading">
                        {{ uploadLoading ? '上传中...' : '点击上传wav音频文件' }}
                    </el-button>
                    <template #tip>
                        <div class="el-upload__tip">
                            只支持上传wav格式的音频文件，大小不超过50MB
                        </div>
                    </template>
                </el-upload>
                <div v-if="uploadSuccess" class="upload-success">
                    <el-tag type="success">上传成功</el-tag>
                    <span class="file-info">{{ uploadedFile?.originalname }}</span>
                    <el-button type="text" size="small" @click="resetUpload">重新上传</el-button>
                </div>
            </el-form-item>
        </div>
    </el-card>
</template>

<style lang="less" scoped>
.config-card {
    margin-bottom: 20px;
    border-radius: 8px;
}

.config-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.config-content {
    padding: 15px 0;
}

.upload-demo {
    margin-top: 10px;
}

.upload-success {
    margin-top: 10px;
    display: flex;
    align-items: center;
    gap: 10px;
}

.file-info {
    font-size: 14px;
    color: #606266;
}
</style>
