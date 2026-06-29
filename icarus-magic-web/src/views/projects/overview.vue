<script setup lang="ts">
import { computed } from 'vue'
import { useProjectStore } from '../../store/project.store'

const projectStore = useProjectStore()
const projectData = computed(() => projectStore.projectData)

// 格式化创建时间
const formattedCreatedAt = computed(() => {
  const raw = projectData.value.createdAt
  if (!raw) return '-'
  const d = new Date(raw)
  if (isNaN(d.getTime())) return String(raw)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
})

const statusText = computed(() => {
  switch (projectData.value.status) {
    case 'pending': return '待处理'
    case 'processing': return '处理中'
    case 'completed': return '已完成'
    case 'failed': return '失败'
    default: return projectData.value.status || '-'
  }
})
</script>

<template>
  <div class="project-overview">
    <div class="page-header">
      <h2>项目总览</h2>
    </div>

    <div class="overview-card">
      <!-- 项目名称 -->
      <div class="info-row">
        <div class="info-label">项目名称</div>
        <div class="info-value name">{{ projectData.name || '-' }}</div>
      </div>

      <!-- 项目状态 -->
      <div class="info-row">
        <div class="info-label">项目状态</div>
        <div class="info-value">
          <span class="status-tag">{{ statusText }}</span>
        </div>
      </div>

      <!-- 创建时间 -->
      <div class="info-row">
        <div class="info-label">创建时间</div>
        <div class="info-value">{{ formattedCreatedAt }}</div>
      </div>

      <!-- 项目介绍 -->
      <div class="info-row column">
        <div class="info-label">项目介绍</div>
        <div class="info-value description">
          {{ projectData.description || '暂无介绍' }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.project-overview {
  width: 100%;

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

  .overview-card {
    background-color: #fff;
    border-radius: 8px;
    padding: 24px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);

    .info-row {
      display: flex;
      align-items: flex-start;
      padding: 14px 0;
      border-bottom: 1px solid #f0f2f5;

      &:last-child {
        border-bottom: none;
      }

      &.column {
        flex-direction: column;
        gap: 8px;
      }

      .info-label {
        width: 100px;
        min-width: 100px;
        font-size: 14px;
        color: #909399;
      }

      .info-value {
        flex: 1;
        font-size: 14px;
        color: #303133;
        line-height: 1.6;

        &.name {
          font-size: 16px;
          font-weight: 600;
        }

        &.description {
          white-space: pre-wrap;
          color: #606266;
        }
      }

      .status-tag {
        display: inline-block;
        padding: 2px 10px;
        background-color: #ecf5ff;
        color: #409eff;
        border-radius: 10px;
        font-size: 12px;
      }
    }
  }
}
</style>
