<script setup lang="ts">
// 任务页面
</script>

<template>
  <div class="tasks-page">
    <div class="page-header">
      <h1 class="page-title">任务管理</h1>
      <button class="btn-primary">创建任务</button>
    </div>
    
    <div class="tasks-list">
      <div class="task-card">
        <div class="task-card-header">
          <h3 class="task-name">任务 1</h3>
          <span class="task-status">待处理</span>
        </div>
        <div class="task-card-body">
          <p class="task-description">视频剪辑任务</p>
          <div class="task-meta">
            <span class="meta-item">项目: 项目 1</span>
            <span class="meta-item">截止日期: 2026-04-20</span>
          </div>
        </div>
        <div class="task-card-footer">
          <button class="btn-secondary">查看详情</button>
          <button class="btn-secondary">编辑</button>
        </div>
      </div>
      
      <div class="task-card">
        <div class="task-card-header">
          <h3 class="task-name">任务 2</h3>
          <span class="task-status">进行中</span>
        </div>
        <div class="task-card-body">
          <p class="task-description">特效添加任务</p>
          <div class="task-meta">
            <span class="meta-item">项目: 项目 1</span>
            <span class="meta-item">截止日期: 2026-04-18</span>
          </div>
        </div>
        <div class="task-card-footer">
          <button class="btn-secondary">查看详情</button>
          <button class="btn-secondary">编辑</button>
        </div>
      </div>
      
      <div class="task-card">
        <div class="task-card-header">
          <h3 class="task-name">任务 3</h3>
          <span class="task-status">已完成</span>
        </div>
        <div class="task-card-body">
          <p class="task-description">音频处理任务</p>
          <div class="task-meta">
            <span class="meta-item">项目: 项目 2</span>
            <span class="meta-item">截止日期: 2026-04-15</span>
          </div>
        </div>
        <div class="task-card-footer">
          <button class="btn-secondary">查看详情</button>
          <button class="btn-secondary">编辑</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
.tasks-page {
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    
    .page-title {
      font-size: 1.5rem;
      font-weight: 600;
      margin: 0;
      color: #fff;
    }
    
    .btn-primary {
      padding: 0.75rem 1.5rem;
      background: linear-gradient(135deg, #00f2ff, #7000ff);
      border: none;
      border-radius: 8px;
      color: #fff;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 15px rgba(0, 242, 255, 0.3);
      }
    }
  }
  
  .tasks-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
  }
  
  .task-card {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 1.5rem;
    transition: all 0.3s ease;
    
    &:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      border-color: rgba(0, 242, 255, 0.3);
    }
    
    .task-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      
      .task-name {
        font-size: 1.1rem;
        font-weight: 600;
        margin: 0;
        color: #fff;
      }
      
      .task-status {
        padding: 0.25rem 0.75rem;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 500;
        
        &[class*="待处理"] {
          background: rgba(255, 165, 0, 0.2);
          color: #ffa500;
        }
        
        &[class*="进行中"] {
          background: rgba(0, 242, 255, 0.2);
          color: #00f2ff;
        }
        
        &[class*="已完成"] {
          background: rgba(0, 255, 128, 0.2);
          color: #00ff80;
        }
      }
    }
    
    .task-card-body {
      margin-bottom: 1.5rem;
      
      .task-description {
        color: #aaa;
        font-size: 0.9rem;
        line-height: 1.4;
        margin-bottom: 1rem;
      }
      
      .task-meta {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        
        .meta-item {
          color: #888;
          font-size: 0.8rem;
        }
      }
    }
    
    .task-card-footer {
      display: flex;
      gap: 1rem;
      
      .btn-secondary {
        flex: 1;
        padding: 0.5rem 1rem;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        color: #fff;
        font-size: 0.85rem;
        cursor: pointer;
        transition: all 0.3s ease;
        
        &:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.3);
        }
      }
    }
  }
}
</style>