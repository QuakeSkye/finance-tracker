<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

import { cleanupApi } from '../api/cleanup'
import type { CleanupRecord } from '../api/types'

const loading = ref(false)
const pendingRecords = ref<CleanupRecord[]>([])
const historyRecords = ref<CleanupRecord[]>([])
const selectedIds = ref<number[]>([])

function formatDateTime(value: string | null) {
  if (!value) {
    return '-'
  }
  return new Date(value).toLocaleString('zh-CN')
}

async function load() {
  loading.value = true
  try {
    const [pending, history] = await Promise.all([cleanupApi.listPending(200, 0), cleanupApi.listHistory(100, 0)])
    pendingRecords.value = pending
    historyRecords.value = history
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '加载失败')
  } finally {
    loading.value = false
  }
}

function onSelectionChange(rows: CleanupRecord[]) {
  selectedIds.value = rows.map((item) => item.id)
}

async function confirmOne(recordId: number) {
  await ElMessageBox.confirm('确认删除该图片？删除动作不可撤销。', '删除确认', { type: 'warning' })
  const result = await cleanupApi.confirmOne(recordId)
  if (result.delete_status === 'deleted') {
    ElMessage.success('删除成功')
  } else {
    ElMessage.warning(result.message)
  }
  await load()
}

async function confirmBatch() {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('请先选择记录')
    return
  }
  await ElMessageBox.confirm(`确认删除选中的 ${selectedIds.value.length} 条记录？`, '批量删除确认', { type: 'warning' })
  const results = await cleanupApi.confirmBatch(selectedIds.value)
  const failed = results.filter((item) => item.delete_status !== 'deleted')
  if (failed.length === 0) {
    ElMessage.success('批量删除成功')
  } else {
    ElMessage.warning(`批量删除完成，失败 ${failed.length} 条`)
  }
  selectedIds.value = []
  await load()
}

onMounted(() => {
  void load()
})
</script>

<template>
  <div class="grid gap-4">
    <section class="panel p-6">
      <p class="text-xs uppercase tracking-[0.16em] text-zinc-500">清理中心</p>
      <h2 class="display-font mt-2 text-3xl">待删除图片确认</h2>
      <p class="mt-3 max-w-3xl text-sm leading-7 text-zinc-600">
        到期记录进入待确认状态后，由用户确认触发实际删除；删除结果会回写数据库并进入历史追踪。
      </p>
    </section>

    <section class="panel p-4 md:p-6">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm text-zinc-600">
          待删除：<span class="font-semibold text-ink">{{ pendingRecords.length }}</span>
        </p>
        <div class="flex flex-wrap gap-2">
          <el-button @click="load" :loading="loading">刷新</el-button>
          <el-button type="primary" @click="confirmBatch">批量确认删除</el-button>
        </div>
      </div>

      <el-table :data="pendingRecords" stripe v-loading="loading" @selection-change="onSelectionChange">
        <el-table-column type="selection" width="48" />
        <el-table-column prop="id" label="记录ID" width="90" />
        <el-table-column prop="original_filename" label="文件名" min-width="210" />
        <el-table-column label="可删除时间" min-width="170">
          <template #default="scope">{{ formatDateTime(scope.row.deletable_at) }}</template>
        </el-table-column>
        <el-table-column prop="process_status" label="处理状态" width="110" />
        <el-table-column label="操作" width="110">
          <template #default="scope">
            <el-button text type="danger" @click="confirmOne(scope.row.id)">确认删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <section class="panel p-4 md:p-6">
      <div class="mb-3">
        <h3 class="text-sm font-bold uppercase tracking-[0.16em] text-zinc-500">最近删除历史</h3>
      </div>
      <el-table :data="historyRecords" stripe>
        <el-table-column prop="id" label="记录ID" width="90" />
        <el-table-column prop="original_filename" label="文件名" min-width="210" />
        <el-table-column prop="delete_status" label="删除状态" width="120" />
        <el-table-column label="确认时间" min-width="170">
          <template #default="scope">{{ formatDateTime(scope.row.delete_confirmed_at) }}</template>
        </el-table-column>
        <el-table-column label="执行时间" min-width="170">
          <template #default="scope">{{ formatDateTime(scope.row.delete_executed_at) }}</template>
        </el-table-column>
        <el-table-column label="失败原因" min-width="220">
          <template #default="scope">
            {{ scope.row.delete_status === 'delete_failed' ? (scope.row.delete_failure_reason || scope.row.failure_reason || '请查看系统事件') : '-' }}
          </template>
        </el-table-column>
      </el-table>
    </section>
  </div>
</template>
