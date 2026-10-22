<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { http } from '../api/http'
import { ledgerApi } from '../api/ledger'
import { userLabel, errorText } from '../utils/presentation'
interface Bill { id: number; ledger_user_id: number; amount: string; currency: string | null; transaction_type: string; merchant: string | null; category: string | null; account: string | null; from_account: string | null; to_account: string | null; book: string | null; date: string | null; time: string | null; remark: string | null; tag: string | null; fee: string | null; discount: string | null; status: string }
interface Total { currency: string | null; expense: string; income: string; transfer: string }
const route = useRoute(), router = useRouter()
const name = ref(''), items = ref<Bill[]>([]), totals = ref<Total[]>([]), total = ref(0), page = ref(1)
const busy = ref(false), error = ref(''), detailError = ref(''), detail = ref<Bill | null>(null)
const from = ref(''), to = ref(''), type = ref(''), query = ref('')
let generation = 0, detailGeneration = 0
let applied: Record<string, string | undefined> = {}
const uid = () => Number(route.params.userId)
const label = (v: string) => ({ expense: '支出', income: '收入', transfer: '转账' }[v] || v)
async function load() {
  const user = uid(), run = ++generation
  busy.value = true; error.value = ''
  try {
    const [u, response] = await Promise.all([ledgerApi.get(user), http.get<{items: Bill[]; total: number; totals: Total[]}>(`/ledger-users/${user}/bills`, { params: { limit: 20, offset: (page.value - 1) * 20, ...applied } })])
    if (run !== generation) return
    name.value = userLabel(u); items.value = response.data.items; total.value = response.data.total; totals.value = response.data.totals
  } catch (e) { if (run === generation) { error.value = errorText(e, '账单加载失败'); items.value = []; totals.value = []; total.value = 0 } }
  finally { if (run === generation) busy.value = false }
}
function search() {
  if (from.value && to.value && from.value > to.value) { error.value = '开始日期不能晚于结束日期'; return }
  applied = { date_from: from.value || undefined, date_to: to.value || undefined, transaction_type: type.value || undefined, q: query.value.trim() || undefined }
  page.value = 1; void load()
}
async function loadDetail() {
  const run = ++detailGeneration
  detail.value = null; detailError.value = ''
  if (!route.params.billId) return
  if (!/^[1-9]\d*$/.test(String(route.params.billId))) { detailError.value = '账单编号无效'; return }
  try {
    const response = await http.get<Bill>(`/ledger-users/${uid()}/bills/${route.params.billId}`)
    if (run === detailGeneration) detail.value = response.data
  } catch (e) { if (run === detailGeneration) detailError.value = errorText(e, '账单不存在或无法访问') }
}
function close() { void router.replace(`/users/${uid()}/bills`) }
watch(() => route.params.userId, () => {
  ++generation; ++detailGeneration
  name.value = ''; items.value = []; totals.value = []; total.value = 0; page.value = 1
  detail.value = null; detailError.value = ''; applied = {}; from.value = ''; to.value = ''; type.value = ''; query.value = ''
  void load()
}, { immediate: true })
watch(() => [route.params.userId, route.params.billId], loadDetail, { immediate: true })
onBeforeUnmount(() => { ++generation; ++detailGeneration })
</script>
<template>
  <section class="panel p-4 md:p-5">
    <div class="section-heading">
      <div><h2 class="text-lg font-semibold">{{ name || '用户 ' + uid() }} · 账单</h2><p class="mt-1 text-sm text-zinc-500">成功识别的结构化账单长期保留，供统计和图表使用；不代表手机已确认入账。</p></div>
      <div class="flex gap-3"><RouterLink :to="'/users/' + uid() + '/recognition-records'" class="action-link">失败日志</RouterLink><el-button :loading="busy" @click="load">刷新</el-button></div>
    </div>
    <el-form label-position="top" class="flex flex-wrap items-end gap-3" @submit.prevent="search">
      <el-form-item label="开始日期"><input v-model="from" type="date" class="date-input" /></el-form-item>
      <el-form-item label="结束日期"><input v-model="to" type="date" class="date-input" /></el-form-item>
      <el-form-item label="类型"><el-select v-model="type" clearable placeholder="全部" style="width: 130px"><el-option label="支出" value="expense" /><el-option label="收入" value="income" /><el-option label="转账" value="transfer" /></el-select></el-form-item>
      <el-form-item label="商家或备注"><el-input v-model="query" clearable /></el-form-item>
      <el-form-item><el-button native-type="submit" :loading="busy">查询</el-button></el-form-item>
    </el-form>
    <el-alert v-if="error" :title="error" type="error" :closable="false" class="mb-4" />
    <div v-for="sum in totals" :key="sum.currency || 'unknown'" class="mb-3 rounded border p-3 text-sm">
      {{ sum.currency || '未标注币种' }} · 支出 {{ sum.expense }} · 收入 {{ sum.income }} · 转账 {{ sum.transfer }}
    </div>
    <p class="mb-3 text-xs text-zinc-500">汇总覆盖当前筛选的全部账单，按币种分开；转账不计入收支。</p>
    <el-table v-loading="busy" :data="items" scrollbar-always-on empty-text="此用户暂无符合条件的账单">
      <el-table-column prop="date" label="交易日期" width="125" />
      <el-table-column label="类型" width="80"><template #default="{ row }">{{ label(row.transaction_type) }}</template></el-table-column>
      <el-table-column label="金额" min-width="125"><template #default="{ row }">{{ row.currency }} {{ row.amount }}</template></el-table-column>
      <el-table-column prop="merchant" label="商家" min-width="140" show-overflow-tooltip />
      <el-table-column prop="category" label="分类" min-width="110" />
      <el-table-column label="账户" min-width="170"><template #default="{ row }">{{ row.transaction_type === 'transfer' ? (row.from_account || '-') + ' → ' + (row.to_account || '-') : row.account }}</template></el-table-column>
      <el-table-column prop="book" label="账本" min-width="110" />
      <el-table-column prop="remark" label="备注" min-width="180" show-overflow-tooltip />
      <el-table-column label="操作" width="85"><template #default="{ row }"><el-button text @click="router.push('/users/' + uid() + '/bills/' + row.id)">详情</el-button></template></el-table-column>
    </el-table>
    <div class="pagination-row"><span>共 {{ total }} 条</span><el-pagination v-model:current-page="page" :page-size="20" :total="total" layout="prev, pager, next" :disabled="busy" @current-change="load" /></div>
    <el-drawer :model-value="Boolean(route.params.billId)" :title="(name || '用户 ' + uid()) + ' · 账单详情'" size="min(600px, 100vw)" @close="close">
      <el-descriptions v-if="detail" :column="1" border>
        <el-descriptions-item label="编号">#{{ detail.id }}</el-descriptions-item>
        <el-descriptions-item label="金额">{{ detail.currency }} {{ detail.amount }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ label(detail.transaction_type) }}</el-descriptions-item>
        <el-descriptions-item label="商家">{{ detail.merchant }}</el-descriptions-item>
        <el-descriptions-item label="分类">{{ detail.category }}</el-descriptions-item>
        <el-descriptions-item label="日期时间">{{ detail.date }} {{ detail.time }}</el-descriptions-item>
        <el-descriptions-item label="账本">{{ detail.book }}</el-descriptions-item>
        <el-descriptions-item label="账户">{{ detail.account || '-' }} {{ detail.from_account ? detail.from_account + ' → ' + detail.to_account : '' }}</el-descriptions-item>
        <el-descriptions-item label="备注">{{ detail.remark }}</el-descriptions-item>
        <el-descriptions-item label="标签">{{ detail.tag }}</el-descriptions-item>
        <el-descriptions-item label="优惠 / 手续费">{{ detail.discount || '0' }} / {{ detail.fee || '0' }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ detail.status === 'created_in_icost' ? '历史手机确认' : '已生成参数 / 已下发，手机入账未确认' }}</el-descriptions-item>
      </el-descriptions>
      <el-alert v-else-if="detailError" :title="detailError" type="error" :closable="false" />
      <el-skeleton v-else :rows="5" animated />
    </el-drawer>
  </section>
</template>
