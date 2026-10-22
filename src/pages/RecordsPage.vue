<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

import { recordsApi } from '../api/records'
import type {
  RecognitionInputType,
  RecognitionRecord,
  RecognitionRecordDetail,
  RecognitionStatus,
  RecognitionTransactionType
} from '../api/types'

const statusOptions: Array<{ label: string; value: RecognitionStatus }> = [
  { label: '已接收', value: 'received' },
  { label: '已识别', value: 'recognized' },
  { label: '已生成参数', value: 'payload_generated' },
  { label: '已下发快捷指令', value: 'delivered_to_shortcut' },
  { label: '已写入 iCost', value: 'created_in_icost' },
  { label: '失败', value: 'failed' }
]

const inputTypeOptions: Array<{ label: string; value: RecognitionInputType }> = [
  { label: '图片', value: 'image' },
  { label: '文本', value: 'text' }
]

const records = ref<RecognitionRecord[]>([])
const total = ref(0)
const loading = ref(false)
const detailVisible = ref(false)
const selectedRecord = ref<RecognitionRecordDetail | null>(null)
const detailLoading = ref(false)
const detailError = ref('')
const route = useRoute()
const router = useRouter()
let detailRequest = 0
const updateSaving = ref(false)

const correctionForm = reactive({
  transaction_type: 'expense' as RecognitionTransactionType,
  amount: '',
  currency: '',
  merchant: '',
  category: '',
  account: '',
  from_account: '',
  to_account: '',
  book: '',
  date: '',
  time: '',
  remark: '',
  tag: '',
  discount: '',
  fee: '',
  need_review: false,
  review_reason: ''
})

const filters = reactive<{
  status: RecognitionStatus | ''
  need_review: '' | 'true' | 'false'
  input_type: RecognitionInputType | ''
  q: string
}>({
  status: '',
  need_review: '',
  input_type: '',
  q: ''
})

const page = reactive({
  limit: 50,
  offset: 0
})

const createdCount = computed(() => records.value.filter((item) => item.status === 'created_in_icost').length)
const failedCount = computed(() => records.value.filter((item) => item.status === 'failed').length)
const reviewCount = computed(() => records.value.filter((item) => item.need_review).length)

function statusLabel(value: RecognitionStatus) {
  return statusOptions.find((item) => item.value === value)?.label ?? value
}

function statusType(value: RecognitionStatus) {
  if (value === 'created_in_icost') return 'success'
  if (value === 'failed') return 'danger'
  if (value === 'delivered_to_shortcut' || value === 'payload_generated') return 'warning'
  return 'info'
}

function inputTypeLabel(value: RecognitionInputType) {
  return inputTypeOptions.find((item) => item.value === value)?.label ?? value
}

function txTypeLabel(value: string) {
  const labels: Record<string, string> = {
    expense: '支出',
    income: '收入',
    transfer: '转账',
    unknown: '未知'
  }
  return labels[value] ?? value
}

function providerBadge(providerKey: string | null | undefined) {
  if (providerKey === 'local_ollama') return 'Local'
  if (providerKey === 'deepseek') return 'DeepSeek'
  if (providerKey === 'xiaomi_mimo') return 'MiMo'
  return providerKey || '-'
}

function providerBadgeType(providerKey: string | null | undefined) {
  if (providerKey === 'local_ollama') return 'success'
  if (providerKey === 'xiaomi_mimo') return 'warning'
  return 'info'
}

function accountText(row: RecognitionRecord) {
  if (row.transaction_type === 'transfer') {
    return [row.from_account, row.to_account].filter(Boolean).join(' -> ') || '-'
  }
  return row.account || '-'
}

function formatDateTime(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString('zh-CN')
}

function payloadText(row: RecognitionRecord | null) {
  if (!row?.icost_payload) return ''
  return JSON.stringify(row.icost_payload, null, 2)
}

function parsedJsonText(row: RecognitionRecord | null) {
  if (!row?.parsed_json) return ''
  try {
    return JSON.stringify(JSON.parse(row.parsed_json), null, 2)
  } catch {
    return row.parsed_json
  }
}

function providerUsageText(row: RecognitionRecord | null) {
  if (!row?.image_provider_usage_json) return ''
  try {
    return JSON.stringify(JSON.parse(row.image_provider_usage_json), null, 2)
  } catch {
    return row.image_provider_usage_json
  }
}

function providerRawResponseText(row: RecognitionRecord | null) {
  if (!row?.image_provider_raw_response_json) return ''
  try {
    return JSON.stringify(JSON.parse(row.image_provider_raw_response_json), null, 2)
  } catch {
    return row.image_provider_raw_response_json
  }
}

function mappingText(row: RecognitionRecord | null) {
  if (!row?.icost_payload) return ''
  const fields = ['currency', 'category', 'account', 'from_account', 'to_account', 'book', 'tag']
  const mapped = Object.fromEntries(fields.map((field) => [field, row.icost_payload?.[field] ?? null]))
  return JSON.stringify(mapped, null, 2)
}

function assignCorrectionForm(row: RecognitionRecord) {
  Object.assign(correctionForm, {
    transaction_type: row.transaction_type,
    amount: row.amount ?? '',
    currency: row.currency ?? '',
    merchant: row.merchant ?? '',
    category: row.category ?? '',
    account: row.account ?? '',
    from_account: row.from_account ?? '',
    to_account: row.to_account ?? '',
    book: row.book ?? '',
    date: row.date ?? '',
    time: row.time ?? '',
    remark: row.remark ?? '',
    tag: row.tag ?? '',
    discount: row.discount ?? '',
    fee: row.fee ?? '',
    need_review: row.need_review,
    review_reason: row.review_reason ?? ''
  })
}

async function loadRecords() {
  loading.value = true
  try {
    const result = await recordsApi.list({
      limit: page.limit,
      offset: page.offset,
      status: filters.status || undefined,
      need_review: filters.need_review === '' ? undefined : filters.need_review === 'true',
      input_type: filters.input_type || undefined,
      q: filters.q.trim() || undefined
    })
    records.value = result.items
    total.value = result.total
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '记录加载失败')
  } finally {
    loading.value = false
  }
}

function resetOffsetAndLoad() {
  page.offset = 0
  void loadRecords()
}

function handlePageChange(value: number) {
  page.offset = (value - 1) * page.limit
  void loadRecords()
}

function openDetail(row: RecognitionRecord) {
  void router.push({ name: 'record-detail', params: { id: row.id }, query: route.query })
}

async function loadDetail(id: string) {
  const request = ++detailRequest
  detailVisible.value = true
  detailLoading.value = true
  selectedRecord.value = null
  detailError.value = ''
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
    detailError.value = '记录编号无效，请从记录列表重新选择。'
    detailLoading.value = false
    return
  }
  try {
    const record = await recordsApi.get(Number(id))
    if (request !== detailRequest) return
    selectedRecord.value = record
    assignCorrectionForm(selectedRecord.value)
  } catch (err) {
    if (request !== detailRequest) return
    detailError.value = err instanceof Error && err.message === 'RECORD_NOT_FOUND'
      ? '记录不存在或已删除。'
      : '详情加载失败，请重试。'
  } finally {
    if (request === detailRequest) detailLoading.value = false
  }
}

function closeDetail() {
  if (route.params.id) {
    void router.replace({ name: 'records', query: route.query })
  }
}

watch(() => route.params.id, (id) => {
  if (typeof id === 'string') {
    void loadDetail(id)
  } else {
    ++detailRequest
    detailVisible.value = false
    selectedRecord.value = null
    detailLoading.value = false
    detailError.value = ''
  }
}, { immediate: true })

async function regenerate(row: RecognitionRecord) {
  try {
    const updated = await recordsApi.regeneratePayload(row.id)
    Object.assign(row, updated)
    if (selectedRecord.value?.id === row.id) {
      selectedRecord.value = await recordsApi.get(row.id)
      assignCorrectionForm(selectedRecord.value)
    }
    ElMessage.success(updated.need_review ? '已进入复核' : 'payload 已重新生成')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '重新生成失败')
  }
}

async function saveCorrection() {
  if (!selectedRecord.value) return
  updateSaving.value = true
  try {
    const updated = await recordsApi.update(selectedRecord.value.id, {
      transaction_type: correctionForm.transaction_type,
      amount: correctionForm.amount || null,
      currency: correctionForm.currency || null,
      merchant: correctionForm.merchant || null,
      category: correctionForm.category || null,
      account: correctionForm.account || null,
      from_account: correctionForm.from_account || null,
      to_account: correctionForm.to_account || null,
      book: correctionForm.book || null,
      date: correctionForm.date || null,
      time: correctionForm.time || null,
      remark: correctionForm.remark || null,
      tag: correctionForm.tag || null,
      discount: correctionForm.discount || null,
      fee: correctionForm.fee || null,
      need_review: correctionForm.need_review,
      review_reason: correctionForm.review_reason || null
    })
    const index = records.value.findIndex((item) => item.id === updated.id)
    if (index >= 0) {
      records.value[index] = updated
    }
    selectedRecord.value = await recordsApi.get(updated.id)
    assignCorrectionForm(selectedRecord.value)
    ElMessage.success('记录已保存')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '保存失败')
  } finally {
    updateSaving.value = false
  }
}

async function copyUrl(row: RecognitionRecord) {
  if (!row.icost_url) return
  await navigator.clipboard.writeText(row.icost_url)
  ElMessage.success('iCost URL 已复制')
}

function openIcostUrl(row: RecognitionRecord) {
  if (!row.icost_url) return
  window.location.href = row.icost_url
}

async function removeRecord(row: RecognitionRecord) {
  try {
    await ElMessageBox.confirm(`删除识别记录 #${row.id}？`, '确认删除', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
    await recordsApi.remove(row.id)
    if (String(route.params.id) === String(row.id)) closeDetail()
    ElMessage.success('记录已删除')
    await loadRecords()
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error(err instanceof Error ? err.message : '删除失败')
    }
  }
}

onMounted(() => {
  void loadRecords()
})
</script>

<template>
  <div class="grid gap-4">
    <section class="panel p-5 md:p-6">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.2em] text-zinc-500">Recognition Records</p>
          <h2 class="display-font mt-2 text-3xl font-bold leading-tight">识别记录</h2>
        </div>
        <div class="grid gap-3 sm:grid-cols-4 xl:w-[680px]">
          <div class="rounded-lg border border-zinc-200 bg-white/75 px-4 py-3">
            <p class="text-xs text-zinc-500">当前页</p>
            <p class="mt-1 text-2xl font-bold text-ink">{{ records.length }}</p>
          </div>
          <div class="rounded-lg border border-zinc-200 bg-white/75 px-4 py-3">
            <p class="text-xs text-zinc-500">已写入</p>
            <p class="mt-1 text-2xl font-bold text-emerald-700">{{ createdCount }}</p>
          </div>
          <div class="rounded-lg border border-zinc-200 bg-white/75 px-4 py-3">
            <p class="text-xs text-zinc-500">失败</p>
            <p class="mt-1 text-2xl font-bold text-rose-700">{{ failedCount }}</p>
          </div>
          <div class="rounded-lg border border-zinc-200 bg-white/75 px-4 py-3">
            <p class="text-xs text-zinc-500">复核</p>
            <p class="mt-1 text-2xl font-bold text-amber-700">{{ reviewCount }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="panel p-4 md:p-5">
      <div class="mb-4 grid gap-3 xl:grid-cols-[160px_160px_160px_1fr_auto] xl:items-center">
        <el-select v-model="filters.status" clearable placeholder="状态" @change="resetOffsetAndLoad">
          <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-select v-model="filters.need_review" clearable placeholder="复核" @change="resetOffsetAndLoad">
          <el-option label="需要复核" value="true" />
          <el-option label="无需复核" value="false" />
        </el-select>
        <el-select v-model="filters.input_type" clearable placeholder="输入类型" @change="resetOffsetAndLoad">
          <el-option v-for="item in inputTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-input v-model="filters.q" clearable placeholder="搜索商家、备注、OCR 文本" @keyup.enter="resetOffsetAndLoad" />
        <el-button :loading="loading" @click="resetOffsetAndLoad">刷新</el-button>
      </div>

      <el-table :data="records" v-loading="loading" stripe>
        <el-table-column label="时间" min-width="170">
          <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="输入" width="76">
          <template #default="{ row }">{{ inputTypeLabel(row.input_type) }}</template>
        </el-table-column>
        <el-table-column label="类型" width="76">
          <template #default="{ row }">{{ txTypeLabel(row.transaction_type) }}</template>
        </el-table-column>
        <el-table-column label="金额" width="110">
          <template #default="{ row }">{{ row.amount || '-' }} {{ row.currency || '' }}</template>
        </el-table-column>
        <el-table-column prop="merchant" label="商家" min-width="140" show-overflow-tooltip />
        <el-table-column prop="category" label="分类" min-width="110" show-overflow-tooltip />
        <el-table-column label="引擎" width="96">
          <template #default="{ row }">
            <el-tag v-if="row.image_provider_key" :type="providerBadgeType(row.image_provider_key)" effect="plain">
              {{ providerBadge(row.image_provider_key) }}
            </el-tag>
            <span v-else class="text-zinc-400">-</span>
          </template>
        </el-table-column>
        <el-table-column label="账户" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">{{ accountText(row) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="128">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" effect="plain">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="复核" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.need_review" type="warning" effect="plain">是</el-tag>
            <span v-else class="text-zinc-400">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="shortcut_callback_status" label="回调" min-width="150" show-overflow-tooltip />
        <el-table-column prop="failure_reason" label="失败原因" min-width="180" show-overflow-tooltip />
        <el-table-column label="操作" fixed="right" width="250">
          <template #default="{ row }">
            <el-button text size="small" @click="openDetail(row)">详情</el-button>
            <el-button text size="small" @click="regenerate(row)">重生成</el-button>
            <el-button text size="small" :disabled="!row.icost_url" @click="copyUrl(row)">复制 URL</el-button>
            <el-button text size="small" :disabled="!row.icost_url" @click="openIcostUrl(row)">打开</el-button>
            <el-button text size="small" type="danger" @click="removeRecord(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="mt-4 flex justify-end">
        <el-pagination
          layout="prev, pager, next, total"
          :total="total"
          :page-size="page.limit"
          :current-page="Math.floor(page.offset / page.limit) + 1"
          @current-change="handlePageChange"
        />
      </div>
    </section>
  </div>

  <el-drawer v-model="detailVisible" title="记录详情" size="min(720px, 100vw)" @close="closeDetail">
    <el-alert v-if="detailError" :title="detailError" type="error" :closable="false" show-icon />
    <el-button v-if="detailError" class="mt-3" @click="loadDetail(String(route.params.id))">重试</el-button>
    <template v-if="selectedRecord">
      <div v-loading="detailLoading" class="grid gap-4">
        <section class="rounded-lg border border-zinc-200 bg-white/80 p-4">
          <div class="mb-3 flex items-center justify-between">
            <h3 class="text-sm font-bold uppercase tracking-[0.16em] text-zinc-500">手动修正</h3>
            <div class="flex gap-2">
              <el-button size="small" :loading="updateSaving" @click="saveCorrection">保存</el-button>
              <el-button size="small" type="primary" @click="regenerate(selectedRecord)">重新生成 payload</el-button>
            </div>
          </div>
          <el-form label-position="top" class="grid gap-x-3 md:grid-cols-3">
            <el-form-item label="交易类型">
              <el-select v-model="correctionForm.transaction_type">
                <el-option label="支出" value="expense" />
                <el-option label="收入" value="income" />
                <el-option label="转账" value="transfer" />
                <el-option label="未知" value="unknown" />
              </el-select>
            </el-form-item>
            <el-form-item label="金额">
              <el-input v-model="correctionForm.amount" />
            </el-form-item>
            <el-form-item label="货币">
              <el-input v-model="correctionForm.currency" />
            </el-form-item>
            <el-form-item label="商家">
              <el-input v-model="correctionForm.merchant" />
            </el-form-item>
            <el-form-item label="分类">
              <el-input v-model="correctionForm.category" />
            </el-form-item>
            <el-form-item label="账户">
              <el-input v-model="correctionForm.account" />
            </el-form-item>
            <el-form-item label="转出账户">
              <el-input v-model="correctionForm.from_account" />
            </el-form-item>
            <el-form-item label="转入账户">
              <el-input v-model="correctionForm.to_account" />
            </el-form-item>
            <el-form-item label="账本">
              <el-input v-model="correctionForm.book" />
            </el-form-item>
            <el-form-item label="日期">
              <el-date-picker v-model="correctionForm.date" value-format="YYYY-MM-DD" class="w-full" />
            </el-form-item>
            <el-form-item label="时间">
              <el-time-picker v-model="correctionForm.time" value-format="HH:mm" format="HH:mm" class="w-full" />
            </el-form-item>
            <el-form-item label="标签">
              <el-input v-model="correctionForm.tag" />
            </el-form-item>
            <el-form-item label="优惠">
              <el-input v-model="correctionForm.discount" />
            </el-form-item>
            <el-form-item label="手续费">
              <el-input v-model="correctionForm.fee" />
            </el-form-item>
            <el-form-item label="复核">
              <el-switch v-model="correctionForm.need_review" active-text="需要" inactive-text="不需要" />
            </el-form-item>
            <el-form-item label="备注" class="md:col-span-3">
              <el-input v-model="correctionForm.remark" type="textarea" :rows="2" />
            </el-form-item>
            <el-form-item label="复核原因" class="md:col-span-3">
              <el-input v-model="correctionForm.review_reason" />
            </el-form-item>
          </el-form>
        </section>

        <section>
      <el-descriptions border :column="1">
        <el-descriptions-item label="记录 ID">#{{ selectedRecord.id }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          {{ statusLabel(selectedRecord.status) }}
        </el-descriptions-item>
        <el-descriptions-item label="回调">{{ selectedRecord.shortcut_callback_status || '-' }}</el-descriptions-item>
        <el-descriptions-item label="失败原因">{{ selectedRecord.failure_reason || '-' }}</el-descriptions-item>
        <el-descriptions-item label="复核原因">{{ selectedRecord.review_reason || '-' }}</el-descriptions-item>
        <el-descriptions-item label="识别引擎">
          <el-tag v-if="selectedRecord.image_provider_key" :type="providerBadgeType(selectedRecord.image_provider_key)" effect="plain">
            {{ providerBadge(selectedRecord.image_provider_key) }}
          </el-tag>
          <span class="ml-2">{{ selectedRecord.image_model || '-' }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="Provider 耗时">{{ selectedRecord.image_provider_latency_ms ?? '-' }} ms</el-descriptions-item>
        <el-descriptions-item label="Provider 错误">
          {{ selectedRecord.image_provider_error_code || '-' }}
          <span v-if="selectedRecord.image_provider_error_message"> · {{ selectedRecord.image_provider_error_message }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="Token 明细">
          reasoning={{ selectedRecord.image_provider_reasoning_tokens ?? '-' }}，
          cached={{ selectedRecord.image_provider_cached_tokens ?? '-' }}，
          image={{ selectedRecord.image_provider_image_tokens ?? '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="原始输入">{{ selectedRecord.raw_input_text || selectedRecord.source_filename || '-' }}</el-descriptions-item>
        <el-descriptions-item label="OCR 文本">{{ selectedRecord.ocr_raw_text || '-' }}</el-descriptions-item>
        <el-descriptions-item label="模型原始结果">{{ selectedRecord.model_raw_result || '-' }}</el-descriptions-item>
        <el-descriptions-item label="iCost URL">{{ selectedRecord.icost_url || '-' }}</el-descriptions-item>
      </el-descriptions>
        </section>

        <section class="grid gap-3 md:grid-cols-2">
          <div class="rounded-lg border border-zinc-200 bg-zinc-950 p-4 text-xs text-zinc-100">
            <p class="mb-2 font-semibold text-zinc-300">解析 JSON</p>
            <pre class="max-h-[260px] overflow-auto whitespace-pre-wrap">{{ parsedJsonText(selectedRecord) || 'null' }}</pre>
          </div>
          <div class="rounded-lg border border-zinc-200 bg-zinc-950 p-4 text-xs text-zinc-100">
            <p class="mb-2 font-semibold text-zinc-300">映射结果</p>
            <pre class="max-h-[260px] overflow-auto whitespace-pre-wrap">{{ mappingText(selectedRecord) || 'null' }}</pre>
          </div>
          <div class="rounded-lg border border-zinc-200 bg-zinc-950 p-4 text-xs text-zinc-100 md:col-span-2">
            <p class="mb-2 font-semibold text-zinc-300">iCost payload</p>
            <pre class="max-h-[280px] overflow-auto whitespace-pre-wrap">{{ payloadText(selectedRecord) || 'null' }}</pre>
          </div>
          <div class="rounded-lg border border-zinc-200 bg-zinc-950 p-4 text-xs text-zinc-100">
            <p class="mb-2 font-semibold text-zinc-300">Provider usage</p>
            <pre class="max-h-[260px] overflow-auto whitespace-pre-wrap">{{ providerUsageText(selectedRecord) || 'null' }}</pre>
          </div>
          <div class="rounded-lg border border-zinc-200 bg-zinc-950 p-4 text-xs text-zinc-100">
            <p class="mb-2 font-semibold text-zinc-300">Provider response</p>
            <pre class="max-h-[260px] overflow-auto whitespace-pre-wrap">{{ providerRawResponseText(selectedRecord) || 'null' }}</pre>
          </div>
        </section>

        <section class="rounded-lg border border-zinc-200 bg-white/80 p-4">
          <h3 class="mb-3 text-sm font-bold uppercase tracking-[0.16em] text-zinc-500">状态历史</h3>
          <el-timeline>
            <el-timeline-item
              v-for="event in selectedRecord.events"
              :key="event.id"
              :timestamp="formatDateTime(event.created_at)"
            >
              <p class="text-sm font-semibold">{{ event.summary }}</p>
              <p class="text-xs text-zinc-500">{{ event.event_type }} · {{ event.level }}</p>
              <p v-if="event.details" class="mt-1 text-xs text-zinc-600">{{ event.details }}</p>
            </el-timeline-item>
          </el-timeline>
        </section>
      </div>
    </template>
  </el-drawer>
</template>
