import { http } from './http'

export interface SettingsInfo {
  api_base_url: string
  ocr_base_url: string
  ocr_model: string
  upload_max_size_bytes: number
  upload_retention_days: number
  save_original_uploads: boolean
  account_unmatched_requires_review: boolean
  default_preferred_action: string
  session_cookie_secure: boolean
  shortcut_token_prefix: string | null
}

export interface SettingsUpdatePayload {
  ocr_base_url?: string
  ocr_model?: string
  upload_max_size_bytes?: number
  upload_retention_days?: number
  save_original_uploads?: boolean
  account_unmatched_requires_review?: boolean
  default_preferred_action?: string
}

export interface TokenResetResponse {
  success: boolean
  token: string
  token_prefix: string
}

export interface ImageProviderInfo {
  id: number
  provider_key: string
  display_name: string
  provider_type: string
  api_format: string
  base_url: string
  endpoint_path: string | null
  model: string
  auth_header_name: string | null
  auth_scheme: string | null
  secret_ref: string | null
  secret_configured: boolean
  secret_prefix: string | null
  image_input_mode: string
  max_image_bytes: number | null
  max_completion_tokens: number | null
  temperature: number | null
  timeout_seconds: number | null
  enabled: boolean
  can_enable: boolean
  is_builtin: boolean
  created_at: string
  updated_at: string
}

export interface ImageProviderSettings {
  providers: ImageProviderInfo[]
  active_image_provider_key: string
  image_provider_fallback_enabled: boolean
  fallback_image_provider_key: string
}

export interface ImageProviderUpdatePayload {
  display_name?: string
  base_url?: string
  endpoint_path?: string | null
  model?: string
  image_input_mode?: string
  max_image_bytes?: number | null
  max_completion_tokens?: number | null
  temperature?: number | null
  timeout_seconds?: number | null
  enabled?: boolean
}

export interface ActiveImageProviderPayload {
  provider_key: string
  fallback_enabled: boolean
  fallback_provider_key: string
}

export interface ImageProviderTestResponse {
  success: boolean
  provider_key: string
  model: string | null
  latency_ms: number | null
  usage: Record<string, unknown> | null
  preview_text: string | null
  parsed_json_preview: Record<string, unknown> | null
  error_code: string | null
  message: string | null
}

export const settingsApi = {
  async get(): Promise<SettingsInfo> {
    const { data } = await http.get<SettingsInfo>('/settings')
    return data
  },

  async update(payload: SettingsUpdatePayload): Promise<SettingsInfo> {
    const { data } = await http.patch<SettingsInfo>('/settings', payload)
    return data
  },

  async resetShortcutToken(): Promise<TokenResetResponse> {
    const { data } = await http.post<TokenResetResponse>('/settings/shortcut-token/reset')
    return data
  },

  async getImageProviders(): Promise<ImageProviderSettings> {
    const { data } = await http.get<ImageProviderSettings>('/settings/image-providers')
    return data
  },

  async updateImageProvider(providerKey: string, payload: ImageProviderUpdatePayload): Promise<ImageProviderSettings> {
    const { data } = await http.patch<ImageProviderSettings>(`/settings/image-providers/${providerKey}`, payload)
    return data
  },

  async updateActiveImageProvider(payload: ActiveImageProviderPayload): Promise<ImageProviderSettings> {
    const { data } = await http.patch<ImageProviderSettings>('/settings/image-provider/active', payload)
    return data
  },

  async testImageProvider(providerKey: string, testType: 'connection' | 'image', file?: File): Promise<ImageProviderTestResponse> {
    const form = new FormData()
    form.append('test_type', testType)
    if (file) {
      form.append('file', file)
    }
    const { data } = await http.post<ImageProviderTestResponse>(`/settings/image-providers/${providerKey}/test`, form)
    return data
  }
}
