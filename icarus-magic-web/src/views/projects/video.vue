<script setup lang="ts">
</script>

<template>
  <div class="video-page">
    <div class="page-header">
      <h1>视频</h1>
    </div>
    <div class="content">
      <div class="placeholder">
        <div class="icon">🎬</div>
        <p>视频页面开发中...</p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.video-page {
  padding: 24px;
}

.page-header {
  margin-bottom: 24px;
  
  h1 {
    font-size: 20px;
    font-weight: 600;
    color: #303133;
    margin: 0;
  }
}

.content {
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 20px;
  background: #fafafa;
  border-radius: 12px;
  
  .icon {
    font-size: 48px;
    margin-bottom: 16px;
  }
  
  p {
    color: #909399;
    margin: 0;
  }
}
</style>