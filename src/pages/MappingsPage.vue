<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRoute } from 'vue-router'
import { createMappingsApi } from '../api/mappings'
import { ledgerApi } from '../api/ledger'
import { errorText, isDismissed, userLabel } from '../utils/presentation'
import type { ICostMapping, ICostMappingPayload, ICostMappingType, ICostMatchMode, ICostTransactionType } from '../api/types'

const userId = Number(useRoute().params.userId)
const mappingsApi = createMappingsApi(userId)
const userName = ref('')
const mappingTypeOptions: Array<{ label: string; value: ICostMappingType }> = [
  { label: '分类', value: 'category' }, { label: '账户', value: 'account' },
  { label: '账本', value: 'book' }, { label: '标签', value: 'tag' }, { label: '货币', value: 'currency' }
]
const transactionTypeOptions: Array<{ label: string; value: ICostTransactionType }> = [
  { label: '通用', value: 'any' }, { label: '支出', value: 'expense' },
  { label: '收入', value: 'income' }, { label: '转账', value: 'transfer' }
]
const matchModeOptions: Array<{ label: string; value: ICostMatchMode }> = [
  { label: '包含', value: 'contains' }, { label: '等于', value: 'equals' }, { label: '正则表达式', value: 'regex' }
]
const mappings = ref<ICostMapping[]>([])
const loading = ref(false)
const error = ref('')
const formError = ref('')
const saving = ref(false)
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const pending = ref(new Set<number>())
const page = ref(1)
const pageSize = ref(20)
const filters = reactive({ mapping_type: '' as ICostMappingType | '', transaction_type: '' as ICostTransactionType | '', query: '', status: '' })
let generation = 0
interface MappingForm {
  mapping_type: ICostMappingType
  transaction_type: ICostTransactionType
  local_value: string
  icost_value: string
  keywords_text: string
  match_mode: ICostMatchMode
  priority: number | undefined
  enabled: boolean
  is_default: boolean
}
function defaultForm(): MappingForm {
  return { mapping_type: 'category', transaction_type: 'expense', local_value: '', icost_value: '',
    keywords_text: '', match_mode: 'contains', priority: 100, enabled: true, is_default: false }
}
const form = reactive<MappingForm>(defaultForm())
const initialForm = ref('')
const filteredMappings = computed(() => {
  const query = filters.query.trim().toLocaleLowerCase()
  return mappings.value.filter(item =>
    (!filters.mapping_type || item.mapping_type === filters.mapping_type) &&
    (!filters.transaction_type || item.transaction_type === filters.transaction_type || item.transaction_type === 'any') &&
    (!filters.status || item.enabled === (filters.status === 'enabled')) &&
    (!query || [item.local_value ?? '', item.icost_value, ...item.match_keywords].some(value => value.toLocaleLowerCase().includes(query))))
})
const visibleMappings = computed(() => filteredMappings.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))
const enabledCount = computed(() => mappings.value.filter(item => item.enabled).length)
watch(filters, () => { page.value = 1 })
watch(pageSize, () => { page.value = 1 })
watch(() => filteredMappings.value.length, total => {
  page.value = Math.min(page.value, Math.max(1, Math.ceil(total / pageSize.value)))
})
function label(options: Array<{ value: string; label: string }>, value: string) {
  return options.find(item => item.value === value)?.label ?? value
}
function resetFilters() {
  Object.assign(filters, { mapping_type: '', transaction_type: '', query: '', status: '' })
}
async function loadMappings() {
  const current = ++generation
  loading.value = true
  error.value = ''
  try {
    const [user, rows] = await Promise.all([ledgerApi.get(userId), mappingsApi.list()])
    if (current !== generation) return
    userName.value = userLabel(user)
    mappings.value = rows
  } catch (err) {
    if (current === generation) error.value = errorText(err, '映射规则加载失败，请重试。')
  } finally {
    if (current === generation) loading.value = false
  }
}
function openDialog(row?: ICostMapping) {
  editingId.value = row?.id ?? null
  Object.assign(form, row ? {
    mapping_type: row.mapping_type, transaction_type: row.transaction_type, local_value: row.local_value ?? '',
    icost_value: row.icost_value, keywords_text: row.match_keywords.join('\n'), match_mode: row.match_mode,
    priority: row.priority, enabled: row.enabled, is_default: row.is_default
  } : defaultForm())
  formError.value = ''
  initialForm.value = JSON.stringify(form)
  dialogVisible.value = true
}
async function closeEditor(done?: () => void) {
  if (saving.value) return
  if (JSON.stringify(form) !== initialForm.value) {
    try {
      await ElMessageBox.confirm('尚有未保存的修改。关闭后将丢弃这些修改。', '放弃修改', {
        confirmButtonText: '放弃修改', cancelButtonText: '继续编辑', type: 'warning'
      })
    } catch { return }
  }
  dialogVisible.value = false
  done?.()
}
function buildPayload(): ICostMappingPayload | null {
  formError.value = ''
  if (!form.icost_value.trim()) {
    formError.value = '请填写写入 iCost 的值。'
    return null
  }
  if (form.priority === undefined || !Number.isInteger(form.priority) || form.priority < 0) {
    formError.value = '优先级必须为大于或等于 0 的整数。'
    return null
  }
  // One candidate per line preserves regex quantifiers and literal commas.
  const keywords = [...new Set(form.keywords_text.split(/\r?\n/).map(item => item.trim()).filter(Boolean))]
  return {
    mapping_type: form.mapping_type, transaction_type: form.transaction_type,
    local_value: form.local_value.trim() || null, icost_value: form.icost_value.trim(),
    match_keywords: keywords, match_mode: form.match_mode, priority: form.priority,
    enabled: form.enabled, is_default: form.is_default
  }
}
async function saveMapping() {
  if (saving.value) return
  const payload = buildPayload()
  if (!payload) return
  saving.value = true
  try {
    if (editingId.value !== null) await mappingsApi.update(editingId.value, payload)
    else await mappingsApi.create(payload)
    dialogVisible.value = false
    ElMessage.success('映射规则已保存')
    await loadMappings()
  } catch (err) {
    formError.value = errorText(err, '保存失败，请重试。')
  } finally { saving.value = false }
}
async function toggleEnabled(row: ICostMapping, value: string | number | boolean) {
  if (pending.value.has(row.id)) return
  pending.value.add(row.id)
  const previous = row.enabled
  row.enabled = Boolean(value)
  try { await mappingsApi.update(row.id, { enabled: row.enabled }) }
  catch (err) { row.enabled = previous; ElMessage.error(errorText(err, '状态更新失败，请重试。')) }
  finally { pending.value.delete(row.id) }
}
async function removeMapping(row: ICostMapping) {
  if (pending.value.has(row.id)) return
  try {
    await ElMessageBox.confirm('删除规则「' + row.icost_value + '」后，该规则将不再参与识别匹配，且无法恢复。', '删除映射规则', {
      type: 'warning', confirmButtonText: '删除规则', cancelButtonText: '取消'
    })
    pending.value.add(row.id)
    await mappingsApi.remove(row.id)
    ElMessage.success('映射规则已删除')
    await loadMappings()
  } catch (err) {
    if (!isDismissed(err)) ElMessage.error(errorText(err, '删除失败，请重试。'))
  } finally { pending.value.delete(row.id) }
}
onMounted(loadMappings)
onBeforeUnmount(() => { ++generation })
</script>

<template>
  <div class="grid gap-4">
    <section class="panel p-4 md:p-5">
      <div class="section-heading">
        <div>
          <h2 class="text-lg font-semibold">{{ userName || '用户 ' + String(userId).padStart(3, '0') }}</h2>
          <p class="mt-1 text-sm text-zinc-500">共 {{ mappings.length }} 条规则，{{ enabledCount }} 条已启用。规则按优先级从小到大匹配。</p>
        </div>
        <div class="flex gap-2">
          <el-button :loading="loading" @click="loadMappings">刷新</el-button>
          <el-button type="primary" :disabled="loading || Boolean(error)" @click="openDialog()">新增规则</el-button>
        </div>
      </div>
      <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon class="mb-4">
        <el-button text @click="loadMappings">重新加载</el-button>
      </el-alert>
      <div class="mapping-filters">
        <el-input v-model="filters.query" clearable placeholder="搜索匹配值、写入值或关键词" aria-label="搜索映射规则" />
        <el-select v-model="filters.mapping_type" clearable placeholder="全部字段" aria-label="筛选字段类型">
          <el-option v-for="item in mappingTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-select v-model="filters.transaction_type" clearable placeholder="全部交易类型" aria-label="筛选交易类型">
          <el-option v-for="item in transactionTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-select v-model="filters.status" clearable placeholder="全部状态" aria-label="筛选规则状态">
          <el-option label="已启用" value="enabled" /><el-option label="已停用" value="disabled" />
        </el-select>
        <el-button @click="resetFilters">重置筛选</el-button>
      </div>
      <p class="mb-3 text-xs text-zinc-500">通用规则适用于所有交易类型。窄屏可横向滚动查看完整表格。</p>
      <el-table v-loading="loading" :data="error ? [] : visibleMappings" stripe scrollbar-always-on class="data-table" :aria-busy="loading">
        <template #empty>
          <div class="table-empty">
            <p>{{ loading ? '正在加载映射规则…' : error ? '映射规则加载失败' : mappings.length ? '没有符合筛选条件的规则' : '尚未配置映射规则' }}</p>
            <el-button v-if="!loading" text @click="error ? loadMappings() : mappings.length ? resetFilters() : openDialog()">
              {{ error ? '重新加载' : mappings.length ? '重置筛选' : '新增规则' }}
            </el-button>
          </div>
        </template>
        <el-table-column label="匹配与写入" min-width="220">
          <template #default="{ row }">
            <div class="truncate font-medium" :title="(row.local_value || '未设置匹配值') + ' → ' + row.icost_value">{{ row.local_value || '未设置匹配值' }} → {{ row.icost_value }}</div>
            <div class="mt-1 text-xs text-zinc-500">{{ label(mappingTypeOptions, row.mapping_type) }}<span v-if="row.is_default"> · 兜底规则</span></div>
          </template>
        </el-table-column>
        <el-table-column label="关键词" width="220">
          <template #default="{ row }">
            <div class="keyword-summary">
              <span v-for="keyword in row.match_keywords.slice(0, 2)" :key="keyword" class="keyword-chip" :title="keyword">{{ keyword }}</span>
              <el-popover v-if="row.match_keywords.length > 2" trigger="click" width="280">
                <template #reference><el-button text size="small" :aria-label="'查看全部 ' + row.match_keywords.length + ' 个关键词'">+{{ row.match_keywords.length - 2 }}</el-button></template>
                <div class="keyword-details"><span v-for="keyword in row.match_keywords" :key="keyword" class="keyword-chip">{{ keyword }}</span></div>
              </el-popover>
              <span v-if="!row.match_keywords.length" class="text-zinc-400">未设置</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="交易类型" width="94"><template #default="{ row }">{{ label(transactionTypeOptions, row.transaction_type) }}</template></el-table-column>
        <el-table-column label="匹配方式" width="110"><template #default="{ row }">{{ label(matchModeOptions, row.match_mode) }}</template></el-table-column>
        <el-table-column prop="priority" label="优先级" width="84" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }"><el-switch :model-value="row.enabled" :loading="pending.has(row.id)" :disabled="loading || saving || pending.has(row.id)" :aria-label="'启用规则：' + row.icost_value" @change="toggleEnabled(row, $event)" /></template>
        </el-table-column>
        <el-table-column label="操作" width="138">
          <template #default="{ row }">
            <el-button text size="small" :disabled="pending.has(row.id) || loading" @click="openDialog(row)">编辑</el-button>
            <el-button text size="small" type="danger" :disabled="pending.has(row.id) || loading" @click="removeMapping(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-row">
        <span class="text-sm text-zinc-500">共 {{ filteredMappings.length }} 条</span>
        <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :page-sizes="[20, 50, 100]" :total="filteredMappings.length" layout="sizes, prev, pager, next" :pager-count="5" :disabled="loading || Boolean(error)" />
      </div>
    </section>
    <el-dialog v-model="dialogVisible" :title="editingId === null ? '新增映射规则' : '编辑映射规则'"
      width="min(620px, calc(100vw - 32px))" :close-on-click-modal="false" :close-on-press-escape="!saving" :show-close="!saving" :before-close="closeEditor">
      <el-form label-position="top" class="grid gap-x-4 md:grid-cols-2" :disabled="saving" @submit.prevent="saveMapping">
        <el-form-item label="作用字段"><el-select v-model="form.mapping_type" aria-label="作用字段"><el-option v-for="item in mappingTypeOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item>
        <el-form-item label="交易类型"><el-select v-model="form.transaction_type" aria-label="交易类型"><el-option v-for="item in transactionTypeOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item>
        <el-form-item label="匹配值" for="mapping-local"><el-input id="mapping-local" v-model="form.local_value" maxlength="255" /></el-form-item>
        <el-form-item label="写入 iCost 的值" for="mapping-target" required><el-input id="mapping-target" v-model="form.icost_value" maxlength="255" /></el-form-item>
        <el-form-item label="匹配方式"><el-select v-model="form.match_mode" aria-label="匹配方式"><el-option v-for="item in matchModeOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item>
        <el-form-item label="优先级" for="mapping-priority"><el-input-number id="mapping-priority" v-model="form.priority" :min="0" :precision="0" :step="10" class="!w-full" /><p class="field-help">数字越小越先匹配；相同时按规则编号排序。</p></el-form-item>
        <el-form-item label="关键词（每行一个）" for="mapping-keywords" class="md:col-span-2"><el-input id="mapping-keywords" v-model="form.keywords_text" type="textarea" :rows="4" placeholder="每行输入一个关键词或正则表达式" /><p class="field-help">匹配值与关键词均按所选方式参与匹配。逗号作为内容保留，不用于分隔。</p></el-form-item>
        <el-form-item label="启用状态"><el-switch v-model="form.enabled" aria-label="启用状态" active-text="启用" inactive-text="停用" /></el-form-item>
        <el-form-item label="兜底规则"><el-switch v-model="form.is_default" aria-label="兜底规则" /><p class="field-help">没有规则命中时使用。</p></el-form-item>
        <el-alert v-if="formError" :title="formError" type="error" :closable="false" show-icon class="md:col-span-2" />
        <p v-if="form.match_mode === 'regex'" class="field-help md:col-span-2">正则表达式使用服务端 Python 语法。请核对表达式内容，避免因语法错误导致无法匹配。</p>
      </el-form>
      <template #footer><el-button :disabled="saving" @click="closeEditor()">取消</el-button><el-button type="primary" :loading="saving" @click="saveMapping">保存规则</el-button></template>
    </el-dialog>
  </div>
</template>
