<template>
  <div class="project-navigation">
    <div class="nav-header">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item>项目管理</el-breadcrumb-item>
        <el-breadcrumb-item>{{ projectData.name || '未选择项目' }}</el-breadcrumb-item>
        <el-breadcrumb-item>{{ currentMenuText }}</el-breadcrumb-item>
      </el-breadcrumb>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useProjectStore } from '../../store/project.store'

const projectStore = useProjectStore()
const projectData = computed(() => projectStore.projectData)
const currentMenu = computed(() => projectStore.currentMenu)

const currentMenuText = computed(() => {
  switch (currentMenu.value) {
    case 'overview': return '总览'
    case 'text': return '文本'
    case 'materials': return '素材'
    case 'sound': return '声音'
    default: return ''
  }
})
</script>

<style scoped lang="less">
.project-navigation {
  height: 60px;
  background-color: #ffffff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  
  .nav-header {
    .el-breadcrumb {
      font-size: 14px;
      
      .el-breadcrumb__item:last-child .el-breadcrumb__inner {
        color: #409eff;
        font-weight: 600;
      }
    }
  }
  
  .nav-actions {
    display: flex;
    gap: 10px;
  }
}
</style>
