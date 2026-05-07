export type Direction = 'expense' | 'income'

export interface Transaction {
  id: number
  amount: string
  direction: Direction
  merchant_name: string
  transaction_time: string
  category_id: number | null
  source_type: string
  source_record_id: string | null
  note: string | null
  created_at: string
  updated_at: string
}

export interface Category {
  id: number
  name: string
  category_type: 'expense' | 'income'
  color: string | null
  created_at: string
  updated_at: string
}

export interface CategoryRule {
  id: number
  category_id: number
  keyword: string
  priority: number
  is_enabled: boolean
  created_at: string
  updated_at: string
}

export interface OcrRecord {
  id: number
  original_filename: string
  original_file_path: string
  file_hash: string
  detected_at: string
  ocr_raw_result: string | null
  ai_selected_amount: string | null
  ai_selected_merchant: string | null
  category_result: string | null
  process_status: string
  failure_reason: string | null
  transaction_id: number | null
  bark_push_status: string | null
  delete_status: 'active' | 'pending_confirm' | 'deleted' | 'delete_failed'
  deletable_at: string | null
  delete_confirmed_at: string | null
  delete_executed_at: string | null
  delete_failure_reason?: string | null
  created_at: string
  updated_at: string
}

export interface ServiceStatus {
  available: boolean
  message: string
}

export interface SystemStatus {
  watcher: ServiceStatus
  ocr: ServiceStatus
  bark: ServiceStatus
  last_success_time: string | null
  recent_failure_reason: string | null
  today_success_count: number
  pending_delete_count: number
  uncategorized_count: number
}

export interface SystemEvent {
  id: number
  event_type: string
  level: 'info' | 'warning' | 'error'
  summary: string
  details: string | null
  related_record_id: string | null
  created_at: string
}

export interface CleanupConfirmResult {
  record_id: number
  delete_status: string
  message: string
}

export interface CleanupRecord {
  id: number
  original_filename: string
  original_file_path: string
  process_status: string
  ai_selected_amount: string | null
  ai_selected_merchant: string | null
  delete_status: 'active' | 'pending_confirm' | 'deleted' | 'delete_failed'
  deletable_at: string | null
  delete_confirmed_at: string | null
  delete_executed_at: string | null
  created_at: string
  updated_at: string
  delete_failure_reason?: string | null
  failure_reason?: string | null
}
