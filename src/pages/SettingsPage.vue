<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { http } from '../api/http'
import { authApi } from '../api/auth'
import { errorText } from '../utils/presentation'

const settings = ref<{ model: string; upload_max_size_bytes: number } | null>(null)
const settingsError = ref('')
const loading = ref(false)
const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const message = ref('')
const error = ref('')
const busy = ref(false)
async function load() {
  loading.value = true
  settingsError.value = ''
  try { settings.value = (await http.get('/settings')).data }
  catch (e) { settingsError.value = errorText(e, '运行配置加载失败，请重试。') }
  finally { loading.value = false }
}
async function changePassword() {
  if (busy.value) return
  error.value = ''
  message.value = ''
  if (!oldPassword.value || newPassword.value.length < 6 || newPassword.value.length > 128) {
    error.value = '请填写当前密码，新密码长度应为 6 至 128 个字符。'
    return
  }
  if (newPassword.value !== confirmPassword.value) { error.value = '两次输入的新密码不一致。'; return }
  busy.value = true
  try {
    await authApi.changePassword(oldPassword.value, newPassword.value)
    oldPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    message.value = '管理员密码已修改。'
  } catch (e) { error.value = errorText(e, '密码修改失败，请重试。') }
  finally { busy.value = false }
}
onMounted(load)
</script>
<template>
  <div class="grid gap-4">
    <section class="panel p-4 md:p-5">
      <div class="section-heading"><h2 class="text-lg font-semibold">运行配置</h2><el-button :loading="loading" @click="load">刷新</el-button></div>
      <el-alert v-if="settingsError" :title="settingsError" type="error" :closable="false" show-icon class="mb-4"><el-button text @click="load">重新加载</el-button></el-alert>
      <el-descriptions border :column="1">
        <el-descriptions-item label="识别引擎">DeepSeek · {{ settings?.model || '—' }}</el-descriptions-item>
        <el-descriptions-item label="上传大小限制">{{ settings ? settings.upload_max_size_bytes / 1024 / 1024 : '—' }} MB</el-descriptions-item>
        <el-descriptions-item label="数据保留">保存结构化账单用于统计；不保存图片、识别原文和成功运行日志；失败日志保留 30 天。</el-descriptions-item>
        <el-descriptions-item label="本地识别引擎">未启用</el-descriptions-item>
        <el-descriptions-item label="调用次数限制">不设置次数配额</el-descriptions-item>
        <el-descriptions-item label="用户凭证"><RouterLink to="/users">进入用户管理配置 API Key 和 Token</RouterLink></el-descriptions-item>
      </el-descriptions>
    </section>
    <section class="panel p-4 md:p-5">
      <h2 class="mb-4 text-lg font-semibold">管理员密码</h2>
      <el-form label-position="top" class="max-w-xl" :disabled="busy" @submit.prevent="changePassword">
        <el-form-item label="当前密码" for="current-password"><el-input id="current-password" v-model="oldPassword" type="password" autocomplete="current-password" /></el-form-item>
        <el-form-item label="新密码" for="new-password"><el-input id="new-password" v-model="newPassword" type="password" autocomplete="new-password" maxlength="128" /><p class="field-help">长度为 6 至 128 个字符。</p></el-form-item>
        <el-form-item label="确认新密码" for="confirm-password"><el-input id="confirm-password" v-model="confirmPassword" type="password" autocomplete="new-password" maxlength="128" /></el-form-item>
        <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon class="mb-4" />
        <el-alert v-if="message" :title="message" type="success" :closable="false" show-icon class="mb-4" />
        <el-button type="primary" :loading="busy" native-type="submit">修改密码</el-button>
      </el-form>
    </section>
  </div>
</template>
