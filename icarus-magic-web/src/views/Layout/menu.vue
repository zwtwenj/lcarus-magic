<script setup lang="ts">
import { watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useMenuStore } from '../../store/menu.store';

const router = useRouter();
const route = useRoute();
const menuStore = useMenuStore();

// 监听路由变化，更新激活的菜单
watch(
  () => route.path,
  (newPath: string) => {
    // 找到与当前路径匹配的菜单
    const matchedMenu = menuStore.menuItems.find(menu => menu.path === newPath);
    if (matchedMenu) {
      menuStore.setActiveMenu(matchedMenu.id);
    }
  },
  { immediate: true }
);

const handleMenuClick = (menu: { id: string; path: string }) => {
  menuStore.setActiveMenu(menu.id);
  router.push(menu.path);
};
</script>

<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <h2 class="sidebar-title">视频合成平台</h2>
    </div>
    
    <nav class="sidebar-nav">
      <ul class="menu-list">
        <li 
          v-for="menu in menuStore.menuItems" 
          :key="menu.id"
          class="menu-item"
          :class="{ active: menuStore.activeMenu === menu.id }"
          @click="handleMenuClick(menu)"
        >
          <span class="menu-icon">{{ menu.icon }}</span>
          <span class="menu-text">{{ menu.name }}</span>
          <div v-if="menuStore.activeMenu === menu.id" class="menu-active-indicator"></div>
        </li>
      </ul>
    </nav>
  </div>
</template>

<style lang="less" scoped>
.sidebar {
  width: 250px;
  height: 100vh;
  background: rgba(11, 12, 21, 0.95);
  backdrop-filter: blur(16px);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 100;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.3);
}

.sidebar-header {
  padding: 2rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar-title {
  color: #fff;
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0;
  background: linear-gradient(90deg, #00f2ff, #7000ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: 1px;
}

.sidebar-nav {
  flex: 1;
  padding: 2rem 0;
}

.menu-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 1rem 1.5rem;
  cursor: pointer;
  position: relative;
  transition: all 0.3s ease;
  color: #aaa;
  border-left: 3px solid transparent;
  
  &:hover {
    background: rgba(255, 255, 255, 0.05);
    color: #fff;
  }
  
  &.active {
    color: #00f2ff;
    background: rgba(0, 242, 255, 0.1);
    border-left-color: #00f2ff;
  }
}

.menu-icon {
  font-size: 1.2rem;
  margin-right: 1rem;
  width: 20px;
  text-align: center;
}

.menu-text {
  font-size: 0.95rem;
  font-weight: 500;
}

.menu-active-indicator {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: #00f2ff;
  box-shadow: 0 0 10px rgba(0, 242, 255, 0.5);
}
</style>