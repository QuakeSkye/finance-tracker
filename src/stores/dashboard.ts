import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { categoriesApi } from '../api/categories'
import { systemApi } from '../api/system'
import { transactionApi } from '../api/transactions'
import type { SystemStatus, Transaction } from '../api/types'

function isSameDay(target: Date, other: Date) {
  return (
    target.getFullYear() === other.getFullYear() &&
    target.getMonth() === other.getMonth() &&
    target.getDate() === other.getDate()
  )
}

function isSameMonth(target: Date, other: Date) {
  return target.getFullYear() === other.getFullYear() && target.getMonth() === other.getMonth()
}

function toAmount(value: string) {
  return Number.parseFloat(value)
}

export const useDashboardStore = defineStore('dashboard', () => {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const transactions = ref<Transaction[]>([])
  const uncategorizedId = ref<number | null>(null)
  const systemStatus = ref<SystemStatus | null>(null)

  const todayCount = computed(() => {
    const now = new Date()
    return transactions.value.filter((item) => isSameDay(new Date(item.transaction_time), now)).length
  })

  const todayAmount = computed(() => {
    const now = new Date()
    return transactions.value
      .filter((item) => isSameDay(new Date(item.transaction_time), now))
      .reduce((sum, item) => sum + toAmount(item.amount), 0)
  })

  const monthExpense = computed(() => {
    const now = new Date()
    return transactions.value
      .filter((item) => isSameMonth(new Date(item.transaction_time), now) && item.direction === 'expense')
      .reduce((sum, item) => sum + toAmount(item.amount), 0)
  })

  const monthIncome = computed(() => {
    const now = new Date()
    return transactions.value
      .filter((item) => isSameMonth(new Date(item.transaction_time), now) && item.direction === 'income')
      .reduce((sum, item) => sum + toAmount(item.amount), 0)
  })

  const uncategorizedCount = computed(() => {
    if (systemStatus.value) {
      return systemStatus.value.uncategorized_count
    }
    if (!uncategorizedId.value) {
      return 0
    }
    return transactions.value.filter((item) => item.category_id === uncategorizedId.value).length
  })

  const pendingDeleteCount = computed(() => systemStatus.value?.pending_delete_count ?? 0)
  const lastSuccessTime = computed(() => systemStatus.value?.last_success_time ?? null)
  const recentFailureReason = computed(() => systemStatus.value?.recent_failure_reason ?? null)
  const watcherStatus = computed(() => systemStatus.value?.watcher ?? null)
  const ocrStatus = computed(() => systemStatus.value?.ocr ?? null)
  const barkStatus = computed(() => systemStatus.value?.bark ?? null)

  const recentTransactions = computed(() => transactions.value.slice(0, 8))

  const trendLabels = computed(() => {
    const now = new Date()
    const labels: string[] = []
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      labels.push(`${d.getMonth() + 1}/${d.getDate()}`)
    }
    return labels
  })

  const trendExpenseSeries = computed(() => {
    const now = new Date()
    const values: number[] = []
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const sum = transactions.value
        .filter((item) => item.direction === 'expense' && isSameDay(new Date(item.transaction_time), d))
        .reduce((acc, item) => acc + toAmount(item.amount), 0)
      values.push(Number(sum.toFixed(2)))
    }
    return values
  })

  async function refresh() {
    loading.value = true
    error.value = null
    try {
      const [transactionData, categoryData, statusData] = await Promise.all([
        transactionApi.list(),
        categoriesApi.listCategories(),
        systemApi.getStatus()
      ])
      transactions.value = transactionData
      systemStatus.value = statusData
      uncategorizedId.value = categoryData.find((item) => item.name === '未分类')?.id ?? null
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载失败'
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    transactions,
    systemStatus,
    todayCount,
    todayAmount,
    monthExpense,
    monthIncome,
    uncategorizedCount,
    pendingDeleteCount,
    lastSuccessTime,
    recentFailureReason,
    watcherStatus,
    ocrStatus,
    barkStatus,
    recentTransactions,
    trendLabels,
    trendExpenseSeries,
    refresh
  }
})
