<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { login } from '../../api/auth';
import { useUserStore } from '@/store/user.store';

const router = useRouter();
const userStore = useUserStore();
const username = ref('');
const password = ref('');
const rememberMe = ref(false);
const loading = ref(false);
const error = ref('');

const handleLogin = async () => {
  try {
    loading.value = true;
    error.value = '';
    
    const response = await login({ username: username.value, password: password.value });
    
    // 存储 token 到缓存
    localStorage.setItem('token', response.access_token);
    userStore.setUserId(String(response.user.id));
    
    // 登录成功后跳转到首页
    router.push('/');
  } catch (err) {
    console.error('登录失败:', err);
    error.value = '登录失败，请检查用户名和密码';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="login-container">
    <!-- 背景装饰球 -->
    <div class="bg-blob bg-blob-1"></div>
    <div class="bg-blob bg-blob-2"></div>

    <div class="login-card">
      <div class="login-header">
        <h2>系统登录</h2>
        <p>欢迎回来，请输入您的凭证</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="input-group">
          <div class="input-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </div>
          <input 
            type="text" 
            v-model="username" 
            placeholder="用户名" 
            required
            class="tech-input"
          />
          <div class="input-line"></div>
        </div>

        <div class="input-group">
          <div class="input-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </div>
          <input 
            type="password" 
            v-model="password" 
            placeholder="密码" 
            required
            class="tech-input"
          />
          <div class="input-line"></div>
        </div>

        <div class="form-actions">
          <label class="checkbox-container">
            <input type="checkbox" v-model="rememberMe" />
            <span class="checkmark"></span>
            记住我
          </label>
          <a href="#" class="forgot-link">忘记密码？</a>
        </div>

        <div v-if="error" class="error-message">{{ error }}</div>

        <button type="submit" class="tech-button" :disabled="loading">
          <span v-if="!loading">登 录</span>
          <span v-else>登录中...</span>
          <div class="button-shine"></div>
        </button>
      </form>
    </div>
  </div>
</template>

<style lang="less" scoped>
/* 核心变量定义 */
@primary-color: #00f2ff;
@secondary-color: #7000ff;
@bg-color: #0b0c15;
@card-bg: rgba(255, 255, 255, 0.05);

.login-container {
  min-height: 100vh;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: @bg-color;
  position: relative;
  overflow: hidden;
  font-family: 'Inter', sans-serif;
}

/* 动态背景光球 */
.bg-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.6;
  animation: float 10s infinite alternate;
}

.bg-blob-1 {
  width: 300px;
  height: 300px;
  background: @primary-color;
  top: -50px;
  left: -50px;
}

.bg-blob-2 {
  width: 350px;
  height: 350px;
  background: @secondary-color;
  bottom: -80px;
  right: -80px;
  animation-delay: -5s;
}

@keyframes float {
  0% { transform: translate(0, 0); }
  100% { transform: translate(30px, 50px); }
}

/* 磨砂玻璃卡片 */
.login-card {
  background: @card-bg;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 3rem;
  border-radius: 20px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  position: relative;
  z-index: 10;
}

.login-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.login-header h2 {
  color: #fff;
  font-size: 1.8rem;
  margin: 0;
  letter-spacing: 1px;
  text-transform: uppercase;
  background: linear-gradient(90deg, #fff, #aaa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.login-header p {
  color: #888;
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

/* 输入框组 */
.input-group {
  position: relative;
  margin-bottom: 1.5rem;
}

.input-icon {
  position: absolute;
  left: 15px;
  top: 50%;
  transform: translateY(-50%);
  color: #888;
  transition: color 0.3s ease;
}

.tech-input {
  width: 100%;
  padding: 15px 15px 15px 45px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #fff;
  font-size: 1rem;
  outline: none;
  transition: all 0.3s ease;
  box-sizing: border-box;

  &:focus {
    border-color: @primary-color;
    box-shadow: 0 0 15px rgba(0, 242, 255, 0.2);

    + .input-icon {
      color: @primary-color;
    }

    ~ .input-line {
      width: 100%;
    }
  }
}

/* 底部发光线条动画 */
.input-line {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 2px;
  background: @primary-color;
  transition: width 0.4s ease;
  border-radius: 0 0 8px 8px;
}

/* 表单操作区 */
.form-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  font-size: 0.85rem;
}

.checkbox-container {
  display: flex;
  align-items: center;
  color: #aaa;
  cursor: pointer;

  input {
    display: none;

    &:checked {
      ~ .checkmark {
        background: @primary-color;
        border-color: @primary-color;

        &::after {
          content: '';
          position: absolute;
          left: 5px;
          top: 1px;
          width: 4px;
          height: 8px;
          border: solid #000;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }
      }
    }
  }
}

.checkmark {
  width: 16px;
  height: 16px;
  border: 1px solid #555;
  border-radius: 4px;
  margin-right: 8px;
  position: relative;
  transition: all 0.2s;
}

.forgot-link {
  color: @primary-color;
  text-decoration: none;
  transition: opacity 0.3s;

  &:hover {
    opacity: 0.8;
  }
}

.error-message {
  color: #ff4757;
  font-size: 0.85rem;
  margin-bottom: 1rem;
  text-align: center;
}

/* 科技感按钮 */
.tech-button {
  width: 100%;
  padding: 15px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, @secondary-color, @primary-color);
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
  letter-spacing: 1px;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(0, 242, 255, 0.3);

    .button-shine {
      left: 100%;
    }
  }

  &:active {
    transform: translateY(0);
  }
}

/* 按钮扫光效果 */
.button-shine {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: 0.5s;
}
</style>