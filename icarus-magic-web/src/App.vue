<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getUser } from './api/auth'
import { useUserStore } from './store/user.store'

const router = useRouter()
const userStore = useUserStore()

onMounted(async () => {
  try {
    // 调用获取用户信息接口
    const userInfo = await getUser()
    if (userInfo && userInfo.user) {
      // 存储 userId 到状态管理
      userStore.setUserId(userInfo.user.userId.toString())
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
    // 清空 token 并跳转到登录页面
    localStorage.removeItem('token')
    userStore.clearUserId()
    router.push('/login')
  }
})
</script>

<template>
  <RouterView />
</template>
