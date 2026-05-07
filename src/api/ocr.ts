import { http } from './http'
import type { OcrRecord } from './types'

export const ocrApi = {
  async listRecords(limit = 50, offset = 0) {
    const { data } = await http.get<OcrRecord[]>('/ocr/records', { params: { limit, offset } })
    return data
  },
  async listFailures(limit = 20, offset = 0) {
    const { data } = await http.get<OcrRecord[]>('/ocr/failures', { params: { limit, offset } })
    return data
  }
}
