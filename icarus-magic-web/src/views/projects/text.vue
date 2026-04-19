<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useProjectStore } from '../../store/project.store'
import { polishText as polishTextAPI } from '../../api/coze'
import { saveText as saveTextAPI, getProjectInfo } from '../../api/project'
import { ElMessageBox, ElMessage } from 'element-plus'

const projectStore = useProjectStore()
const projectData = computed(() => projectStore.projectData)

// 编辑状态
const isEditing = ref(false)
// 编辑文本
const editText = ref('')
// 润色配置
const polishConfig = ref({
  styleType: '新闻风格',
  polishIntensity: 1 // 默认为中度
})

// 润色加载状态
const isPolishing = ref(false)

// 强度选项
const intensityOptions = ['轻度', '中度', '重度']

// 监听项目数据变化
watch(() => projectData.value, (newData) => {
  if (newData.text) {
    editText.value = newData.text
    // 文案不为空时，不进入编辑模式
    isEditing.value = false
  } else {
    // 文案为空时，进入编辑模式
    isEditing.value = true
  }
}, { immediate: true })

// 保存文本
const saveText = async () => {
  try {
    // 显示确认对话框
    await ElMessageBox.confirm('确定要保存文案吗？', '保存确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    
    // 处理多个换行符，将连续的换行符替换为两个换行符
    const processedText = editText.value.replace(/\n+/g, '\n\n')
    
    // 调用保存接口
    const projectId = projectStore.projectId
    if (!projectId) {
      ElMessage.error('项目ID不存在')
      return
    }
    
    await saveTextAPI({
      projectId: Number(projectId),
      text: processedText
    })
    
    // 重新获取项目详情
    const projectDetail = await getProjectInfo(Number(projectId))
    projectStore.projectData = projectDetail
    
    ElMessage.success('保存成功')
    isEditing.value = false
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('保存失败:', error)
      ElMessage.error('保存失败，请重试')
    }
  }
}

// 取消编辑
const cancelEdit = () => {
  editText.value = projectData.value.text || ''
  isEditing.value = false
}

// 显示/隐藏润色配置
const showPolishConfig = ref(false)

// 切换润色配置显示状态
const togglePolishConfig = () => {
  showPolishConfig.value = !showPolishConfig.value
}

// 润色文本
const polishText = async () => {
  if (!editText.value.trim()) {
    console.log('请输入文案内容')
    return
  }
  
  isPolishing.value = true
  try {
    console.log('开始润色:', polishConfig.value)
    const polishedText = await polishTextAPI({
      originalText: editText.value,
      styleType: polishConfig.value.styleType,
      polishIntensity: polishConfig.value.polishIntensity
    })
    editText.value = polishedText
    console.log('润色完成')
  } catch (error) {
    console.error('润色失败:', error)
  } finally {
    isPolishing.value = false
  }
}
</script>

<template>
  <div class="project-text">
    <div class="page-header">
      <h2>项目文案</h2>
      <button v-if="!isEditing && projectData.text" class="btn-primary" @click="isEditing = true">
        编辑文案
      </button>
    </div>
    
    <div class="text-content">
      <!-- 显示模式 -->
      <div v-if="!isEditing && projectData.text" class="text-display">
        <div class="text-body">
          {{ projectData.text }}
        </div>
      </div>
      
      <!-- 编辑模式 -->
      <div v-else class="text-edit">
        <div class="edit-container">
          <!-- 左侧：文案内容和操作按钮 -->
          <div class="left-content">
            <div class="edit-section">
              <label class="edit-label">文案内容</label>
              <textarea 
                v-model="editText" 
                class="text-area" 
                placeholder="请输入文案内容"
                rows="10"
              ></textarea>
            </div>
            

          </div>
          
          <!-- 右侧：润色配置 -->
          <div v-if="showPolishConfig" class="right-content">
            <div class="polish-config">
              <div class="polish-config-header">
                <h3>文案润色配置</h3>
                <button class="btn-close" @click="showPolishConfig = false">
                  ×
                </button>
              </div>
              
              <!-- 风格选择 -->
              <div class="config-item">
                <label class="config-label">风格类型</label>
                <select v-model="polishConfig.styleType" class="select-input">
                  <option value="新闻风格">新闻风格</option>
                  <option value="陈述风格">陈述风格</option>
                  <option value="小红书种草风">小红书种草风</option>
                  <option value="知乎干货风">知乎干货风</option>
                  <option value="公众号深度文风">公众号深度文风</option>
                  <option value="商务专业风">商务专业风</option>
                  <option value="轻松幽默风">轻松幽默风</option>
                </select>
              </div>
              
              <!-- 润色强度 -->
              <div class="config-item">
                <label class="config-label">润色强度</label>
                <div class="intensity-selector">
                  <div class="intensity-bar-container">
                    <div 
                      class="intensity-fill"
                      :style="{
                        width: `${(polishConfig.polishIntensity + 1) * 33.33}%`,
                        background: polishConfig.polishIntensity === 0 ? '#409eff' : 
                                  polishConfig.polishIntensity === 1 ? '#e6a23c' : '#f56c6c'
                      }"
                    ></div>
                  </div>
                  <div class="intensity-labels">
                    <span 
                      v-for="(intensity, index) in intensityOptions" 
                      :key="index"
                      class="intensity-label"
                      :class="{ active: polishConfig.polishIntensity === index }"
                      @click="polishConfig.polishIntensity = index"
                    >
                      {{ intensity }}
                    </span>
                  </div>
                </div>
              </div>
              
              <!-- 润色按钮 -->
              <button class="btn-polish-go" :disabled="isPolishing" @click="polishText">
                <span v-if="isPolishing" class="loading-spinner"></span>
                <span v-else class="btn-polish-go-icon">✨</span>
                {{ isPolishing ? '润色中...' : 'GO' }}
              </button>
            </div>
          </div>
        </div>
        
        <!-- 操作按钮 -->
        <div class="action-buttons">
          <button class="btn-polish" @click="togglePolishConfig">
            <span class="btn-polish-icon">✨</span>
            文案润色
          </button>
          <div class="action-buttons-right">
            <button class="btn-secondary" @click="cancelEdit">
              取消
            </button>
            <button class="btn-primary" @click="saveText">
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.project-text {
    .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    
    h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #303133;
    }
  }
  
  .text-content {
    background-color: #ffffff;
  }
  
  .text-display {
    .text-body {
      font-size: 14px;
      line-height: 1.5;
      color: #606266;
      white-space: pre-wrap;
    }
  }
  
  .text-edit {
    .edit-container {
      display: flex;
      gap: 20px;
      margin-bottom: 20px;
      
      .left-content {
        flex: 1;
        min-width: 0;
        
        .edit-section {
          margin-bottom: 20px;
          
          .edit-label {
            display: block;
            margin-bottom: 8px;
            font-size: 14px;
            font-weight: 500;
            color: #303133;
          }
          
          .text-area {
            width: 100%;
            padding: 10px;
            border: 1px solid #dcdfe6;
            border-radius: 4px;
            font-size: 14px;
            line-height: 1.5;
            resize: vertical;
            box-sizing: border-box;
            
            &:focus {
              outline: none;
              border-color: #409eff;
              box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
            }
          }
        }
      }
      
      .right-content {
        width: 300px;
        min-width: 300px;
        
        .polish-config {
          padding: 15px;
          background-color: #f9fafc;
          border-radius: 4px;
          
          .polish-config-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            
            h3 {
              margin: 0;
              font-size: 14px;
              font-weight: 600;
              color: #303133;
            }
            
            .btn-close {
              width: 24px;
              height: 24px;
              display: flex;
              align-items: center;
              justify-content: center;
              background: none;
              border: none;
              font-size: 18px;
              color: #909399;
              cursor: pointer;
              border-radius: 4px;
              transition: all 0.3s;
              
              &:hover {
                background-color: #ecf5ff;
                color: #409eff;
              }
            }
          }
          
          .config-item {
            margin-bottom: 15px;
            
            .config-label {
              display: block;
              margin-bottom: 8px;
              font-size: 14px;
              font-weight: 500;
              color: #303133;
            }
            
            .select-input {
              width: 100%;
              padding: 8px;
              border: 1px solid #dcdfe6;
              border-radius: 4px;
              font-size: 14px;
              
              &:focus {
                outline: none;
                border-color: #409eff;
                box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
              }
            }
            
            .intensity-selector {
              width: 100%;
              
              .intensity-bar-container {
                height: 8px;
                background-color: #f0f2f5;
                border-radius: 4px;
                overflow: hidden;
                margin-bottom: 10px;
                
                .intensity-fill {
                  height: 100%;
                  transition: all 0.3s ease;
                  border-radius: 4px;
                }
              }
              
              .intensity-labels {
                display: flex;
                justify-content: space-between;
                
                .intensity-label {
                  font-size: 11px;
                  color: #606266;
                  cursor: pointer;
                  padding: 2px 4px;
                  border-radius: 2px;
                  transition: all 0.3s;
                  
                  &:hover {
                    color: #409eff;
                  }
                  
                  &.active {
                    color: #409eff;
                    font-weight: 500;
                  }
                }
              }
            }
          }
        }
        
        .btn-polish-go {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 16px;
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          border: none;
          border-radius: 20px;
          color: #ffffff;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 3px 10px rgba(240, 147, 251, 0.4);
          
          &:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(240, 147, 251, 0.5);
          }
          
          &:active:not(:disabled) {
            transform: translateY(0);
            box-shadow: 0 3px 10px rgba(240, 147, 251, 0.4);
          }
          
          &:disabled {
            opacity: 0.7;
            cursor: not-allowed;
          }
          
          .btn-polish-go-icon {
            font-size: 14px;
          }
          
          .loading-spinner {
            width: 14px;
            height: 14px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-top-color: #ffffff;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
        }
      }
    }
  }
  
  .action-buttons {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .action-buttons-right {
      display: flex;
      gap: 10px;
    }
    
    .btn-polish {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      border-radius: 25px;
      color: #ffffff;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
      }
      
      &:active {
        transform: translateY(0);
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      }
      
      .btn-polish-icon {
        font-size: 16px;
      }
    }
  }
  
  .btn-primary {
    padding: 8px 16px;
    background-color: #409eff;
    border: 1px solid #409eff;
    border-radius: 4px;
    color: #ffffff;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.3s;
    
    &:hover {
      background-color: #66b1ff;
      border-color: #66b1ff;
    }
  }
  
  .btn-secondary {
    padding: 8px 16px;
    background-color: #ffffff;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    color: #606266;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.3s;
    
    &:hover {
      border-color: #409eff;
      color: #409eff;
    }
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>