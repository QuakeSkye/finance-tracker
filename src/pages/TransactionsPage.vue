<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

import { useTransactionsStore } from '../stores/transactions'
import { useCategoriesStore } from '../stores/categories'
import type { Direction } from '../api/types'

const txStore = useTransactionsStore()
const categoryStore = useCategoriesStore()

const dialogOpen = ref(false)
const editingId = ref<number | null>(null)
const dateRange = ref<[Date, Date] | null>(null)

const form = reactive({
  amount: '',
  direction: 'expense' as Direction,
  merchant_name: '',
  category_id: undefined as number | undefined,
  note: ''
})

const dialogTitle = computed(() => (editingId.value ? '编辑流水' : '新增流水'))

function getCategoryById(id: number | null) {
  if (!id) return null
  return categoryStore.categories.find((c) => c.id === id) ?? null
}

function resetForm() {
  form.amount = ''
  form.direction = 'expense'
  form.merchant_name = ''
  form.category_id = undefined
  form.note = ''
  editingId.value = null
}

function applyDateFilter() {
  if (!dateRange.value) {
    txStore.filters.start_date = undefined
    txStore.filters.end_date = undefined
    return
  }
  const [start, end] = dateRange.value
  txStore.filters.start_date = start.toISOString()
  txStore.filters.end_date = end.toISOString()
}

async function search() {
  applyDateFilter()
  await txStore.load()
}

function openCreate() {
  resetForm()
  dialogOpen.value = true
}

function openEdit(row: { id: number; amount: string; direction: Direction; merchant_name: string; category_id: number | null; note: string | null }) {
  editingId.value = row.id
  form.amount = row.amount
  form.direction = row.direction
  form.merchant_name = row.merchant_name
  form.category_id = row.category_id ?? undefined
  form.note = row.note ?? ''
  dialogOpen.value = true
}

async function submit() {
  if (!form.amount) {
    ElMessage.error('金额必填')
    return
  }

  try {
    if (editingId.value) {
      await txStore.update(editingId.value, {
        amount: form.amount,
        direction: form.direction,
        merchant_name: form.merchant_name || null,
        category_id: form.category_id ?? null,
        note: form.note || null
      })
      ElMessage.success('已更新')
    } else {
      await txStore.create({
        amount: form.amount,
        direction: form.direction,
        merchant_name: form.merchant_name || null,
        category_id: form.category_id ?? null,
        note: form.note || null
      })
      ElMessage.success('已创建')
    }

    dialogOpen.value = false
    resetForm()
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '保存失败')
  }
}

async function remove(id: number) {
  await ElMessageBox.confirm('确认删除该流水？', '提示', { type: 'warning' })
  await txStore.remove(id)
  ElMessage.success('已删除')
}

onMounted(async () => {
  await Promise.all([categoryStore.loadAll(), txStore.load()])
})
</script>

<template>
  <div class="grid gap-4">
    <section class="panel p-6">
      <p class="text-xs uppercase tracking-[0.16em] text-zinc-500">流水记录</p>
      <h2 class="display-font mt-2 text-3xl">交易流水管理</h2>
      <p class="mt-3 max-w-3xl text-sm leading-7 text-zinc-600">
        查看和管理所有交易记录，支持按时间、商家、分类、收支方向筛选，也可手动新增流水。
      </p>
    </section>

    <section class="panel p-4 md:p-6">
      <div class="flex flex-wrap gap-3">
        <el-input v-model="txStore.filters.merchant_keyword" placeholder="商家关键词" class="!w-48" />

        <el-select v-model="txStore.filters.direction" clearable placeholder="收支方向" class="!w-32">
          <el-option label="支出" value="expense" />
          <el-option label="收入" value="income" />
        </el-select>

        <el-select v-model="txStore.filters.category_id" clearable placeholder="分类" class="!w-36">
          <el-option v-for="category in categoryStore.categories" :key="category.id" :label="category.name" :value="category.id" />
        </el-select>

        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          class="!w-64"
        />
      </div>

      <div class="mt-3 flex flex-wrap items-center gap-3">
        <el-checkbox v-model="txStore.filters.uncategorized_only">仅看未分类</el-checkbox>
        <el-button type="primary" @click="search">筛选</el-button>
        <el-button @click="openCreate">新增流水</el-button>
      </div>
    </section>

    <section class="panel p-4 md:p-6">
      <el-table :data="txStore.items" v-loading="txStore.loading" stripe height="calc(100vh - 380px)" :default-sort="{ prop: 'transaction_time', order: 'descending' }">
        <el-table-column prop="transaction_time" label="时间" min-width="180" sortable />
        <el-table-column prop="merchant_name" label="商家" min-width="160" sortable />
        <el-table-column prop="direction" label="方向" width="100" sortable :sort-method="(a, b) => a.direction.localeCompare(b.direction)">
          <template #default="scope">
            <el-tag :type="scope.row.direction === 'expense' ? 'danger' : 'success'" size="small">
              {{ scope.row.direction === 'expense' ? '支出' : '收入' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="金额" width="130" sortable :sort-method="(a, b) => Number(a.amount) - Number(b.amount)" />
        <el-table-column label="分类" width="140" sortable :sort-method="(a, b) => (getCategoryById(a.category_id)?.name ?? '').localeCompare(getCategoryById(b.category_id)?.name ?? '')">
          <template #default="scope">
            <template v-if="getCategoryById(scope.row.category_id)">
              <el-tag :color="getCategoryById(scope.row.category_id)?.color ?? undefined" size="small" effect="dark" style="border: none;">
                {{ getCategoryById(scope.row.category_id)?.name }}
              </el-tag>
            </template>
            <el-tag v-else size="small" type="info">未分类</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="note" label="备注" min-width="200" show-overflow-tooltip />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="scope">
            <el-button text type="primary" @click="openEdit(scope.row)">编辑</el-button>
            <el-button text type="danger" @click="remove(scope.row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <el-dialog v-model="dialogOpen" :title="dialogTitle" width="520px">
      <el-form label-position="top">
        <el-form-item label="金额">
          <el-input v-model="form.amount" placeholder="例如 88.60" />
        </el-form-item>
        <el-form-item label="收支方向">
          <el-select v-model="form.direction" class="w-full">
            <el-option label="支出" value="expense" />
            <el-option label="收入" value="income" />
          </el-select>
        </el-form-item>
        <el-form-item label="商家（可选）">
          <el-input v-model="form.merchant_name" placeholder="为空时自动填入'未知商家'" />
        </el-form-item>
        <el-form-item label="分类（可选）">
          <el-select v-model="form.category_id" clearable class="w-full" placeholder="为空时自动归入'未分类'">
            <el-option v-for="category in categoryStore.categories" :key="category.id" :label="category.name" :value="category.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.note" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogOpen = false">取消</el-button>
        <el-button type="primary" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
