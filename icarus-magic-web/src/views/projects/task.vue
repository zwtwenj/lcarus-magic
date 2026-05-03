<template>
  <div class="task-page">
    <div class="page-header">
      <h1>任务管理</h1>
      <div class="filter-bar">
        <el-select v-model="filterStatus" placeholder="状态筛选" class="filter-select">
          <el-option label="全部" value="" />
          <el-option label="处理中" value="processing" />
          <el-option label="已完成" value="completed" />
          <el-option label="失败" value="failed" />
        </el-select>
        <el-button @click="refreshTasks" class="refresh-btn">
          <el-icon component="Refresh" />
          刷新
        </el-button>
      </div>
    </div>

    <div class="task-list">
      <div v-if="tasks.length === 0" class="empty-state">
        <el-icon component="List" class="empty-icon" />
        <p>暂无任务</p>
      </div>

      <div v-for="task in tasks" :key="task.id" class="task-card">
        <div class="task-header" @click="toggleExpand(task.id)">
          <div class="task-info">
            <div class="task-title">
              <el-icon :component="expandedTasks.includes(task.id) ? 'ChevronDown' : 'ChevronRight'"
                class="expand-icon" />
              <span>{{ task.title }}</span>
              <span class="task-type">{{ getTypeLabel(task.type) }}</span>
            </div>
            <div class="task-meta">
              <span class="create-time">{{ formatTime(task.create_time) }}</span>
              <span :class="['status-badge', task.status]">{{ getStatusLabel(task.status) }}</span>
            </div>
          </div>
          <div class="task-actions">
            <el-button size="small" @click.stop="viewTask(task)">查看详情</el-button>
          </div>
        </div>

        <div v-if="expandedTasks.includes(task.id) && task.children?.length" class="task-children">
          <div v-for="child in task.children" :key="child.id" class="child-task">
            <el-icon component="Circle" class="child-icon" />
            <span class="child-title">{{ child.title }}</span>
            <span :class="['status-badge', child.status]">{{ getStatusLabel(child.status) }}</span>
            <el-button size="mini" @click.stop="viewTask(child)" class="detail-btn">查看详情</el-button>
          </div>
        </div>
      </div>
    </div>

    <el-pagination v-if="total > 0" class="pagination" :current-page="page" :page-size="pageSize" :total="total"
      @current-change="handlePageChange" />

    <!-- 任务详情弹窗 -->
    <el-dialog v-model="dialogVisible" title="任务详情" width="600px" :close-on-click-modal="true">
      <div v-if="selectedTask" class="task-detail">
        <div class="detail-row">
          <span class="detail-label">任务ID</span>
          <span class="detail-value">{{ selectedTask.id }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">任务标题</span>
          <span class="detail-value">{{ selectedTask.title }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">任务类型</span>
          <span class="detail-value">{{ getTypeLabel(selectedTask.type) }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">任务状态</span>
          <span :class="['detail-value', 'status-badge', selectedTask.status]">{{ getStatusLabel(selectedTask.status)
          }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">创建时间</span>
          <span class="detail-value">{{ formatTime(selectedTask.create_time) }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">父任务ID</span>
          <span class="detail-value">{{ selectedTask.parentid || '无' }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">请求参数(req)</span>
          <pre class="detail-pre">{{ formatJson(selectedTask.req) }}</pre>
        </div>
        <div class="detail-row">
          <span class="detail-label">响应结果(res)</span>
          <pre class="detail-pre">{{ formatJson(selectedTask.res) }}</pre>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getTaskList, type Task, type GetTaskListRequest } from '@/api/task';
interface TaskWithChildren extends Task {
  children?: TaskWithChildren[];
}
const tasks = ref<TaskWithChildren[]>([]);
const expandedTasks = ref<number[]>([]);
const filterStatus = ref<"processing" | "completed" | "failed" | ''>('');
const page = ref(1);
const pageSize = ref(10);
const total = ref(0);
const loading = ref(false);
// 弹窗相关
const dialogVisible = ref(false);
const selectedTask = ref<Task | null>(null);
const getTypeLabel = (type: string) => {
  const typeMap: Record<string, string> = {
    sound: '语音合成',
    projectSounds: '项目语音合成',
    video: '视频合成',
  };
  return typeMap[type] || type;
};
const getStatusLabel = (status: string) => {
  const statusMap: Record<string, string> = {
    processing: '处理中',
    completed: '已完成',
    failed: '失败',
  };
  return statusMap[status] || status;
};
const formatTime = (timeStr: string) => {
  if (!timeStr)
    return '';
  const date = new Date(timeStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};
const toggleExpand = (taskId: number) => {
  const index = expandedTasks.value.indexOf(taskId);
  if (index > -1) {
    expandedTasks.value.splice(index, 1);
  }
  else {
    expandedTasks.value.push(taskId);
  }
};
// 后端已经返回组装好的父子结构，无需额外处理
const loadTasks = async () => {
  loading.value = true;
  try {
    const params: GetTaskListRequest = {
      page: page.value,
      page_size: pageSize.value,
      status: filterStatus.value || undefined,
    };
    const result = await getTaskList(params);
    // 后端已经返回组装好的父子结构，直接使用
    tasks.value = result.list as TaskWithChildren[];
    total.value = result.total;
    page.value = result.page;
    pageSize.value = result.page_size;
  }
  catch (error) {
    console.error('加载任务失败:', error);
  }
  finally {
    loading.value = false;
  }
};
const refreshTasks = () => {
  page.value = 1;
  loadTasks();
};
const handlePageChange = (newPage: number) => {
  page.value = newPage;
  loadTasks();
};
const formatJson = (jsonStr: string | undefined) => {
  if (!jsonStr) return '{}';
  try {
    return JSON.stringify(JSON.parse(jsonStr), null, 2);
  } catch {
    return jsonStr;
  }
};

const viewTask = (task: Task) => {
  selectedTask.value = task;
  dialogVisible.value = true;
};
onMounted(() => {
  loadTasks();
});
</script>

<style scoped lang="less">
.task-page {
  padding: 20px;
  min-height: 100vh;
  background: #f5f7fa;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

  h1 {
    font-size: 20px;
    font-weight: 600;
    color: #333;
  }

  .filter-bar {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .filter-select {
    width: 150px;
  }

  .refresh-btn {
    padding: 6px 16px;
  }
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  background: #fff;
  border-radius: 8px;

  .empty-icon {
    font-size: 48px;
    color: #ccc;
    margin-bottom: 16px;
  }

  p {
    color: #999;
    font-size: 14px;
  }
}

.task-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #f9fafb;
  }

  .task-info {
    flex: 1;
  }

  .task-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    font-weight: 500;
    color: #333;
    margin-bottom: 8px;

    .expand-icon {
      font-size: 14px;
      color: #999;
    }

    .task-type {
      font-size: 12px;
      color: #666;
      background: #f0f2f5;
      padding: 2px 8px;
      border-radius: 4px;
      margin-left: 8px;
    }
  }

  .task-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 13px;
    color: #999;

    .create-time {
      font-size: 12px;
    }

    .status-badge {
      font-size: 12px;
      padding: 2px 8px;
      border-radius: 4px;

      &.processing {
        background: #fff7e6;
        color: #fa8c16;
      }

      &.completed {
        background: #f6ffed;
        color: #52c41a;
      }

      &.failed {
        background: #fff2f0;
        color: #ff4d4f;
      }
    }
  }

  .task-actions {
    margin-left: 16px;
  }
}

.task-children {
  padding: 0 20px 16px;
  background: #fafafa;
  border-top: 1px solid #f0f0f0;
}

.child-task {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  margin-top: 8px;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #f5f7fa;
  }

  &:first-child {
    margin-top: 12px;
  }

  .child-icon {
    font-size: 12px;
    color: #999;
  }

  .child-title {
    flex: 1;
    font-size: 14px;
    color: #666;
  }

  .status-badge {
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 4px;

    &.processing {
      background: #fff7e6;
      color: #fa8c16;
    }

    &.completed {
      background: #f6ffed;
      color: #52c41a;
    }

    &.failed {
      background: #fff2f0;
      color: #ff4d4f;
    }
  }
}

.pagination {
  margin-top: 20px;
  text-align: right;
}

.task-detail {
  .detail-row {
    display: flex;
    margin-bottom: 12px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .detail-label {
    width: 120px;
    font-weight: 500;
    color: #666;
    flex-shrink: 0;
  }

  .detail-value {
    flex: 1;
    color: #333;
    word-break: break-all;
  }

  .detail-pre {
    flex: 1;
    max-height: 200px;
    overflow-y: auto;
    padding: 12px;
    background: #f5f7fa;
    border-radius: 4px;
    font-size: 12px;
    color: #333;
    margin: 0;
    white-space: pre-wrap;
    word-break: break-all;
  }
}
</style>