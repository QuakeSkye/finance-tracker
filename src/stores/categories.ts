import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { categoriesApi } from '../api/categories'
import type { Category, CategoryRule } from '../api/types'

export const useCategoriesStore = defineStore('categories', () => {
  const categories = ref<Category[]>([])
  const rules = ref<CategoryRule[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const selectedCategoryId = ref<number | null>(null)

  const selectedRules = computed(() => {
    if (!selectedCategoryId.value) {
      return rules.value
    }
    return rules.value.filter((item) => item.category_id === selectedCategoryId.value)
  })

  async function loadAll() {
    loading.value = true
    error.value = null
    try {
      const [categoryData, ruleData] = await Promise.all([
        categoriesApi.listCategories(),
        categoriesApi.listRules()
      ])
      categories.value = categoryData
      rules.value = ruleData
      if (!selectedCategoryId.value && categoryData.length > 0) {
        selectedCategoryId.value = categoryData[0].id
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载分类失败'
    } finally {
      loading.value = false
    }
  }

  async function createCategory(payload: { name: string; category_type: 'expense' | 'income'; color?: string | null }) {
    await categoriesApi.createCategory(payload)
    await loadAll()
  }

  async function updateCategory(id: number, payload: Partial<{ name: string; category_type: 'expense' | 'income'; color: string | null }>) {
    await categoriesApi.updateCategory(id, payload)
    await loadAll()
  }

  async function deleteCategory(id: number) {
    await categoriesApi.deleteCategory(id)
    await loadAll()
  }

  async function createRule(payload: { category_id: number; keyword: string; priority: number; is_enabled: boolean }) {
    await categoriesApi.createRule(payload)
    await loadAll()
  }

  async function updateRule(id: number, payload: Partial<{ category_id: number; keyword: string; priority: number; is_enabled: boolean }>) {
    await categoriesApi.updateRule(id, payload)
    await loadAll()
  }

  async function toggleRule(id: number, enabled: boolean) {
    await categoriesApi.toggleRule(id, enabled)
    await loadAll()
  }

  async function deleteRule(id: number) {
    await categoriesApi.deleteRule(id)
    await loadAll()
  }

  return {
    categories,
    rules,
    selectedCategoryId,
    selectedRules,
    loading,
    error,
    loadAll,
    createCategory,
    updateCategory,
    deleteCategory,
    createRule,
    updateRule,
    toggleRule,
    deleteRule
  }
})
