import { http } from './http'
import type { SystemEvent, SystemStatus } from './types'

export const systemApi = {
  async getStatus() {
    const { data } = await http.get<SystemStatus>('/system/status')
    return data
  },
  async listEvents(limit = 20) {
    const { data } = await http.get<SystemEvent[]>('/system/events', { params: { limit } })
    return data
  }
}
