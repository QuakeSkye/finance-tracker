<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const username = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

async function handleLogin() {
  if (!username.value || !password.value) {
    errorMsg.value = '请输入用户名和密码'
    return
  }
  loading.value = true
  errorMsg.value = ''
  try {
    await auth.login(username.value, password.value)
    const redirect = route.query.redirect
    const target = typeof redirect === 'string' && /^\/(?:bills|users(?:\/[1-9]\d*\/(?:bills(?:\/[1-9]\d*)?|recognition-records(?:\/[1-9]\d*)?|mappings))?)(?:\?.*)?$/.test(redirect)
      ? redirect
      : '/'
    await router.replace(target)
  } catch {
    errorMsg.value = auth.error || '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
    <div class="panel w-full max-w-sm p-8">
      <h1 class="display-font mb-1 text-2xl font-bold">iCost Adapter</h1>
      <p class="mb-6 text-sm text-zinc-500">本地 AI 识别网关 · 管理后台</p>

      <el-form @submit.prevent="handleLogin" label-position="top">
        <el-form-item label="用户名">
          <el-input v-model="username" placeholder="admin" autofocus />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="password" type="password" placeholder="请输入密码" show-password />
        </el-form-item>

        <p v-if="errorMsg" class="mb-3 text-sm text-red-500">{{ errorMsg }}</p>

        <el-button
          type="primary"
          :loading="loading"
          class="w-full"
          @click="handleLogin"
        >
          登录
        </el-button>
      </el-form>
    </div>
  </div>
</template>
