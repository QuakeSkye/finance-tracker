<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ledgerApi, type LedgerUser } from '../api/ledger'
import { errorText, userLabel } from '../utils/presentation'
const users = ref<LedgerUser[]>([]), loading = ref(false), error = ref('')
async function load() {
  loading.value = true; error.value = ''
  try { users.value = await ledgerApi.list() }
  catch (e) { error.value = errorText(e, '用户账单入口加载失败') }
  finally { loading.value = false }
}
onMounted(load)
</script>
<template>
  <section class="panel p-5 md:p-6">
    <div class="section-heading"><div><h2 class="text-lg font-semibold">选择要查看的账单</h2><p class="mt-2 text-sm text-zinc-500">每个用户独立查看账单与统计，金额和记录不会混合。</p></div><el-button :loading="loading" @click="load">刷新</el-button></div>
    <el-alert v-if="error" :title="error" type="error" :closable="false" class="mb-4" />
    <el-skeleton v-if="loading" :rows="3" animated />
    <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <article v-for="user in users" :key="user.id" class="rounded-xl border border-zinc-200 p-5">
        <div class="flex items-center justify-between"><h3 class="text-lg font-semibold">{{ userLabel(user) }}</h3><el-tag v-if="!user.enabled" type="info">已停用</el-tag></div>
        <p class="my-3 text-sm text-zinc-500">账单明细、收支汇总与交易筛选</p>
        <div class="flex flex-wrap gap-5"><RouterLink :to="'/users/' + user.id + '/bills'" class="action-link">查看账单 →</RouterLink><RouterLink :to="'/users/' + user.id + '/recognition-records'" class="action-link">失败日志</RouterLink></div>
      </article>
    </div>
    <el-empty v-if="!loading && !error && !users.length" description="尚未创建用户"><RouterLink to="/users" class="action-link">前往用户管理</RouterLink></el-empty>
  </section>
</template>
