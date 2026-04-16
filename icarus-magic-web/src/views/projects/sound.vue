<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useProjectStore } from '@/store/project.store'
import { getVoiceList, type VoiceItem } from '@/api/voice'
import { ElForm, ElSelect, ElOption, ElMessage, ElCard } from 'element-plus'

const projectStore = useProjectStore()
const projectText = computed(() => projectStore.projectData.text || '')

// 分割文案为段落
const paragraphs = computed(() => {
  if (!projectText.value) return []
  
  // 将多个换行符替换为双换行符
  const normalizedText = projectText.value.replace(/\n+/g, '\n\n')
  
  // 按双换行符分割
  return normalizedText.split('\n\n').filter(paragraph => paragraph.trim())
})

const voiceList = ref<VoiceItem[]>([])
const selectedVoice = ref<number | null>(null)
const loading = ref(false)

onMounted(async () => {
  await fetchVoiceList()
})

const fetchVoiceList = async () => {
  loading.value = true
  try {
    voiceList.value = await getVoiceList()
  } catch (error) {
    console.error('获取音声列表失败:', error)
    ElMessage.error('获取音声列表失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="project-sound">
    <h2>声音设置</h2>
    
    <div class="content-grid">
      <!-- 声音选择卡片 -->
      <el-card class="sound-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <h3>选择音声</h3>
          </div>
        </template>
        <el-form label-position="top">
          <el-form-item label="音声类型">
            <el-select
              v-model="selectedVoice"
              placeholder="请选择音声"
              style="width: 100%"
              :loading="loading"
              class="voice-select"
            >
              <el-option
                v-for="voice in voiceList"
                :key="voice.id"
                :label="voice.name"
                :value="voice.id"
              >
                <div class="voice-option">
                  <span class="voice-name">{{ voice.name }}</span>
                  <span v-if="voice.isDefault" class="default-tag">默认</span>
                </div>
              </el-option>
            </el-select>
          </el-form-item>
        </el-form>
      </el-card>
      
      <!-- 文案段落卡片 -->
      <el-card class="text-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <h3>文案段落</h3>
            <span class="paragraph-count">{{ paragraphs.length }} 段</span>
          </div>
        </template>
        
        <div v-if="paragraphs.length === 0" class="empty-text">
          <div class="empty-icon">📝</div>
          <p>暂无文案内容</p>
          <p class="empty-hint">请先在文案页面添加内容</p>
        </div>
        
        <div v-else class="paragraph-list">
          <div
            v-for="(paragraph, index) in paragraphs"
            :key="index"
            class="paragraph-item"
          >
            <div class="paragraph-header">
              <div class="paragraph-number">{{ index + 1 }}</div>
              <div class="paragraph-actions">
                <button class="action-btn">
                  <span class="action-icon">🔊</span>
                </button>
              </div>
            </div>
            <div class="paragraph-content">{{ paragraph }}</div>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<style scoped lang="less">
.project-sound {
  h2 {
    margin-top: 0;
    margin-bottom: 32px;
    font-size: 24px;
    font-weight: 700;
    color: #1a1a1a;
    text-align: center;
  }

  .content-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
    
    @media (min-width: 768px) {
      grid-template-columns: 300px 1fr;
    }
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #303133;
    }
    
    .paragraph-count {
      font-size: 14px;
      color: #909399;
      background-color: #f0f2f5;
      padding: 2px 8px;
      border-radius: 10px;
    }
  }

  .sound-card,
  .text-card {
    border-radius: 12px;
    overflow: hidden;
  }

  .voice-select {
    .el-select__caret {
      color: #409eff;
    }
  }

  .voice-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    
    .voice-name {
      font-weight: 500;
    }
    
    .default-tag {
      font-size: 12px;
      color: #409eff;
      background-color: #ecf5ff;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 500;
    }
  }

  .text-card {
    .empty-text {
      text-align: center;
      padding: 60px 20px;
      color: #909399;
      
      .empty-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }
      
      p {
        margin: 8px 0;
      }
      
      .empty-hint {
        font-size: 14px;
        color: #c0c4cc;
      }
    }
    
    .paragraph-list {
      display: flex;
      flex-direction: column;
      gap: 20px;
      
      .paragraph-item {
        background-color: #f9f9f9;
        border-radius: 8px;
        padding: 16px;
        transition: all 0.3s ease;
        
        &:hover {
          background-color: #f0f5ff;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
        }
        
        .paragraph-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          
          .paragraph-number {
            width: 28px;
            height: 28px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: 600;
          }
          
          .paragraph-actions {
            .action-btn {
              background: none;
              border: none;
              cursor: pointer;
              padding: 6px;
              border-radius: 4px;
              transition: all 0.3s ease;
              
              &:hover {
                background-color: rgba(64, 158, 255, 0.1);
              }
              
              .action-icon {
                font-size: 16px;
              }
            }
          }
        }
        
        .paragraph-content {
          line-height: 1.7;
          color: #303133;
          white-space: pre-wrap;
          font-size: 14px;
        }
      }
    }
  }
}
</style>