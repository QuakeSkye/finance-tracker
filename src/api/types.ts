export type Direction = 'expense' | 'income'
export type ICostMappingType = 'category' | 'account' | 'book' | 'tag' | 'currency'
export type ICostTransactionType = 'expense' | 'income' | 'transfer' | 'any'
export type ICostMatchMode = 'contains' | 'equals' | 'regex'
export type RecognitionInputType = 'image' | 'text'
export type RecognitionStatus =
  | 'received'
  | 'recognized'
  | 'payload_generated'
  | 'delivered_to_shortcut'
  | 'created_in_icost'
  | 'failed'
export type RecognitionTransactionType = 'expense' | 'income' | 'transfer' | 'unknown'

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

export interface ICostMapping {
  id: number
  mapping_type: ICostMappingType
  transaction_type: ICostTransactionType
  local_value: string | null
  icost_value: string
  match_keywords: string[]
  match_mode: ICostMatchMode
  priority: number
  enabled: boolean
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface ICostMappingListResponse {
  items: ICostMapping[]
}

export interface ICostMappingPayload {
  mapping_type: ICostMappingType
  transaction_type: ICostTransactionType
  local_value: string | null
  icost_value: string
  match_keywords: string[]
  match_mode: ICostMatchMode
  priority: number
  enabled: boolean
  is_default: boolean
}

export interface RecognitionRecord {
  id: number
  request_id: string | null
  input_type: RecognitionInputType
  source_filename: string | null
  stored_file_path: string | null
  source_hash: string | null
  mime_type: string | null
  file_size_bytes: number | null
  raw_input_text: string | null
  ocr_raw_text: string | null
  model_raw_result: string | null
  parsed_json: string | null
  transaction_type: RecognitionTransactionType
  amount: string | null
  currency: string | null
  merchant: string | null
  category: string | null
  account: string | null
  from_account: string | null
  to_account: string | null
  book: string | null
  date: string | null
  time: string | null
  remark: string | null
  tag: string | null
  discount: string | null
  fee: string | null
  confidence: string | null
  need_review: boolean
  review_reason: string | null
  status: RecognitionStatus
  error_code: string | null
  failure_reason: string | null
  icost_payload: Record<string, unknown> | null
  icost_url: string | null
  preferred_action: 'shortcut_action' | 'url_scheme' | null
  shortcut_callback_status: string | null
  image_provider_key: string | null
  image_provider_type: string | null
  image_model: string | null
  image_provider_request_id: string | null
  image_provider_latency_ms: number | null
  image_provider_usage_json: string | null
  image_provider_raw_response_json: string | null
  image_provider_reasoning_content_present: boolean | null
  image_provider_reasoning_tokens: number | null
  image_provider_cached_tokens: number | null
  image_provider_image_tokens: number | null
  image_provider_error_code: string | null
  image_provider_error_message: string | null
  created_at: string
  updated_at: string
}

export interface RecognitionRecordListResponse {
  items: RecognitionRecord[]
  total: number
  limit: number
  offset: number
}

export interface RecognitionRecordDetail extends RecognitionRecord {
  events: SystemEvent[]
}

export interface RecognitionRecordUpdatePayload {
  transaction_type?: RecognitionTransactionType
  amount?: string | null
  currency?: string | null
  merchant?: string | null
  category?: string | null
  account?: string | null
  from_account?: string | null
  to_account?: string | null
  book?: string | null
  date?: string | null
  time?: string | null
  remark?: string | null
  tag?: string | null
  discount?: string | null
  fee?: string | null
  need_review?: boolean
  review_reason?: string | null
}

export interface OcrRecord {
  id: number
  request_id: string | null
  input_type: 'image' | 'text'
  source_filename: string | null
  stored_file_path: string | null
  source_hash: string | null
  mime_type: string | null
  file_size_bytes: number | null
  raw_input_text: string | null
  ocr_raw_text: string | null
  model_raw_result: string | null
  parsed_json: string | null
  transaction_type: 'expense' | 'income' | 'transfer' | 'unknown'
  amount: string | null
  currency: string | null
  merchant: string | null
  category: string | null
  account: string | null
  from_account: string | null
  to_account: string | null
  book: string | null
  date: string | null
  time: string | null
  remark: string | null
  tag: string | null
  discount: string | null
  fee: string | null
  confidence: string | null
  need_review: boolean
  review_reason: string | null
  status: 'received' | 'recognized' | 'payload_generated' | 'delivered_to_shortcut' | 'created_in_icost' | 'failed'
  error_code: string | null
  failure_reason: string | null
  icost_payload: string | null
  icost_url: string | null
  preferred_action: 'shortcut_action' | 'url_scheme' | null
  shortcut_callback_status: string | null
  created_at: string
  updated_at: string
}

export interface ServiceStatus {
  available: boolean
  message: string
}

export interface SystemRecentRecord {
  id: number
  input_type: RecognitionInputType
  transaction_type: RecognitionTransactionType
  amount: string | null
  currency: string | null
  merchant: string | null
  category: string | null
  account: string | null
  status: RecognitionStatus
  need_review: boolean
  failure_reason: string | null
  image_provider_key: string | null
  image_model: string | null
  created_at: string
}

export interface SystemStatus {
  ocr: ServiceStatus
  image_provider: ServiceStatus
  active_image_provider_key: string
  active_image_provider_model: string | null
  active_image_provider_type: string | null
  database: ServiceStatus
  tunnel_hint: string
  last_success_time: string | null
  recent_failure_reason: string | null
  processed_record_count: number
  failed_record_count: number
  today_recognition_count: number
  today_payload_generated_count: number
  today_need_review_count: number
  today_created_in_icost_count: number
  recent_records: SystemRecentRecord[]
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
