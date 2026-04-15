<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const userMenuOpen = ref(false);

const toggleUserMenu = () => {
  userMenuOpen.value = !userMenuOpen.value;
};

const handleLogout = () => {
  // 清除 token
  localStorage.removeItem('token');
  // 跳转到登录页
  router.push('/login');
  // 关闭用户菜单
  userMenuOpen.value = false;
};
</script>

<template>
  <header class="navigation">
    <div class="nav-container">
      <div class="nav-left">
        <button class="nav-toggle">
          <span class="toggle-icon"></span>
          <span class="toggle-icon"></span>
          <span class="toggle-icon"></span>
        </button>
      </div>
      
      <!-- <div class="nav-center">
        <div class="nav-search">
          <input type="text" placeholder="搜索项目或任务..." class="search-input" />
          <span class="search-icon">🔍</span>
        </div>
      </div> -->
      
      <div class="nav-right">
        <div class="nav-notifications">
          <button class="notification-btn">
            <span class="notification-icon">🔔</span>
            <span class="notification-badge">3</span>
          </button>
        </div>
        
        <div class="nav-user" @click="toggleUserMenu">
          <div class="user-avatar">
            <span class="avatar-text">U</span>
          </div>
          <span class="user-name">用户</span>
          <span class="user-arrow">▼</span>
          
          <div v-if="userMenuOpen" class="user-menu">
            <div class="user-menu-item">
              <span class="menu-item-icon">👤</span>
              <span>个人资料</span>
            </div>
            <div class="user-menu-item">
              <span class="menu-item-icon">⚙️</span>
              <span>设置</span>
            </div>
            <div class="user-menu-divider"></div>
            <div class="user-menu-item" @click="handleLogout">
              <span class="menu-item-icon">🚪</span>
              <span>退出登录</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<style lang="less" scoped>
.navigation {
  height: 64px;
  background: rgba(11, 12, 21, 0.95);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  position: fixed;
  top: 0;
  left: 250px;
  right: 0;
  z-index: 99;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

.nav-container {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
}

.nav-left {
  display: flex;
  align-items: center;
}

.nav-toggle {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  margin-right: 1rem;
}

.toggle-icon {
  display: block;
  width: 20px;
  height: 2px;
  background: #aaa;
  margin: 4px 0;
  transition: all 0.3s ease;
  
  &:hover {
    background: #fff;
  }
}

.nav-center {
  flex: 1;
  max-width: 600px;
  margin: 0 2rem;
}

.nav-search {
  position: relative;
  width: 100%;
}

.search-input {
  width: 100%;
  padding: 0.75rem 2.5rem 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: #fff;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: #00f2ff;
    box-shadow: 0 0 10px rgba(0, 242, 255, 0.2);
  }
  
  &::placeholder {
    color: #aaa;
  }
}

.search-icon {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #aaa;
  font-size: 1rem;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.nav-notifications {
  position: relative;
}

.notification-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  position: relative;
  color: #aaa;
  transition: color 0.3s ease;
  
  &:hover {
    color: #fff;
  }
}

.notification-icon {
  font-size: 1.2rem;
}

.notification-badge {
  position: absolute;
  top: 0;
  right: 0;
  background: #ff4757;
  color: #fff;
  font-size: 0.7rem;
  padding: 0.1rem 0.4rem;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}

.nav-user {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: background 0.3s ease;
  position: relative;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #00f2ff, #7000ff);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 600;
  font-size: 0.9rem;
}

.user-name {
  color: #fff;
  font-size: 0.9rem;
  font-weight: 500;
}

.user-arrow {
  color: #aaa;
  font-size: 0.8rem;
  transition: transform 0.3s ease;
  
  .nav-user:hover & {
    color: #fff;
  }
}

.user-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.5rem;
  background: rgba(11, 12, 21, 0.95);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  min-width: 180px;
  z-index: 1000;
  overflow: hidden;
}

.user-menu-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  color: #aaa;
  transition: all 0.3s ease;
  cursor: pointer;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }
}

.menu-item-icon {
  font-size: 1.1rem;
  width: 20px;
  text-align: center;
}

.user-menu-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0.5rem 0;
}
</style>