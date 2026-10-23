<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { http } from '../api/http'
import { ledgerApi, type LedgerUser } from '../api/ledger'
import { errorText, userLabel } from '../utils/presentation'
const users = ref<LedgerUser[]>([])
const status = ref<{ failure_count: number; database_available: boolean } | null>(null)
const error = ref(''), loading = ref(false)
const pending = computed(() => users.value.filter(u => u.enabled && ((u.image_provider !== 'local_ollama' && !u.credential.configured) || !u.token_prefix)))
const failures = ref<Record<number, number | null>>({})
async function load() {
  loading.value = true; error.value = ''
  try {
    const [list, result] = await Promise.all([ledgerApi.list(), http.get('/system/status')])
    users.value = list; status.value = result.data
    failures.value = {}
    await Promise.all(list.map(async u => {
      try { failures.value[u.id] = (await ledgerApi.failures(u.id, {limit: 1})).total }
      catch { failures.value[u.id] = null }
    }))
  } catch(e) { error.value = errorText(e, '首页加载失败，请重试') }
  finally { loading.value = false }
}
onMounted(load)
</script>
<template>
  <div class="grid gap-5">
    <section class="panel p-5 md:p-6">
      <div class="section-heading"><div><p class="text-sm text-zinc-500">iCost Adapter</p><h2 class="mt-2 text-2xl font-semibold">账单与日常管理</h2><p class="mt-2 text-sm text-zinc-500">查看各用户账单，处理识别异常，完成使用配置。</p></div><el-button :loading="loading" @click="load">刷新</el-button></div>
      <el-alert v-if="error" :title="error" type="error" :closable="false" class="mb-4" />
      <div class="grid gap-4 sm:grid-cols-3">
        <RouterLink to="/bills" class="rounded-xl border border-zinc-200 p-5 hover:bg-zinc-50"><p class="text-sm text-zinc-500">独立账单空间</p><strong class="my-2 block text-3xl">{{ error || loading ? '—' : users.length }}</strong><span class="action-link">进入账单 →</span></RouterLink>
        <a href="#home-failures" class="rounded-xl border border-zinc-200 p-5 hover:bg-zinc-50"><p class="text-sm text-zinc-500">近 30 天失败日志</p><strong class="my-2 block text-3xl">{{ error || loading ? '—' : status?.failure_count ?? '—' }}</strong><span class="text-sm text-zinc-500">查看对应用户的原因</span></a>
        <RouterLink to="/users" class="rounded-xl border border-zinc-200 p-5 hover:bg-zinc-50"><p class="text-sm text-zinc-500">待完成凭据配置</p><strong class="my-2 block text-3xl">{{ error || loading ? '—' : pending.length }}</strong><span class="text-sm text-zinc-500">启用用户的 API Key / Token</span></RouterLink>
      </div>
    </section>
    <section class="panel p-5 md:p-6">
      <div class="section-heading"><h2 class="text-lg font-semibold">各用户账单</h2><RouterLink to="/bills" class="action-link">全部账单空间 →</RouterLink></div>
      <el-skeleton v-if="loading && !users.length" :rows="3" animated />
      <div class="grid gap-4 md:grid-cols-2">
        <RouterLink v-for="user in users" :key="user.id" :to="'/users/' + user.id + '/bills'" class="flex items-center justify-between rounded-lg border p-4 hover:bg-zinc-50"><div><h3 class="font-semibold">{{ userLabel(user) }}</h3><p class="mt-1 text-sm text-zinc-500">查看明细、按日期筛选、收支汇总</p></div><span aria-hidden="true">→</span></RouterLink>
      </div>
      <el-empty v-if="!loading && !error && !users.length" description="先创建用户，再开始记录账单" />
    </section>
    <div class="grid gap-5 lg:grid-cols-2">
      <section id="home-failures" class="panel p-5 md:p-6">
        <h2 class="mb-4 text-lg font-semibold">识别异常</h2>
        <p class="mb-3 text-sm text-zinc-500">失败不代表待复核，用户需在 iCost 中手动添加。日志仅用于排错。</p>
        <div v-for="user in users" :key="user.id" class="flex items-center justify-between border-b py-3 last:border-0"><span>{{ userLabel(user) }}</span><RouterLink :to="'/users/' + user.id + '/recognition-records'" class="action-link">{{ failures[user.id] == null ? '查看日志' : failures[user.id] + ' 条失败日志' }} →</RouterLink></div>
      </section>
      <section class="panel p-5 md:p-6">
        <h2 class="mb-4 text-lg font-semibold">配置提醒</h2>
        <div v-for="user in pending" :key="user.id" class="mb-3 rounded-lg bg-amber-50 p-3"><strong class="text-sm">{{ userLabel(user) }}</strong><p class="mt-1 text-sm">{{ [user.image_provider !== 'local_ollama' && !user.credential.configured ? '未配置 DeepSeek Key' : '', !user.token_prefix ? '未签发 Token' : ''].filter(Boolean).join(' · ') }}</p></div>
        <p v-if="!pending.length && !loading && !error" class="mb-3 text-sm text-zinc-600">启用用户的 Key 与 Token 均已配置。</p>
        <p class="mb-4 text-xs text-zinc-500">这里只检查凭据是否配置，不代表模型调用成功；分类、账户与账本仍需对应手机设置。</p>
        <RouterLink to="/users" class="action-link">管理用户与配置 →</RouterLink>
      </section>
    </div>
    <p class="text-xs text-zinc-500">数据库：{{ error ? '未知' : status === null ? '加载中' : status.database_available ? '已连接' : '连接异常' }} · 成功账单保留，截图与识别原文不保存。实际入账结果以手机 iCost 为准。</p>
  </div>
</template>
