<template>
  <div class="project-menu">
    <div class="menu-header">
      <h3>项目空间</h3>
    </div>
    <div class="menu-items">
      <div 
        v-for="item in menu" 
        :key="item.key"
        class="menu-item" 
        :class="{ active: currentMenu === item.key }"
        @click="setCurrentMenu(item.key)"
      >
        <el-icon class="menu-icon">
          <component :is="item.icon" />
        </el-icon>
        <span>{{ item.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useProjectStore } from '../../store/project.store'

const router = useRouter()
const route = useRoute()
const projectStore = useProjectStore()
const menu = computed(() => projectStore.menu)
const currentMenu = computed(() => projectStore.currentMenu || 'overview')

const setCurrentMenu = (menu: string) => {
  projectStore.currentMenu = menu
  router.push({
    path: `/projectSpace/${menu}`,
    query: route.query
  })
}
</script>

<style scoped lang="less">
.project-menu {
  width: 200px;
  height: 100%;
  background-color: #f5f7fa;
  border-right: 1px solid #e4e7ed;
  
  .menu-header {
    padding: 20px;
    border-bottom: 1px solid #e4e7ed;
    
    h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #303133;
    }
  }
  
  .menu-items {
    padding: 20px 0;
    
    .menu-item {
      display: flex;
      align-items: center;
      padding: 12px 20px;
      cursor: pointer;
      transition: all 0.3s;
      
      &:hover {
        background-color: #ecf5ff;
        color: #409eff;
      }
      
      &.active {
        background-color: #ecf5ff;
        color: #409eff;
        
        .menu-icon {
          color: #409eff;
        }
      }
      
      .menu-icon {
        margin-right: 10px;
        font-size: 18px;
        color: #606266;
      }
      
      span {
        font-size: 14px;
      }
    }
  }
}
</style>
