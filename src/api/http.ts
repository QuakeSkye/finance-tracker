import axios, { AxiosError } from 'axios'

// 使用相对路径 /api/v1，通过 Vite 代理转发到后端
const apiBaseURL = '/api/v1'

export const http = axios.create({
  baseURL: apiBaseURL,
  timeout: 20000
})

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ detail?: string }>) => {
    const message = error.response?.data?.detail ?? error.message ?? '请求失败'
    return Promise.reject(new Error(message))
  }
)
