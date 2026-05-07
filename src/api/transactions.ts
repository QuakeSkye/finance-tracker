import { http } from './http'
import type { Direction, Transaction } from './types'

export interface TransactionQuery {
  start_date?: string
  end_date?: string
  category_id?: number
  merchant_keyword?: string
  direction?: Direction
  uncategorized_only?: boolean
}

export interface TransactionPayload {
  amount: string
  direction: Direction
  merchant_name?: string | null
  transaction_time?: string | null
  category_id?: number | null
  note?: string | null
}

export const transactionApi = {
  async list(query: TransactionQuery = {}) {
    const { data } = await http.get<Transaction[]>('/transactions', { params: query })
    return data
  },
  async get(id: number) {
    const { data } = await http.get<Transaction>(`/transactions/${id}`)
    return data
  },
  async create(payload: TransactionPayload) {
    const { data } = await http.post<Transaction>('/transactions', payload)
    return data
  },
  async update(id: number, payload: Partial<TransactionPayload>) {
    const { data } = await http.put<Transaction>(`/transactions/${id}`, payload)
    return data
  },
  async remove(id: number) {
    await http.delete(`/transactions/${id}`)
  }
}
