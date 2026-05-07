import { http } from './http'
import type { Category, CategoryRule } from './types'

export const categoriesApi = {
  async listCategories() {
    const { data } = await http.get<Category[]>('/categories')
    return data
  },
  async createCategory(payload: { name: string; category_type: 'expense' | 'income'; color?: string | null }) {
    const { data } = await http.post<Category>('/categories', payload)
    return data
  },
  async updateCategory(id: number, payload: Partial<{ name: string; category_type: 'expense' | 'income'; color: string | null }>) {
    const { data } = await http.put<Category>(`/categories/${id}`, payload)
    return data
  },
  async deleteCategory(id: number) {
    await http.delete(`/categories/${id}`)
  },
  async listRules(params: { category_id?: number; is_enabled?: boolean } = {}) {
    const { data } = await http.get<CategoryRule[]>('/category-rules', { params })
    return data
  },
  async createRule(payload: { category_id: number; keyword: string; priority: number; is_enabled: boolean }) {
    const { data } = await http.post<CategoryRule>('/category-rules', payload)
    return data
  },
  async updateRule(id: number, payload: Partial<{ category_id: number; keyword: string; priority: number; is_enabled: boolean }>) {
    const { data } = await http.put<CategoryRule>(`/category-rules/${id}`, payload)
    return data
  },
  async toggleRule(id: number, is_enabled: boolean) {
    const { data } = await http.patch<CategoryRule>(`/category-rules/${id}/enabled`, { is_enabled })
    return data
  },
  async deleteRule(id: number) {
    await http.delete(`/category-rules/${id}`)
  }
}
