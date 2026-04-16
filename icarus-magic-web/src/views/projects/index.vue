<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCreateDialog } from '@/hook/dialog.hooks'
import { listProjects, type ProjectItem } from '@/api/project'
import { useUserStore } from '@/store/user.store'
import { ElMessage } from 'element-plus'

const { createProjectDialog } = useCreateDialog()
const userStore = useUserStore()

const projects = ref<ProjectItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const loading = ref(false)

// 获取项目列表
const fetchProjects = async () => {
  loading.value = true
  try {
    const response = await listProjects({
      page: page.value,
      page_size: pageSize.value,
      userId: userStore.userId
    })
    projects.value = response.list
    total.value = response.total
  } catch (error) {
    console.error('获取项目列表失败:', error)
    ElMessage.error('获取项目列表失败')
  } finally {
    loading.value = false
  }
}

// 处理创建项目成功后的刷新
const handleProjectCreated = () => {
  fetchProjects()
}

const handleOpenDialog = () => {
  createProjectDialog({
    onSuccess: handleProjectCreated
  })
}

// 打开项目空间
const openProjectSpace = (projectId: string) => {
  const url = `${window.location.origin}${window.location.pathname}#/projectSpace/overview?id=${projectId}`
  window.open(url, '_blank')
}

// 组件挂载时获取项目列表
onMounted(() => {
  fetchProjects()
})
</script>

<template>
  <div class="projects-page">
    <div class="page-header">
      <h1 class="page-title">项目管理</h1>
      <button class="btn-primary" @click="handleOpenDialog">创建项目</button>
    </div>
    
    <div class="projects-list" v-if="!loading">
      <div v-if="projects.length === 0" class="empty-state">
        <p>暂无项目</p>
        <button class="btn-primary" @click="handleOpenDialog">创建第一个项目</button>
      </div>
      <div v-else class="project-card" v-for="project in projects" :key="project.id">
        <div class="project-card-header">
          <h3 class="project-name">{{ project.name }}</h3>
          <span class="project-status" :class="project.status">{{ project.status === 'pending' ? '进行中' : project.status }}</span>
        </div>
        <div class="project-card-body">
          <p class="project-description">{{ project.description }}</p>
          <div class="project-meta">
            <span class="meta-item">创建时间: {{ project.createdAt }}</span>
          </div>
        </div>
        <div class="project-card-footer">
          <button class="btn-secondary" @click="openProjectSpace(project.id.toString())">查看详情</button>
          <button class="btn-secondary">编辑</button>
        </div>
      </div>
    </div>
    
    <div v-else class="loading-state">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>
  </div>
</template>

<style lang="less" scoped>
.projects-page {
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    
    .page-title {
      font-size: 1.5rem;
      font-weight: 600;
      margin: 0;
      color: #fff;
    }
    
    .btn-primary {
      padding: 0.75rem 1.5rem;
      background: linear-gradient(135deg, #00f2ff, #7000ff);
      border: none;
      border-radius: 8px;
      color: #fff;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 15px rgba(0, 242, 255, 0.3);
      }
    }
  }
  
  .projects-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
  }
  
  .empty-state {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    text-align: center;
    
    p {
      font-size: 1.1rem;
      color: #aaa;
      margin-bottom: 1.5rem;
    }
  }
  
  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    
    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255, 255, 255, 0.1);
      border-top: 3px solid #00f2ff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 1rem;
    }
    
    p {
      color: #aaa;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  }
  
  .project-card {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 1.5rem;
    transition: all 0.3s ease;
    
    &:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      border-color: rgba(0, 242, 255, 0.3);
    }
    
    .project-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      
      .project-name {
        font-size: 1.1rem;
        font-weight: 600;
        margin: 0;
        color: #fff;
      }
      
      .project-status {
        padding: 0.25rem 0.75rem;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 500;
        
        &.pending {
          background: rgba(0, 242, 255, 0.2);
          color: #00f2ff;
        }
        
        &.completed {
          background: rgba(0, 255, 128, 0.2);
          color: #00ff80;
        }
      }
    }
    
    .project-card-body {
      margin-bottom: 1.5rem;
      
      .project-description {
        color: #aaa;
        font-size: 0.9rem;
        line-height: 1.4;
        margin-bottom: 1rem;
      }
      
      .project-meta {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        
        .meta-item {
          color: #888;
          font-size: 0.8rem;
        }
      }
    }
    
    .project-card-footer {
      display: flex;
      gap: 1rem;
      
      .btn-secondary {
        flex: 1;
        padding: 0.5rem 1rem;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        color: #fff;
        font-size: 0.85rem;
        cursor: pointer;
        transition: all 0.3s ease;
        
        &:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.3);
        }
      }
    }
  }
}
</style>