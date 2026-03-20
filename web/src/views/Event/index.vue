<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getHotspotByDate, refreshHotspotByDate } from '../../api/generate'

const router = useRouter()
const loading = ref(false)
const list = ref([])
const currentDate = ref('')

function formatTodayYmd() {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}${m}${day}`
}

async function fetchTodayHotspot() {
    loading.value = true
    currentDate.value = formatTodayYmd()
    try {
        const { data } = await getHotspotByDate(currentDate.value)
        list.value = Array.isArray(data) ? data : []
    } catch (error) {
        list.value = []
        ElMessage.error(error?.response?.data?.message || '获取今日热点失败')
    } finally {
        loading.value = false
    }
}

async function refreshTodayHotspot() {
    loading.value = true
    currentDate.value = formatTodayYmd()
    try {
        const { data } = await refreshHotspotByDate(currentDate.value)
        list.value = Array.isArray(data) ? data : []
        ElMessage.success('刷新成功')
    } catch (error) {
        ElMessage.error(error?.response?.data?.message || '刷新热点失败')
    } finally {
        loading.value = false
    }
}

onMounted(fetchTodayHotspot)

function goGenerate(item, index) {
    const id = item?.id ?? index + 1
    router.push(`/generate?id=${encodeURIComponent(id)}`)
}
</script>

<template>
    <div class="generate-page">
        <el-card class="main-card">
            <template #header>
                <div class="header">
                    <span>今日热点（{{ currentDate || '-' }}）</span>
                    <el-button :loading="loading" @click="refreshTodayHotspot">刷新</el-button>
                </div>
            </template>

            <el-skeleton :loading="loading" animated :rows="6">
                <template #default>
                    <el-empty v-if="!list.length" description="暂无数据" />
                    <div v-else class="list">
                        <el-card
                            v-for="(item, index) in list"
                            :key="item.id || index"
                            class="item-card"
                            shadow="never"
                            @click="goGenerate(item, item.id)"
                        >
                            <h3 class="title">{{ item.summary || '无标题' }}</h3>
                            <p class="summary">{{ item.title || '-' }}</p>
                            <div v-if="item.remake || item.remark" class="remark-wrap">
                                <el-tag type="warning" effect="light">
                                    提醒：{{ item.remake || item.remark }}
                                </el-tag>
                            </div>
                        </el-card>
                    </div>
                </template>
            </el-skeleton>
        </el-card>
    </div>
</template>

<style lang="less" scoped>
.generate-page {
    width: 100%;
}

.main-card {
    width: 100%;
}

.list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
}

.item-card {
    width: 100%;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.item-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 18px rgba(0, 0, 0, 0.08);
    border-color: #c6e2ff;
}

.header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.title {
    margin: 0 0 8px;
    font-size: 16px;
    color: #303133;
}

.summary {
    margin: 0;
    color: #606266;
}

.remark-wrap {
    margin-top: 8px;
}
</style>