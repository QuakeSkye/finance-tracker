import { ref } from 'vue'
import { defineStore } from 'pinia'

import { systemApi } from '../api/system'
import type { SystemEvent, SystemStatus } from '../api/types'

export const useSystemStore = defineStore('system', () => {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const status = ref<SystemStatus | null>(null)
  const events = ref<SystemEvent[]>([])

  async function refresh() {
    loading.value = true
    error.value = null
    try {
      const [statusData, eventData] = await Promise.all([systemApi.getStatus(), systemApi.listEvents(20)])
      status.value = statusData
      events.value = eventData
    } catch (err) {
      error.value = err instanceof Error ? err.message : '系统状态加载失败'
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    status,
    events,
    refresh
  }
})
