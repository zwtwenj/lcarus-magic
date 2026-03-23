<script setup>
import { useGenerateStore } from './index.store'
import { storeToRefs } from 'pinia'
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { synthesizeSpeech, getDefaultSounds } from '../../api/generate'

const store = useGenerateStore()
const { voiceUrl, voiceSpeed, voiceVolume, backgroundMusic } = storeToRefs(store)

/** 选择「自定义」且尚未上传时，v-model 为该占位，与真实 ossUrl 区分 */
const VOICE_CUSTOM = '__custom__'
const isCustomVoice = computed(() => voiceUrl.value === VOICE_CUSTOM)

// 语音上传相关
const uploadLoading = ref(false)
const uploadSuccess = ref(false)
const uploadedFile = ref(null)
const synthesisText = ref('')
const synthesisLoading = ref(false)

/** 最近一次合成结果的播放地址（OSS 或本地 Blob URL） */
const lastSynthPlayUrl = ref('')
const lastSynthIsObjectUrl = ref(false)
const synthPreviewAudioRef = ref(null)

function base64ToBlob(base64, mimeType = 'audio/mpeg') {
    const bin = atob(base64)
    const arr = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i += 1) {
        arr[i] = bin.charCodeAt(i)
    }
    return new Blob([arr], { type: mimeType })
}

function revokeLastSynthPlayUrl() {
    if (lastSynthIsObjectUrl.value && lastSynthPlayUrl.value) {
        URL.revokeObjectURL(lastSynthPlayUrl.value)
    }
    lastSynthPlayUrl.value = ''
    lastSynthIsObjectUrl.value = false
}

const canPreviewSynthesis = computed(
    () => !!String(lastSynthPlayUrl.value || '').trim()
)

const defaultSounds = ref([])
const defaultsLoading = ref(true)

const selectedOssUrl = computed(() => {
    const v = voiceUrl.value
    if (v === VOICE_CUSTOM) {
        return uploadedFile.value?.ossUrl || ''
    }
    if (typeof v === 'string' && /^https?:\/\//i.test(v)) {
        return v
    }
    return ''
})

const canPreviewVoice = computed(() => {
    const url = selectedOssUrl.value?.trim()
    if (!url) return false
    if (isCustomVoice.value && !uploadSuccess.value) return false
    return true
})

const previewAudioRef = ref(null)

function handlePreviewVoice() {
    const url = selectedOssUrl.value?.trim()
    if (!url) {
        ElMessage.warning('当前选择无可试听音频')
        return
    }
    if (isCustomVoice.value && !uploadSuccess.value) {
        ElMessage.warning('请先上传参考音频')
        return
    }
    if (previewAudioRef.value) {
        previewAudioRef.value.pause()
        previewAudioRef.value = null
    }
    const audio = new Audio(url)
    previewAudioRef.value = audio
    audio.play().catch(() => {
        ElMessage.error('试听失败，请检查网络或音频链接是否有效')
        previewAudioRef.value = null
    })
}

function handlePreviewSynthesis() {
    const url = String(lastSynthPlayUrl.value || '').trim()
    if (!url) {
        ElMessage.warning('请先完成语音合成后再试听')
        return
    }
    if (synthPreviewAudioRef.value) {
        synthPreviewAudioRef.value.pause()
        synthPreviewAudioRef.value = null
    }
    const audio = new Audio(url)
    synthPreviewAudioRef.value = audio
    audio.play().catch(() => {
        ElMessage.error('试听失败，请检查音频是否有效')
        synthPreviewAudioRef.value = null
    })
}

onMounted(async () => {
    try {
        const { data } = await getDefaultSounds()
        const list = data?.data ?? []
        defaultSounds.value = list
        if (list.length && !voiceUrl.value) {
            voiceUrl.value = list[0].ossUrl || list[0].ossurl || ''
        } else if (!list.length && !voiceUrl.value) {
            voiceUrl.value = VOICE_CUSTOM
        }
    } catch (e) {
        console.error(e)
        ElMessage.error('获取默认声音失败')
        if (!voiceUrl.value) {
            voiceUrl.value = VOICE_CUSTOM
        }
    } finally {
        defaultsLoading.value = false
    }
})

watch(voiceUrl, (v) => {
    if (v !== VOICE_CUSTOM) {
        uploadSuccess.value = false
        uploadedFile.value = null
    }
})

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
        const u = String(data.data?.ossUrl || '').trim()
        uploadSuccess.value = true
        if (u) {
            store.voiceUrl = u
        }
        ElMessage.success('音频文件上传成功，可用于声音复刻')
    } catch (error) {
        ElMessage.error('上传失败，请重试')
        console.error('上传失败:', error)
    } finally {
        uploadLoading.value = false
    }
}

// 处理上传前的验证（wav / mp3）
const beforeUpload = (file) => {
    const name = (file.name || '').toLowerCase()
    const type = (file.type || '').toLowerCase()
    const okExt = name.endsWith('.wav') || name.endsWith('.mp3')
    const okType =
        type === 'audio/wav' ||
        type === 'audio/x-wav' ||
        type === 'audio/wave' ||
        type === 'audio/mpeg' ||
        type === 'audio/mp3'
    if (!okExt && !okType) {
        ElMessage.error('只支持上传 wav、mp3 格式的音频文件')
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
    store.voiceUrl = VOICE_CUSTOM
}

const handleSynthesize = async () => {
    const ossUrl = selectedOssUrl.value?.trim()
    const text = synthesisText.value?.trim()
    if (!ossUrl) {
        ElMessage.warning(
            isCustomVoice.value
                ? '请先上传参考音频'
                : '请选择有效的预设声音'
        )
        return
    }
    if (!text) {
        ElMessage.warning('请输入要合成的文本')
        return
    }
    synthesisLoading.value = true
    try {
        const { data } = await synthesizeSpeech({ url: ossUrl, text })
        ElMessage.success(data?.message || '语音合成成功')
        const payload = data?.data
        revokeLastSynthPlayUrl()
        if (payload?.ossUrl) {
            lastSynthPlayUrl.value = payload.ossUrl
            lastSynthIsObjectUrl.value = false
        } else if (payload?.audioBase64) {
            const blob = base64ToBlob(
                payload.audioBase64,
                payload.mimeType || 'audio/mpeg'
            )
            lastSynthPlayUrl.value = URL.createObjectURL(blob)
            lastSynthIsObjectUrl.value = true
        }
    } catch (error) {
        const msg =
            error.response?.data?.message ||
            error.response?.data?.error ||
            error.message ||
            '语音合成失败'
        ElMessage.error(msg)
        console.error('语音合成失败:', error)
    } finally {
        synthesisLoading.value = false
    }
}

onUnmounted(() => {
    if (previewAudioRef.value) {
        previewAudioRef.value.pause()
        previewAudioRef.value = null
    }
    if (synthPreviewAudioRef.value) {
        synthPreviewAudioRef.value.pause()
        synthPreviewAudioRef.value = null
    }
    revokeLastSynthPlayUrl()
})
</script>

<template>
    <el-card class="config-card">
        <template #header>
            <div class="config-header">
                <span>声音配置</span>
            </div>
        </template>
        <div class="config-content">
            <el-form :inline="true" label-width="90px">
                <el-form-item label="语音选择">
                    <div class="voice-select-row">
                        <el-select
                            style="width: 280px"
                            v-model="voiceUrl"
                            class="voice-select-input"
                            placeholder="选择声音"
                            :loading="defaultsLoading"
                            :disabled="defaultsLoading"
                        >
                            <el-option label="自定义" :value="VOICE_CUSTOM" />
                            <el-option
                                v-for="s in defaultSounds"
                                :key="s.id"
                                :label="s.title"
                                :value="s.ossUrl || s.ossurl"
                            />
                        </el-select>
                        <el-button
                            type="default"
                            :disabled="!canPreviewVoice"
                            @click="handlePreviewVoice"
                        >
                            试听
                        </el-button>
                    </div>
                </el-form-item>
                <!-- <el-form-item label="语速">
                    <el-slider v-model="voiceSpeed" :min="0.5" :max="2" :step="0.1"></el-slider>
                </el-form-item>
                <el-form-item label="音量">
                    <el-slider v-model="voiceVolume" :min="0" :max="100" :step="1"></el-slider>
                </el-form-item> -->
            </el-form>
            <!-- <el-form-item label="背景音乐">
                <el-select v-model="backgroundMusic" placeholder="选择背景音乐">
                    <el-option label="轻松愉快" value="happy"></el-option>
                    <el-option label="紧张刺激" value="exciting"></el-option>
                    <el-option label="温馨感人" value="warm"></el-option>
                    <el-option label="无背景音乐" value="none"></el-option>
                </el-select>
            </el-form-item> -->
            
            <!-- 语音上传功能 -->
            <el-form-item label="语音上传" v-if="isCustomVoice">
                <el-upload
                    class="upload-demo"
                    :auto-upload="false"
                    :on-change="handleUpload"
                    :before-upload="beforeUpload"
                    :disabled="uploadSuccess"
                    accept=".wav,.mp3,audio/wav,audio/mpeg"
                >
                    <el-button type="primary" :loading="uploadLoading">
                        {{ uploadLoading ? '上传中...' : '点击上传 wav / mp3 参考音频' }}
                    </el-button>
                    <template #tip>
                        <div class="el-upload__tip">
                            支持 wav、mp3，大小不超过 50MB
                        </div>
                    </template>
                </el-upload>
                <div v-if="uploadSuccess" class="upload-success">
                    <el-tag type="success">上传成功</el-tag>
                    <span class="file-info">{{ uploadedFile?.originalname }}</span>
                    <el-button type="text" size="small" @click="resetUpload">重新上传</el-button>
                </div>
            </el-form-item>

            <el-form-item label="文案与合成">
                <div class="synthesis-row">
                    <el-input
                        v-model="synthesisText"
                        type="textarea"
                        :rows="3"
                        placeholder="输入要合成的文本"
                        class="synthesis-input"
                    />
                    <el-button
                        type="primary"
                        class="synthesis-btn"
                        :loading="synthesisLoading"
                        :disabled="!selectedOssUrl"
                        @click="handleSynthesize"
                    >
                        语音合成
                    </el-button>
                    <el-button
                        type="default"
                        class="synthesis-btn"
                        :disabled="!canPreviewSynthesis"
                        @click="handlePreviewSynthesis"
                    >
                        试听
                    </el-button>
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

.voice-select-row {
    display: inline-flex;
    align-items: center;
    gap: 10px;
}

.voice-select-input {
    width: 200px;
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

.synthesis-row {
    margin-top: 16px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    max-width: 640px;
}

.synthesis-input {
    flex: 1;
    min-width: 0;
}

.synthesis-btn {
    flex-shrink: 0;
    align-self: flex-start;
    margin-top: 4px;
}
</style>
