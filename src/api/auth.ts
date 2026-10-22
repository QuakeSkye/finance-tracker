import { http } from './http'

export interface LoginResponse {
  success: boolean
  username: string
}

export interface UserInfo {
  id: number
  username: string
  last_login_at: string | null
}

export const authApi = {
  async login(username: string, password: string): Promise<LoginResponse> {
    const { data } = await http.post<LoginResponse>('/auth/login', { username, password })
    return data
  },

  async logout(): Promise<void> {
    await http.post('/auth/logout')
  },

  async me(): Promise<UserInfo> {
    const { data } = await http.get<UserInfo>('/auth/me')
    return data
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await http.patch('/auth/password', { old_password: oldPassword, new_password: newPassword })
  }
}
