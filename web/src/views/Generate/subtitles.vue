<script setup>
import { ref, watch, onMounted } from 'vue'
import { useGenerateStore } from './index.store'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { getSubtitles } from '../../api/generate'

const props = defineProps({
    /** 与热点详情「描述」一致，来自 Coze 解析的 event_description */
    eventDescription: {
        type: String,
        default: '',
    },
    /** 当前事件 id，切换事件时重置分段 */
    eventId: {
        type: String,
        default: '',
    },
})

const store = useGenerateStore()
const { subtitleType, subtitleSegments } = storeToRefs(store)

const subtitleList = ref([])
const subtitlesLoading = ref(true)

/**
 * 按中文逗号（，）、句号（。）分句；遇标点即截成一句（含标点）。
 * 最后一段若无标点则单独成句。
 */
function splitDescriptionToSegments(text) {
    const raw = String(text ?? '')
    const s = raw.replace(/\r\n/g, '\n').replace(/\n+/g, ' ').trim()
    if (!s) {
        return ['']
    }
    const parts = []
    let buf = ''
    for (const ch of s) {
        buf += ch
        if (ch === '，' || ch === '。') {
            const t = buf.trim()
            if (t) {
                parts.push(t)
            }
            buf = ''
        }
    }
    const tail = buf.trim()
    if (tail) {
        parts.push(tail)
    }
    return parts.length ? parts : ['']
}

function applySegmentsFromDescription(desc) {
    subtitleSegments.value = splitDescriptionToSegments(desc)
}

/** 切换事件：整表重置 */
watch(
    () => props.eventId,
    () => {
        applySegmentsFromDescription(props.eventDescription)
    },
    { immediate: true }
)

/** 同事件下描述异步加载完成：仅在仍为空白分句时填入 */
watch(
    () => props.eventDescription,
    (desc) => {
        const hasDesc = String(desc ?? '').trim()
        const onlyEmpty =
            subtitleSegments.value.length === 1 &&
            !String(subtitleSegments.value[0] ?? '').trim()
        if (hasDesc && onlyEmpty) {
            applySegmentsFromDescription(desc)
        }
    }
)

function addSentence() {
    subtitleSegments.value.push('')
}

function removeSentence(idx) {
    if (subtitleSegments.value.length <= 1) return
    subtitleSegments.value.splice(idx, 1)
}

onMounted(async () => {
    try {
        const { data } = await getSubtitles()
        const list = data?.data ?? []
        subtitleList.value = list
        if (list.length && !subtitleType.value) {
            subtitleType.value = list[0].code
        } else if (!list.length && !subtitleType.value) {
            subtitleType.value = 'auto'
        }
    } catch (e) {
        console.error(e)
        ElMessage.error('获取字幕列表失败')
        if (!subtitleType.value) {
            subtitleType.value = 'auto'
        }
    } finally {
        subtitlesLoading.value = false
    }
})
</script>

<template>
    <el-card class="config-card">
        <template #header>
            <div class="config-header">
                <span>字幕配置</span>
            </div>
        </template>
        <div class="config-content">
            <el-form :inline="true" label-width="80px">
                <el-form-item label="字幕类型">
                    <el-select
                        style="width: 200px"
                        v-model="subtitleType"
                        placeholder="选择字幕类型"
                        :loading="subtitlesLoading"
                        :disabled="subtitlesLoading"
                    >
                        <el-option
                            v-for="s in subtitleList"
                            :key="s.id"
                            :label="s.name"
                            :value="s.code"
                        />
                    </el-select>
                </el-form-item>
            </el-form>

            <el-form-item label="内容文本" class="content-text-form-item">
                <div class="subtitle-segments">
                    <div
                        v-for="(_, idx) in subtitleSegments"
                        :key="idx"
                        class="segment-row"
                    >
                        <div class="segment-head">
                            <span class="segment-label">第 {{ idx + 1 }} 句</span>
                            <el-button
                                v-if="subtitleSegments.length > 1"
                                link
                                type="danger"
                                size="small"
                                @click="removeSentence(idx)"
                            >
                                删除
                            </el-button>
                        </div>
                        <el-input
                            v-model="subtitleSegments[idx]"
                            :rows="3"
                            placeholder="单句可编辑；导入时按「，」「。」自动分句"
                            class="segment-input"
                        />
                    </div>
                    <el-button link type="primary" @click="addSentence">添加一句</el-button>
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

.content-text-form-item {
    display: block;
    margin-bottom: 0;
}

.content-text-form-item :deep(.el-form-item__content) {
    display: block;
    width: 100%;
    max-width: 720px;
}

.subtitle-segments {
    width: 100%;
}

.segment-row {
    margin-bottom: 14px;
}

.segment-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
}

.segment-label {
    font-size: 13px;
    color: #606266;
}

.segment-input {
    width: 100%;
}
</style>
