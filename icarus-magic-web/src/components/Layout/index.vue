<script setup lang="ts">
// Layout 主组件，包含侧边菜单和顶部导航栏
import Menu from './menu.vue';
import Navigation from './navigation.vue';
</script>

<template>
  <div class="layout">
    <!-- 侧边菜单 -->
    <Menu />
    
    <!-- 顶部导航栏 -->
    <Navigation />
    
    <!-- 主内容区域 -->
    <main class="main-content">
      <router-view></router-view>
    </main>
  </div>
</template>

<style lang="less" scoped>
.layout {
  display: flex;
  min-height: 100vh;
  background: #0b0c15;
  color: #fff;
}

.main-content {
  margin-left: 250px;
  margin-top: 64px;
  flex: 1;
  padding: 2rem;
  min-height: calc(100vh - 64px);
  overflow-y: auto;
  background: linear-gradient(135deg, #0b0c15 0%, #1a1b2e 100%);
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    
    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }
}
</style>