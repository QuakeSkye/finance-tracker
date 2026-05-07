import { reactive, ref } from 'vue'
import { defineStore } from 'pinia'

import { transactionApi, type TransactionPayload, type TransactionQuery } from '../api/transactions'
import type { Transaction } from '../api/types'

export const useTransactionsStore = defineStore('transactions', () => {
  const items = ref<Transaction[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const filters = reactive<TransactionQuery>({
    merchant_keyword: '',
    direction: undefined,
    category_id: undefined,
    start_date: undefined,
    end_date: undefined,
    uncategorized_only: false
  })

  async function load() {
    loading.value = true
    error.value = null
    try {
      const query: TransactionQuery = {
        merchant_keyword: filters.merchant_keyword || undefined,
        direction: filters.direction,
        category_id: filters.category_id,
        start_date: filters.start_date,
        end_date: filters.end_date,
        uncategorized_only: filters.uncategorized_only || undefined
      }
      items.value = await transactionApi.list(query)
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载流水失败'
    } finally {
      loading.value = false
    }
  }

  async function create(payload: TransactionPayload) {
    await transactionApi.create(payload)
    await load()
  }

  async function update(id: number, payload: Partial<TransactionPayload>) {
    await transactionApi.update(id, payload)
    await load()
  }

  async function remove(id: number) {
    await transactionApi.remove(id)
    await load()
  }

  return {
    items,
    loading,
    error,
    filters,
    load,
    create,
    update,
    remove
  }
})
