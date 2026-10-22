import { http } from './http'
import type {
  ICostMapping,
  ICostMappingListResponse,
  ICostMappingPayload,
  ICostMappingType,
  ICostTransactionType
} from './types'

export interface MappingListParams {
  mapping_type?: ICostMappingType
  transaction_type?: ICostTransactionType
}

export function createMappingsApi(userId: number) {
return {
  async list(params: MappingListParams = {}): Promise<ICostMapping[]> {
    const { data } = await http.get<ICostMappingListResponse>(`/ledger-users/${userId}/mappings`, { params })
    return data.items
  },

  async create(payload: ICostMappingPayload): Promise<ICostMapping> {
    const { data } = await http.post<ICostMapping>(`/ledger-users/${userId}/mappings`, payload)
    return data
  },

  async update(id: number, payload: Partial<ICostMappingPayload>): Promise<ICostMapping> {
    const { data } = await http.patch<ICostMapping>(`/ledger-users/${userId}/mappings/${id}`, payload)
    return data
  },

  async remove(id: number): Promise<void> {
    await http.delete(`/ledger-users/${userId}/mappings/${id}`)
  }
}

}
