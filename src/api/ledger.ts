import { http } from './http'

export interface LedgerUser {
  id: number
  display_name: string
  enabled: boolean
  image_provider: 'deepseek' | 'local_ollama'
  token_prefix: string | null
  credential: { configured: boolean; masked: string | null; status: string; updated_at: string | null }
}
export interface Failure {
  id: number
  ledger_user_id: number
  request_id: string
  created_at: string
  error_stage: string
  error_code: string
  message: string
  provider_key: string
  model: string
  latency_ms: number | null
}
export const ledgerApi = {
  async selectEngine(id: number, provider: string) { await http.put(`/ledger-users/${id}/image-engine`, { provider }) },
  async list() { return (await http.get<{ items: LedgerUser[] }>('/ledger-users')).data.items },
  async get(id: number) { return (await http.get<LedgerUser>(`/ledger-users/${id}`)).data },
  async create(display_name: string) { return (await http.post<LedgerUser>('/ledger-users', { display_name })).data },
  async update(id: number, updates: { display_name?: string; enabled?: boolean }) {
    return (await http.patch<LedgerUser>(`/ledger-users/${id}`, updates)).data
  },
  async rotate(id: number) { return (await http.post<{ token: string }>(`/ledger-users/${id}/token/rotate`)).data },
  async revoke(id: number) { await http.post(`/ledger-users/${id}/token/revoke`) },
  async key(id: number, api_key: string) { await http.put(`/ledger-users/${id}/deepseek-key`, { api_key }) },
  async deleteKey(id: number) { await http.delete(`/ledger-users/${id}/deepseek-key`) },
  async failures(id: number, params: Record<string, unknown>) {
    return (await http.get<{ items: Failure[]; total: number }>(`/ledger-users/${id}/recognition-failures`, { params })).data
  },
  async failure(id: number, failureId: number) {
    return (await http.get<Failure>(`/ledger-users/${id}/recognition-failures/${failureId}`)).data
  },
  async removeFailure(id: number, failureId: number) {
    await http.delete(`/ledger-users/${id}/recognition-failures/${failureId}`)
  }
}
