import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

import { authApi } from '../api/auth'
import type { UserInfo } from '../api/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserInfo | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const initialized = ref(false)

  const isLoggedIn = computed(() => user.value !== null)

  async function checkAuth() {
    error.value = null
    try {
      user.value = await authApi.me()
    } catch {
      user.value = null
    } finally {
      initialized.value = true
    }
  }

  async function login(username: string, password: string) {
    loading.value = true
    error.value = null
    try {
      await authApi.login(username, password)
      await checkAuth()
    } catch (err) {
      error.value = err instanceof Error ? err.message : '登录失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    try {
      await authApi.logout()
    } finally {
      user.value = null
    }
  }

  return {
    user,
    loading,
    error,
    initialized,
    isLoggedIn,
    checkAuth,
    login,
    logout
  }
})
