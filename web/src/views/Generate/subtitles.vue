<script setup>
import { useGenerateStore } from './index.store'
import { storeToRefs } from 'pinia'
const store = useGenerateStore()
const { subtitleType, subtitleSize, subtitleColor, subtitleContent } = storeToRefs(store)
</script>

<template>
    <el-card class="config-card">
        <template #header>
            <div class="config-header">
                <span>字幕配置</span>
            </div>
        </template>
        <div class="config-content">
            <el-form :inline="true" label-width="80px">
                <el-form-item label="字幕类型">
                    <el-select v-model="subtitleType" placeholder="选择字幕类型">
                        <el-option label="自动生成" value="auto"></el-option>
                        <el-option label="手动输入" value="manual"></el-option>
                    </el-select>
                </el-form-item>
                <el-form-item label="字体大小">
                    <el-slider v-model="subtitleSize" :min="12" :max="36" :step="1"></el-slider>
                </el-form-item>
                <el-form-item label="字体颜色">
                    <el-color-picker v-model="subtitleColor"></el-color-picker>
                </el-form-item>
            </el-form>
            <el-form-item label="字幕内容" v-if="subtitleType === 'manual'">
                <el-input type="textarea" v-model="subtitleContent" :rows="3" placeholder="请输入字幕内容"></el-input>
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
</style>
