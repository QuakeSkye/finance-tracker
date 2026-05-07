import { http } from './http'
import type { CleanupConfirmResult, CleanupRecord } from './types'

export const cleanupApi = {
  async listPending(limit = 50, offset = 0) {
    const { data } = await http.get<CleanupRecord[]>('/cleanup/pending', { params: { limit, offset } })
    return data
  },
  async listHistory(limit = 50, offset = 0) {
    const { data } = await http.get<CleanupRecord[]>('/cleanup/history', { params: { limit, offset } })
    return data
  },
  async confirmOne(recordId: number) {
    const { data } = await http.post<CleanupConfirmResult>(`/cleanup/confirm/${recordId}`)
    return data
  },
  async confirmBatch(recordIds: number[]) {
    const { data } = await http.post<CleanupConfirmResult[]>('/cleanup/confirm-batch', { record_ids: recordIds })
    return data
  }
}
