<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getHotspotDetailById, runCozeBySummary } from '../../api/generate'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const detail = ref(null)
const cozeLoading = ref(false)

const eventId = computed(() => String(route.query.id || ''))
const parsedCoze = computed(() => {
    const raw = String(detail.value?.coze_text ?? '').trim()
    if (!raw) {
        return { eventDescription: '', mediaUrls: [], raw: '' }
    }
    try {
        const obj = JSON.parse(raw)
        return {
            eventDescription: String(obj?.event_description ?? ''),
            mediaUrls: Array.isArray(obj?.media_urls) ? obj.media_urls : [],
            raw: '',
        }
    } catch {
        return { eventDescription: '', mediaUrls: [], raw }
    }
})

function goBack() {
    router.push('/event')
}

async function loadDetailById() {
    const { data } = await getHotspotDetailById(eventId.value)
    detail.value = data || null
}

async function ensureCozeText() {
    const eventTitle = String(detail.value?.title ?? detail.value?.summary ?? '').trim()
    if (!eventTitle || !eventId.value) return

    cozeLoading.value = true
    try {
        await runCozeBySummary(String(eventId.value), eventTitle)
        await loadDetailById()
    } finally {
        cozeLoading.value = false
    }
}

async function fetchDetail() {
    if (!eventId.value) {
        detail.value = null
        return
    }

    loading.value = true
    try {
        await loadDetailById()
        if (!detail.value) return

        const cozeText = String(detail.value.coze_text ?? '').trim()
        if (!cozeText) {
            await ensureCozeText()
        }
    } catch (error) {
        detail.value = null
        ElMessage.error(error?.response?.data?.message || '获取详情失败')
    } finally {
        loading.value = false
    }
}

onMounted(fetchDetail)
watch(eventId, fetchDetail)
</script>

<template>
    <div class="generate-page">
        <el-card class="generate-card">
            <template #header>
                <div class="header">
                    <span>{{ detail?.summary || '加载中...' }}</span>
                    <el-button link type="primary" @click="goBack">返回事件列表</el-button>
                </div>
            </template>

            <el-skeleton :loading="loading" animated :rows="5">
                <template #default>
                    <el-empty v-if="!eventId" description="缺少 id 参数" />
                    <el-empty v-else-if="!detail" description="未找到对应数据" />
                    <el-descriptions v-else :column="1" border label-width="100px">
                        <el-descriptions-item label="事件 ID">{{ detail.id }}</el-descriptions-item>
                        <el-descriptions-item label="日期">{{ detail.time || '-' }}</el-descriptions-item>
                        <el-descriptions-item label="标题">{{ detail.summary || '-' }}</el-descriptions-item>
                        <el-descriptions-item label="摘要">{{ detail.title || '-' }}</el-descriptions-item>
                        <el-descriptions-item label="提醒">{{ detail.remake || '-' }}</el-descriptions-item>
                        <el-descriptions-item label="热点详情">
                            <span v-if="cozeLoading" class="coze-loading">正在整理中</span>
                            <div v-else class="coze-result">
                                <div class="coze-block">
                                    <div class="coze-label">描述</div>
                                    <p class="coze-text">{{ parsedCoze.eventDescription || '-' }}</p>
                                </div>
                                <div class="coze-block">
                                    <div class="coze-label">媒体链接</div>
                                    <ul v-if="parsedCoze.mediaUrls.length" class="coze-links">
                                        <li v-for="(url, idx) in parsedCoze.mediaUrls" :key="`${url}-${idx}`">
                                            <a :href="url" target="_blank" rel="noopener noreferrer">{{ url }}</a>
                                        </li>
                                    </ul>
                                    <p v-else>-</p>
                                </div>
                                <div v-if="parsedCoze.raw" class="coze-block">
                                    <div class="coze-label">原始内容</div>
                                    <pre class="coze-raw">{{ parsedCoze.raw }}</pre>
                                </div>
                            </div>
                        </el-descriptions-item>
                    </el-descriptions>
                </template>
            </el-skeleton>
        </el-card>
    </div>
</template>

<style lang="less" scoped>
.generate-page {
    width: 100%;
}

.generate-card {
    width: 100%;
}

.header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.coze-result {
    display: flex;
    flex-direction: column;
    gap: 10px;
    font-size: 12px;
    line-height: 1.6;
}

.coze-block {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.coze-label {
    color: #909399;
}

.coze-text {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
}

.coze-links {
    margin: 0;
    padding-left: 16px;
}

.coze-raw {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
}

.coze-loading {
    color: #e6a23c;
}
</style>
