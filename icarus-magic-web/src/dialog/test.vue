<template>
  <el-dialog
    v-model="dialogVisible"
    :title="title"
    :width="width"
    :before-close="handleClose"
    :close-on-click-modal="closeOnClickModal"
  >
    <div class="test-dialog-content">
      <p>这是测试 Dialog</p>
      <el-form :model="form" label-width="100px">
        <el-form-item label="用户名">
          <el-input v-model="form.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="form.email" placeholder="请输入邮箱" />
        </el-form-item>
      </el-form>
      <div v-if="message" class="message">
        <p>接收到的消息：{{ message }}</p>
      </div>
    </div>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" @click="handleConfirm">确认</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  modelValue: boolean
  title?: string
  width?: string
  closeOnClickModal?: boolean
  message?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: '测试 Dialog',
  width: '500px',
  closeOnClickModal: true,
  message: ''
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'confirm': [data: any]
  'cancel': []
}>()

const dialogVisible = ref(props.modelValue)
const form = ref({
  username: '',
  email: ''
})

watch(() => props.modelValue, (val) => {
  dialogVisible.value = val
  if (val) {
    form.value = {
      username: '',
      email: ''
    }
  }
})

watch(dialogVisible, (val) => {
  emit('update:modelValue', val)
})

const handleClose = () => {
  dialogVisible.value = false
}

const handleCancel = () => {
  emit('cancel')
  dialogVisible.value = false
}

const handleConfirm = () => {
  emit('confirm', { ...form.value })
  dialogVisible.value = false
}
</script>

<style scoped lang="less">
.test-dialog-content {
  .message {
    margin-top: 20px;
    padding: 10px;
    background-color: #f0f9eb;
    border-radius: 4px;
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
