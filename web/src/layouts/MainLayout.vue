<script setup>
// 主布局：顶栏 + 内容区
</script>

<template>
  <el-container class="layout" direction="vertical">
    <el-header class="app-header" height="56px">
      <div class="app-header__inner">
        <span class="app-header__brand">Icarus magic</span>
      </div>
    </el-header>
    <el-main class="app-main">
      <router-view />
    </el-main>
  </el-container>
</template>

<style lang="less" scoped>
.layout {
  min-height: 100vh;
  background: #f5f7fa;
}

.app-header {
  padding: 0;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.app-header__inner {
  height: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  align-items: center;
}

.app-header__brand {
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #303133;
}

.app-main {
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
  padding: 24px;
}
</style>
