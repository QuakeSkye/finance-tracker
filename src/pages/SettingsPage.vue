<script setup lang="ts">
import { onMounted } from 'vue'

import { useSystemStore } from '../stores/system'

const system = useSystemStore()
const apiBaseURL = '/api/v1'

function yesNo(value: boolean | undefined) {
  if (value === undefined) {
    return '检测中'
  }
  return value ? '可用' : '不可用'
}

onMounted(() => {
  void system.refresh()
})
</script>

<template>
  <div class="grid gap-4 overflow-x-auto lg:grid-cols-[1.2fr_1fr]">
    <section class="panel p-5 md:p-6">
      <h3 class="text-sm font-bold uppercase tracking-[0.16em] text-zinc-500">本地配置与状态</h3>
      <el-descriptions border :column="1" class="mt-4">
        <el-descriptions-item label="API Base URL">{{ apiBaseURL }}</el-descriptions-item>
        <el-descriptions-item label="Watcher">{{ yesNo(system.status?.watcher.available) }} · {{ system.status?.watcher.message || '-' }}</el-descriptions-item>
        <el-descriptions-item label="OCR">{{ yesNo(system.status?.ocr.available) }} · {{ system.status?.ocr.message || '-' }}</el-descriptions-item>
        <el-descriptions-item label="Bark">{{ yesNo(system.status?.bark.available) }} · {{ system.status?.bark.message || '-' }}</el-descriptions-item>
        <el-descriptions-item label="最近成功处理">{{ system.status?.last_success_time ? new Date(system.status.last_success_time).toLocaleString('zh-CN') : '暂无' }}</el-descriptions-item>
        <el-descriptions-item label="待删除数量">{{ String(system.status?.pending_delete_count ?? 0) }}</el-descriptions-item>
      </el-descriptions>
    </section>

    <section class="panel p-5 md:p-6">
      <div class="mb-3 flex items-center justify-between">
        <h3 class="text-sm font-bold uppercase tracking-[0.16em] text-zinc-500">最近系统事件</h3>
        <el-button text @click="system.refresh" :loading="system.loading">刷新</el-button>
      </div>
      <el-table :data="system.events" height="360" stripe>
        <el-table-column prop="created_at" label="时间" min-width="160" />
        <el-table-column prop="event_type" label="类型" width="120" />
        <el-table-column prop="level" label="级别" width="90" />
        <el-table-column prop="summary" label="摘要" min-width="190" />
      </el-table>
    </section>
  </div>
</template>
