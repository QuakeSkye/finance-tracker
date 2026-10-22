import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { systemApi } from '../api/system'
import type { SystemStatus } from '../api/types'

export const useDashboardStore = defineStore('dashboard', () => {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const systemStatus = ref<SystemStatus | null>(null)

  const ocrStatus = computed(() => systemStatus.value?.ocr ?? null)
  const imageProviderStatus = computed(() => systemStatus.value?.image_provider ?? null)
  const activeImageProviderKey = computed(() => systemStatus.value?.active_image_provider_key ?? '')
  const activeImageProviderModel = computed(() => systemStatus.value?.active_image_provider_model ?? null)
  const activeImageProviderType = computed(() => systemStatus.value?.active_image_provider_type ?? null)
  const processedRecordCount = computed(() => systemStatus.value?.processed_record_count ?? 0)
  const failedRecordCount = computed(() => systemStatus.value?.failed_record_count ?? 0)
  const lastSuccessTime = computed(() => systemStatus.value?.last_success_time ?? null)
  const recentFailureReason = computed(() => systemStatus.value?.recent_failure_reason ?? null)
  const databaseStatus = computed(() => systemStatus.value?.database ?? null)
  const tunnelHint = computed(() => systemStatus.value?.tunnel_hint ?? '')
  const todayRecognitionCount = computed(() => systemStatus.value?.today_recognition_count ?? 0)
  const todayPayloadGeneratedCount = computed(() => systemStatus.value?.today_payload_generated_count ?? 0)
  const todayNeedReviewCount = computed(() => systemStatus.value?.today_need_review_count ?? 0)
  const todayCreatedInIcostCount = computed(() => systemStatus.value?.today_created_in_icost_count ?? 0)
  const recentRecords = computed(() => systemStatus.value?.recent_records ?? [])

  async function refresh() {
    loading.value = true
    error.value = null
    try {
      systemStatus.value = await systemApi.getStatus()
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载失败'
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    systemStatus,
    ocrStatus,
    imageProviderStatus,
    activeImageProviderKey,
    activeImageProviderModel,
    activeImageProviderType,
    processedRecordCount,
    failedRecordCount,
    lastSuccessTime,
    recentFailureReason,
    databaseStatus,
    tunnelHint,
    todayRecognitionCount,
    todayPayloadGeneratedCount,
    todayNeedReviewCount,
    todayCreatedInIcostCount,
    recentRecords,
    refresh
  }
})
