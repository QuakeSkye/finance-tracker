<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ledgerApi, type Failure } from '../api/ledger'
import { errorText, isDismissed, userLabel } from '../utils/presentation'

const route = useRoute()
const router = useRouter()
const userName = ref('')
const items = ref<Failure[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const code = ref('')
const dateFrom = ref('')
const dateTo = ref('')
const busy = ref(false)
const error = ref('')
const filterError = ref('')
const detailError = ref('')
const detail = ref<Failure | null>(null)
const deleting = ref(new Set<number>())
let request = 0
let detailRequest = 0
let appliedFilters: Record<string, string | undefined> = {}
function userId() { return Number(route.params.userId) }
function timeText(value: string) {
  return new Date(/[zZ]|[+-]\d\d:\d\d$/.test(value) ? value : value + 'Z')
    .toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })
}
async function load() {
  const id = userId()
  const generation = ++request
  busy.value = true
  error.value = ''
  try {
    const [user, result] = await Promise.all([ledgerApi.get(id), ledgerApi.failures(id, {
      limit: pageSize.value, offset: (page.value - 1) * pageSize.value, ...appliedFilters
    })])
    if (generation !== request) return
    userName.value = userLabel(user)
    items.value = result.items
    total.value = result.total
    const lastPage = Math.max(1, Math.ceil(result.total / pageSize.value))
    if (page.value > lastPage) { page.value = lastPage; void load() }
  } catch (e) {
    if (generation === request) { items.value = []; error.value = errorText(e, '失败记录加载失败，请重试。') }
  } finally { if (generation === request) busy.value = false }
}
async function loadDetail() {
  const generation = ++detailRequest
  detail.value = null
  detailError.value = ''
  if (!route.params.failureId) return
  try {
    const value = await ledgerApi.failure(userId(), Number(route.params.failureId))
    if (generation === detailRequest) detail.value = value
  } catch (e) {
    if (generation === detailRequest) detailError.value = errorText(e, '失败记录详情加载失败，请重试。')
  }
}
function filter() {
  filterError.value = ''
  if (dateFrom.value && dateTo.value && dateFrom.value > dateTo.value) {
    filterError.value = '开始日期不能晚于结束日期。'
    return
  }
  appliedFilters = { error_code: code.value.trim() || undefined, date_from: dateFrom.value || undefined, date_to: dateTo.value || undefined }
  page.value = 1
  void load()
}
function resetFilters() {
  code.value = ''
  dateFrom.value = ''
  dateTo.value = ''
  filter()
}
function changePageSize() { page.value = 1; void load() }
function close() { void router.replace('/users/' + userId() + '/recognition-records') }
async function remove(row: Failure) {
  if (deleting.value.has(row.id)) return
  const id = userId()
  try {
    await ElMessageBox.confirm('删除失败记录 #' + row.id + ' 后无法恢复。此操作不会修改手机中的 iCost 账单。', '删除失败记录', {
      type: 'warning', confirmButtonText: '删除记录', cancelButtonText: '取消'
    })
    deleting.value.add(row.id)
    await ledgerApi.removeFailure(id, row.id)
    ElMessage.success('失败记录已删除')
    if (detail.value?.id === row.id) close()
    await load()
  } catch (e) { if (!isDismissed(e)) error.value = errorText(e, '删除失败，请重试。') }
  finally { deleting.value.delete(row.id) }
}
watch(() => route.params.userId, () => {
  ++detailRequest
  detail.value = null
  userName.value = ''
  items.value = []
  total.value = 0
  page.value = 1
  code.value = ''
  dateFrom.value = ''
  dateTo.value = ''
  appliedFilters = {}
  filterError.value = ''
  void load()
}, { immediate: true })
watch(() => [route.params.userId, route.params.failureId], loadDetail, { immediate: true })
onBeforeUnmount(() => { ++request; ++detailRequest })
</script>

<template>
  <section class="panel p-4 md:p-5">
    <div class="section-heading">
      <div><h2 class="text-lg font-semibold">{{ userName || '用户 ' + String(userId()).padStart(3, '0') }}</h2><p class="mt-1 text-sm text-zinc-500">此页仅展示最近 30 天的失败日志。成功账单请查看该用户的账单页面，手机实际入账以 iCost 为准。</p></div>
      <div class="flex gap-3"><RouterLink :to="'/users/' + userId() + '/bills'" class="action-link">查看账单</RouterLink><el-button :loading="busy" @click="load">刷新</el-button></div>
    </div>
    <el-form class="failure-filters" label-position="top" @submit.prevent="filter">
      <el-form-item label="错误码" for="failure-code"><el-input id="failure-code" v-model="code" clearable placeholder="输入错误码" /></el-form-item>
      <el-form-item label="开始日期" for="failure-date-from"><input id="failure-date-from" v-model="dateFrom" type="date" :max="dateTo || undefined" class="date-input" /></el-form-item>
      <el-form-item label="结束日期" for="failure-date-to"><input id="failure-date-to" v-model="dateTo" type="date" :min="dateFrom || undefined" class="date-input" /></el-form-item>
      <div class="flex gap-2"><el-button :loading="busy" native-type="submit">查询</el-button><el-button :disabled="busy" @click="resetFilters">重置</el-button></div>
    </el-form>
    <el-alert v-if="filterError" :title="filterError" type="warning" :closable="false" class="mb-4" />
    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon class="mb-4"><el-button text @click="load">重新加载</el-button></el-alert>
    <p class="mb-3 text-xs text-zinc-500">窄屏可横向滚动查看完整表格。</p>
    <el-table v-loading="busy" :data="items" scrollbar-always-on class="data-table" :aria-busy="busy">
      <template #empty><div class="table-empty">
        <p>{{ busy ? '正在加载失败记录…' : error ? '失败记录加载失败' : '当前查询范围内没有失败记录' }}</p>
        <el-button v-if="!busy" text @click="error ? load() : resetFilters()">{{ error ? '重新加载' : '重置筛选' }}</el-button>
      </div></template>
      <el-table-column label="时间（北京时间）" min-width="185"><template #default="{ row }">{{ timeText(row.created_at) }}</template></el-table-column>
      <el-table-column prop="error_code" label="错误码" min-width="180" show-overflow-tooltip />
      <el-table-column prop="message" label="原因" min-width="260" show-overflow-tooltip />
      <el-table-column label="操作" width="140"><template #default="{ row }">
        <el-button text size="small" @click="router.push('/users/' + userId() + '/recognition-records/' + row.id)">详情</el-button>
        <el-button text size="small" type="danger" :loading="deleting.has(row.id)" @click="remove(row)">删除</el-button>
      </template></el-table-column>
    </el-table>
    <div class="pagination-row">
      <span class="text-sm text-zinc-500">共 {{ total }} 条</span>
      <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :page-sizes="[20, 50, 100]" :total="total" layout="sizes, prev, pager, next" :pager-count="5" :disabled="busy || Boolean(error)" @current-change="load" @size-change="changePageSize" />
    </div>
    <el-drawer :model-value="Boolean(route.params.failureId)" :title="(userName || '用户 ' + String(userId()).padStart(3, '0')) + ' · 失败详情'" size="min(600px, 100vw)" @close="close">
      <el-descriptions v-if="detail" :column="1" border>
        <el-descriptions-item label="记录编号">#{{ detail.id }}</el-descriptions-item>
        <el-descriptions-item label="时间（北京时间）">{{ timeText(detail.created_at) }}</el-descriptions-item>
        <el-descriptions-item label="原因">{{ detail.message }}</el-descriptions-item>
        <el-descriptions-item label="错误码">{{ detail.error_code }}</el-descriptions-item>
        <el-descriptions-item label="阶段">{{ detail.error_stage }}</el-descriptions-item>
        <el-descriptions-item label="模型">{{ detail.model }}</el-descriptions-item>
        <el-descriptions-item label="耗时">{{ detail.latency_ms === null ? '未记录' : detail.latency_ms + ' ms' }}</el-descriptions-item>
        <el-descriptions-item label="请求编号">{{ detail.request_id }}</el-descriptions-item>
      </el-descriptions>
      <div v-else-if="detailError"><el-alert :title="detailError" type="error" :closable="false" show-icon /><el-button class="mt-4" @click="loadDetail">重新加载详情</el-button></div>
      <el-skeleton v-else :rows="5" animated aria-label="正在加载失败详情" />
    </el-drawer>
  </section>
</template>
