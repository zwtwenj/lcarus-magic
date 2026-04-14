<template>
  <div class="home-container">
    <h1>欢迎来到系统</h1>
    <div class="button-group">
      <el-button type="primary" @click="handleOpenDialog">打开测试 Dialog</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { openDialog } from '../../utils/dialog'
import TestDialog from '../../dialog/test.vue'

const handleOpenDialog = () => {
  openDialog(TestDialog, {
    props: {
      title: '我的自定义 Dialog',
      message: '这是通过公共方法传递的消息'
    },
    on: {
      confirm: (data) => {
        console.log('确认数据:', data)
        ElMessage.success(`确认成功！用户名：${data.username}，邮箱：${data.email}`)
      },
      cancel: () => {
        console.log('用户取消了')
        ElMessage.info('已取消')
      }
    }
  })
}
</script>

<style scoped lang="less">
.home-container {
  padding: 40px;
  text-align: center;
  
  .button-group {
    margin-top: 40px;
  }
}
</style>