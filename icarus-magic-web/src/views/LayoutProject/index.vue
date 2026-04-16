<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import Menu from './menu.vue'
import Navigation from './navigation.vue'
import { useProjectStore } from '../../store/project.store'
import { ElMessage } from 'element-plus'

const route = useRoute()
const projectStore = useProjectStore()

// 组件挂载时获取项目信息
onMounted(async () => {
  const projectId = route.query.id as string
  if (projectId) {
    try {
      await projectStore.fetchProjectDetail(Number(projectId))
      projectStore.currentMenu = 'overview'
    } catch (error) {
      console.error('获取项目信息失败:', error)
      ElMessage.error('获取项目信息失败')
    }
  }
})
</script>

<template>
  <div class="project-layout">
    <!-- 侧边菜单 -->
    <Menu />
    <!-- 主内容区 -->
    <div class="project-content">
      <!-- 导航栏 -->
      <Navigation />
      <!-- 内容区域 -->
      <div class="project-main">
        <div class="content-container">
          <!-- 路由视图 -->
          <router-view></router-view>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.project-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
  
  .project-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    
    .project-main {
      flex: 1;
      padding: 20px;
      background-color: #f0f2f5;
      overflow-y: auto;
      
      .content-container {
        background-color: #ffffff;
        border-radius: 4px;
        padding: 20px;
        box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
        
        .menu-content {
          h2 {
            margin-top: 0;
            margin-bottom: 20px;
            font-size: 18px;
            font-weight: 600;
            color: #303133;
          }
          
          p {
            font-size: 14px;
            color: #606266;
            line-height: 1.5;
          }
        }
      }
    }
  }
}
</style>
