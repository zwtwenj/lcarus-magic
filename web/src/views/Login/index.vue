<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { login } from '../../api/auth'

const router = useRouter()
const loading = ref(false)

const form = reactive({
    account: '',
    password: '',
})

async function onSubmit() {
    if (!form.account.trim() || !form.password) {
        ElMessage.warning('请输入账号和密码')
        return
    }

    loading.value = true
    try {
        const { data } = await login({
            account: form.account.trim(),
            password: form.password,
        })

        const token = data?.token || ''
        if (!token) {
            throw new Error('登录成功但未返回 token')
        }

        localStorage.setItem('token', token)
        ElMessage.success('登录成功')
        router.replace('/event')
    } catch (error) {
        const msg = error?.response?.data?.message || error?.message || '登录失败'
        ElMessage.error(msg)
    } finally {
        loading.value = false
    }
}
</script>

<template>
    <div class="login-page">
        <el-card class="login-card" shadow="hover">
            <template #header>
                <div class="login-title">Icarus magic 登录</div>
            </template>

            <el-form @submit.prevent>
                <el-form-item label="账号">
                    <el-input v-model="form.account" placeholder="请输入账号" clearable @keyup.enter="onSubmit" />
                </el-form-item>

                <el-form-item label="密码">
                    <el-input v-model="form.password" type="password" placeholder="请输入密码" show-password
                        @keyup.enter="onSubmit" />
                </el-form-item>

                <el-button type="primary" :loading="loading" class="submit-btn" @click="onSubmit">
                    登录
                </el-button>
            </el-form>
        </el-card>
    </div>
</template>

<style lang="less" scoped>
.login-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f5f7fa;
    padding: 24px;
}

.login-card {
    width: 420px;
    max-width: 100%;
}

.login-title {
    font-size: 18px;
    font-weight: 600;
    color: #303133;
}

.submit-btn {
    width: 100%;
}
</style>
