<script setup lang="ts">
import { useCreateDialog } from '@/hook/dialog.hooks'

const { createProjectDialog } = useCreateDialog()

const handleOpenDialog = () => {
  createProjectDialog()
}
</script>

<template>
  <div class="projects-page">
    <div class="page-header">
      <h1 class="page-title">项目管理</h1>
      <button class="btn-primary" @click="handleOpenDialog">创建项目</button>
    </div>
    
    <div class="projects-list">
      <div class="project-card">
        <div class="project-card-header">
          <h3 class="project-name">项目 1</h3>
          <span class="project-status">进行中</span>
        </div>
        <div class="project-card-body">
          <p class="project-description">这是一个视频合成项目</p>
          <div class="project-meta">
            <span class="meta-item">创建时间: 2026-04-13</span>
            <span class="meta-item">任务数: 5</span>
          </div>
        </div>
        <div class="project-card-footer">
          <button class="btn-secondary">查看详情</button>
          <button class="btn-secondary">编辑</button>
        </div>
      </div>
      
      <div class="project-card">
        <div class="project-card-header">
          <h3 class="project-name">项目 2</h3>
          <span class="project-status">已完成</span>
        </div>
        <div class="project-card-body">
          <p class="project-description">这是另一个视频合成项目</p>
          <div class="project-meta">
            <span class="meta-item">创建时间: 2026-04-12</span>
            <span class="meta-item">任务数: 3</span>
          </div>
        </div>
        <div class="project-card-footer">
          <button class="btn-secondary">查看详情</button>
          <button class="btn-secondary">编辑</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
.projects-page {
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
  
  .projects-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
  }
  
  .project-card {
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
    
    .project-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      
      .project-name {
        font-size: 1.1rem;
        font-weight: 600;
        margin: 0;
        color: #fff;
      }
      
      .project-status {
        padding: 0.25rem 0.75rem;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 500;
        
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
    
    .project-card-body {
      margin-bottom: 1.5rem;
      
      .project-description {
        color: #aaa;
        font-size: 0.9rem;
        line-height: 1.4;
        margin-bottom: 1rem;
      }
      
      .project-meta {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        
        .meta-item {
          color: #888;
          font-size: 0.8rem;
        }
      }
    }
    
    .project-card-footer {
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