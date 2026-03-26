<script setup>
import { useGenerateStore } from './index.store'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { uploadMaterial } from '../../api/generate'

const store = useGenerateStore()
const { materialType, videoDuration, materialList } = storeToRefs(store)

const handleExceed = (...args) => store.handleExceed(...args)

const handleMaterialChange = async (file) => {
    if (!file?.raw) return
    try {
        const { data } = await uploadMaterial(file.raw)
        const payload = data?.data || {}
        const ossUrl = String(payload.ossUrl || '').trim()
        if (!ossUrl) {
            throw new Error('未拿到素材 OSS 地址')
        }
        const exists = (store.materialList || []).some(
            (m) => String(m?.ossUrl || '').trim() === ossUrl
        )
        if (!exists) {
            store.materialList = [
                ...store.materialList,
                {
                    name: payload.originalname || file.name,
                    ossUrl,
                },
            ]
        }
        ElMessage.success('素材上传成功')
    } catch (error) {
        ElMessage.error(error?.response?.data?.message || error?.message || '素材上传失败')
    }
}

const removeMaterial = (index) => {
    store.materialList = store.materialList.filter((_, i) => i !== index)
}
</script>

<template>
    <el-card class="config-card">
        <template #header>
            <div class="config-header">
                <span>素材配置</span>
            </div>
        </template>
        <div class="config-content">
            <el-form :inline="true" label-width="80px">
                <el-form-item label="素材类型">
                    <el-select v-model="materialType" placeholder="选择素材类型">
                        <el-option label="自动匹配" value="auto"></el-option>
                        <el-option label="手动选择" value="manual"></el-option>
                    </el-select>
                </el-form-item>
                <el-form-item label="视频时长">
                    <el-select v-model="videoDuration" placeholder="选择视频时长">
                        <el-option label="15秒" value="15"></el-option>
                        <el-option label="30秒" value="30"></el-option>
                        <el-option label="1分钟" value="60"></el-option>
                        <el-option label="2分钟" value="120"></el-option>
                    </el-select>
                </el-form-item>
            </el-form>
            <el-form-item label="素材列表" v-if="materialType === 'manual'">
                <el-upload
                    class="upload-demo"
                    action="#"
                    :auto-upload="false"
                    :on-change="handleMaterialChange"
                    multiple
                    :limit="5"
                    :on-exceed="handleExceed"
                    accept="image/*,video/*"
                >
                    <el-button type="primary">点击上传素材</el-button>
                    <template #tip>
                        <div class="el-upload__tip">
                            支持上传图片和视频，最多5个文件
                        </div>
                    </template>
                </el-upload>
                <div v-if="materialList.length > 0" class="material-list">
                    <el-tag
                        v-for="(file, index) in materialList"
                        :key="index"
                        closable
                        @close="removeMaterial(index)"
                    >
                        {{ file.name }}
                    </el-tag>
                </div>
            </el-form-item>
        </div>
    </el-card>
</template>

<style lang="less" scoped>
.config-card {
    margin-bottom: 20px;
    border-radius: 8px;
}

.config-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.config-content {
    padding: 15px 0;
}

.upload-demo {
    margin-top: 10px;
}

.material-list {
    margin-top: 10px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}
</style>
