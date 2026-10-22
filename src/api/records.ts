import { http } from './http'
import type {
  RecognitionInputType,
  RecognitionRecord,
  RecognitionRecordDetail,
  RecognitionRecordListResponse,
  RecognitionRecordUpdatePayload,
  RecognitionStatus
} from './types'

export interface RecordListParams {
  limit?: number
  offset?: number
  status?: RecognitionStatus
  need_review?: boolean
  input_type?: RecognitionInputType
  q?: string
}

export const recordsApi = {
  async list(params: RecordListParams = {}): Promise<RecognitionRecordListResponse> {
    const { data } = await http.get<RecognitionRecordListResponse>('/records', { params })
    return data
  },

  async get(id: number): Promise<RecognitionRecordDetail> {
    const { data } = await http.get<RecognitionRecordDetail>(`/records/${id}`)
    return data
  },

  async update(id: number, payload: RecognitionRecordUpdatePayload): Promise<RecognitionRecord> {
    const { data } = await http.patch<RecognitionRecord>(`/records/${id}`, payload)
    return data
  },

  async regeneratePayload(id: number): Promise<RecognitionRecord> {
    const { data } = await http.post<RecognitionRecord>(`/records/${id}/regenerate-icost-payload`)
    return data
  },

  async remove(id: number): Promise<void> {
    await http.delete(`/records/${id}`)
  }
}
