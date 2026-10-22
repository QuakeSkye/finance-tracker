import axios, { AxiosError } from 'axios'

const apiBaseURL = '/api/v1'

const messages: Record<string, string> = {
  ADMIN_AUTH_REQUIRED: '登录状态已失效，请重新登录。',
  RECORD_NOT_FOUND: '记录不存在、已到期或不属于当前用户。',
  LEDGER_USER_NOT_FOUND: '用户不存在或无访问权限。',
  NAME_REQUIRED: '请输入用户名称。',
  TOKEN_ROTATION_CONFLICT: 'Token 正在更新，请稍后重试。'
}

export const http = axios.create({
  baseURL: apiBaseURL,
  headers: { 'X-CSRF-Protection': '1' },
  timeout: 20000
})

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ detail?: string }>) => {
    if (error.response?.status === 401) {
      const url = error.config?.url ?? ''
      const isAuthProbe = url.includes('/auth/login') || url.includes('/auth/me')
      if (!isAuthProbe && window.location.pathname !== '/login') {
        const redirect = window.location.pathname + window.location.search
        window.location.assign(`/login?redirect=${encodeURIComponent(redirect)}`)
        return Promise.reject(new Error(messages.ADMIN_AUTH_REQUIRED))
      }
    }
    const detail: unknown = error.response?.data?.detail
    const message = typeof detail === 'string'
      ? messages[detail] ?? (/^[A-Z][A-Z0-9_]+$/.test(detail) ? '操作失败，请核对配置后重试。' : detail)
      : error.response?.status === 422 ? '提交内容不符合要求，请检查表单。'
      : error.code === 'ECONNABORTED' ? '请求超时，请重试。'
      : !error.response ? '无法连接服务，请检查网络后重试。' : '操作失败，请稍后重试。'
    return Promise.reject(new Error(message))
  }
)
