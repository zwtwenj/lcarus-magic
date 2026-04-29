<template>
  <div class="subtitle-dialog">
    <div class="content-wrapper">
      <div class="form-section">
        <div class="section-header">
          <div class="section-icon">📝</div>
          <div class="section-title">字幕配置</div>
        </div>
        
        <el-form class="config-form" label-width="100px">
          <el-form-item class="form-item" label="字幕名称">
            <el-input 
              v-model="formData.name" 
              placeholder="请输入字幕名称" 
              class="input-field"
            />
          </el-form-item>
          
          <el-form-item class="form-item" label="字体名称">
            <el-select 
              v-model="formData.fontname" 
              placeholder="请选择字体"
              class="input-field"
            >
              <el-option
                v-for="item in fontOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          
          <el-form-item class="form-item" label="字体大小">
            <el-input-number 
              v-model="formData.fontsize" 
              :min="10" 
              :max="200" 
              class="input-field"
            />
          </el-form-item>
          
          <div class="color-group">
            <el-form-item class="form-item color-item" label="主要颜色">
              <el-color-picker 
                v-model="formData.primaryColor" 
                show-alpha
                class="color-picker"
              />
            </el-form-item>
            
            <el-form-item class="form-item color-item" label="次要颜色">
              <el-color-picker 
                v-model="formData.secondaryColor" 
                show-alpha
                class="color-picker"
              />
            </el-form-item>
            
            <el-form-item class="form-item color-item" label="描边颜色">
              <el-color-picker 
                v-model="formData.outlineColor" 
                show-alpha
                class="color-picker"
              />
            </el-form-item>
            
            <el-form-item class="form-item color-item" label="背景颜色">
              <el-color-picker 
                v-model="formData.backColor" 
                show-alpha
                class="color-picker"
              />
            </el-form-item>
          </div>
        </el-form>
      </div>
      
      <div class="preview-section">
        <div class="section-header">
          <div class="section-icon">👁️</div>
          <div class="section-title">实时预览</div>
        </div>
        
        <div class="preview-container">
          <div class="preview-screen">
            <div class="preview-text" :style="previewStyle">
              {{ previewText }}
            </div>
          </div>
          
          <div class="preview-info">
            <div class="info-row">
              <span class="info-label">字体:</span>
              <span class="info-value">{{ formData.fontname }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">大小:</span>
              <span class="info-value">{{ formData.fontsize }}px</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="footer">
      <el-button class="btn-cancel" @click="handleCancel">取消</el-button>
      <el-button class="btn-confirm" type="primary" @click="handleConfirm">保存</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { saveSubtitleConfig } from '@/api/subititle'

const emit = defineEmits<{
  close: []
  success: []
}>()

const formData = reactive({
  name: '',
  fontname: 'Microsoft YaHei',
  fontsize: 24,
  primaryColor: '#FFFFFF',
  secondaryColor: '#FFFF00',
  outlineColor: '#000000',
  backColor: 'rgba(0,0,0,0.5)'
})

const fontOptions = [
  { label: '微软雅黑（Microsoft YaHei）', value: 'Microsoft YaHei' },
  { label: '思源黑体（Noto Sans CJK SC）', value: 'Noto Sans CJK SC' },
  { label: 'Arial', value: 'Arial' },
  { label: '黑体', value: 'SimHei' },
  { label: '宋体', value: 'SimSun' }
]

const previewText = '这是一段预览字幕文本，展示字幕样式效果'

const previewStyle = computed(() => ({
  fontFamily: formData.fontname,
  fontSize: formData.fontsize + 'px',
  color: formData.primaryColor,
  textShadow: `-2px -2px 0 ${formData.outlineColor}, 2px -2px 0 ${formData.outlineColor}, -2px 2px 0 ${formData.outlineColor}, 2px 2px 0 ${formData.outlineColor}`,
  backgroundColor: formData.backColor
}))

const handleConfirm = async () => {
  if (!formData.name) {
    ElMessage.warning('请输入字幕名称')
    return
  }
  
  try {
    const config = {
      fontname: formData.fontname,
      fontsize: formData.fontsize,
      primaryColor: formData.primaryColor,
      secondaryColor: formData.secondaryColor,
      outlineColor: formData.outlineColor,
      backColor: formData.backColor
    }
    await saveSubtitleConfig(formData.name, JSON.stringify(config))
    ElMessage.success('配置保存成功')
    emit('success')
    emit('close')
  } catch (error) {
    ElMessage.error('保存失败，请重试')
  }
}

const handleCancel = () => {
  emit('close')
}
</script>

<style scoped lang="less">
.subtitle-dialog {
  padding: 24px;
  min-height: 500px;
}

.content-wrapper {
  display: flex;
  gap: 24px;
  height: calc(100% - 80px);
}

.form-section {
  flex: 1;
  background: #fafafa;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #eee;
  
  .section-icon {
    font-size: 20px;
  }
  
  .section-title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }
}

.config-form {
  .form-item {
    margin-bottom: 16px;
    
    :deep(.el-form-item__label) {
      font-weight: 500;
      color: #606266;
      font-size: 14px;
    }
  }
  
  .input-field {
    width: 100%;
    
    :deep(.el-input__wrapper) {
      border-radius: 8px;
      transition: all 0.3s ease;
      
      &:hover {
        border-color: #c0c4cc;
      }
      
      &.is-focus {
        border-color: #409eff;
        box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.1);
      }
    }
  }
}

.color-group {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  
  .color-item {
    :deep(.el-color-picker) {
      width: 100%;
      
      :deep(.el-color-picker__trigger) {
        border-radius: 8px;
        width: 100%;
        height: 40px;
      }
    }
  }
}

.preview-section {
  flex: 1;
  background: #fafafa;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.preview-container {
  display: flex;
  flex-direction: column;
  height: calc(100% - 50px);
}

.preview-screen {
  flex: 1;
  background: #1a1a1a;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.3);
}

.preview-text {
  text-align: center;
  padding: 16px 24px;
  border-radius: 8px;
  line-height: 1.6;
  max-width: 100%;
  word-break: break-all;
}

.preview-info {
  margin-top: 16px;
  padding: 12px;
  background: #fff;
  border-radius: 8px;
  
  .info-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    
    .info-label {
      color: #909399;
      font-size: 13px;
    }
    
    .info-value {
      color: #303133;
      font-size: 13px;
      font-weight: 500;
    }
  }
}

.footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  background: #fff;
  border-top: 1px solid #eee;
  border-radius: 0 0 12px 12px;
  
  .btn-cancel {
    padding: 10px 24px;
    border-radius: 8px;
    font-size: 14px;
    transition: all 0.3s ease;
    
    &:hover {
      background: #f5f7fa;
    }
  }
  
  .btn-confirm {
    padding: 10px 24px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.3s ease;
    
    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
    }
  }
}
</style>