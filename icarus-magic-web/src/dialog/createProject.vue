<template>
  <div class="create-project">
    <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
      <el-form-item label="项目名称" prop="name">
        <el-input v-model="form.name" placeholder="请输入项目名称" />
      </el-form-item>
      <el-form-item label="项目描述" prop="description">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="4"
          placeholder="请输入项目描述"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="handleSubmit">创建</el-button>
        <el-button @click="handleCancel">取消</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage, type FormInstance } from 'element-plus'
import { useUserStore } from '../store/user.store'
import { createProject } from '../api/project'

const formRef = ref<FormInstance>()
const userStore = useUserStore()

const form = reactive({
  name: '',
  description: '',
  userId: userStore.userId
})

const rules = {
  name: [
    { required: true, message: '请输入项目名称', trigger: 'blur' },
    { min: 1, max: 50, message: '项目名称长度应在 1 到 50 个字符之间', trigger: 'blur' }
  ],
  description: [
    { required: true, message: '请输入项目描述', trigger: 'blur' }
  ]
}

const emit = defineEmits<{
  'close': []
  'success': []
}>()

const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        await createProject(form)
        ElMessage.success('项目创建成功')
        emit('success')
        emit('close')
      } catch (error) {
        ElMessage.error('创建项目失败，请重试')
      }
    }
  })
}

const handleCancel = () => {
  emit('close')
}
</script>

<style scoped lang="less">
.create-project {
  padding: 20px;
  
  .el-form {
    width: 100%;
  }
  
  .el-form-item {
    margin-bottom: 20px;
    
    .el-form-item__label {
      color: #333;
      font-size: 14px;
      font-weight: 500;
    }
    
    .el-form-item__error {
      color: #f56c6c;
      font-size: 12px;
    }
  }
  
  .el-input,
  .el-textarea {
    width: 100%;
    
    :deep(.el-input__wrapper) {
      background: #fff;
      border: 1px solid #dcdfe6;
      border-radius: 4px;
      transition: all 0.3s ease;
      
      &:hover {
        border-color: #c0c4cc;
      }
      
      &.is-focus {
        border-color: #409eff;
        box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
      }
    }
    
    :deep(.el-input__inner) {
      color: #303133;
      font-size: 14px;
    }
    
    :deep(.el-textarea__inner) {
      color: #303133;
      font-size: 14px;
      line-height: 1.5;
      background: #fff;
      border: 1px solid #dcdfe6;
      border-radius: 4px;
      transition: all 0.3s ease;
      
      &:hover {
        border-color: #c0c4cc;
      }
      
      &:focus {
        border-color: #409eff;
        box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
      }
    }
  }
  
  .el-button {
    padding: 8px 20px;
    border-radius: 4px;
    font-size: 14px;
    transition: all 0.3s ease;
    
    &--primary {
      background: #409eff;
      border: 1px solid #409eff;
      color: #fff;
      
      &:hover {
        background: #66b1ff;
        border-color: #66b1ff;
      }
    }
    
    &--default {
      background: #fff;
      border: 1px solid #dcdfe6;
      color: #606266;
      
      &:hover {
        border-color: #c0c4cc;
        color: #303133;
      }
    }
  }
}
</style>