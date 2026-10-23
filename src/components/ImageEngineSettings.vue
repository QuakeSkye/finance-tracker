<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { http } from '../api/http'
import { ledgerApi, type LedgerUser } from '../api/ledger'
import { errorText, userLabel } from '../utils/presentation'
const config = reactive({ enabled: false, base_url: '', model: '', timeout_seconds: 120, num_ctx: 16384 })
const users = ref<LedgerUser[]>([]), userId = ref<number>(), provider = ref('local_ollama')
const loading = ref(false), saving = ref(false), testing = ref(false), error = ref(''), result = ref<Record<string, unknown> | null>(null)
const file = ref<File | null>(null), ready = ref(false)
async function load() {
  loading.value = true; error.value = ''
  try { const [r, list] = await Promise.all([http.get('/settings/local-engine'), ledgerApi.list()]); Object.assign(config,r.data); users.value = list; userId.value ??= list[0]?.id; ready.value = true }
  catch(e) { error.value = errorText(e,'引擎配置加载失败') }
  finally { loading.value = false }
}
async function save() {
  saving.value = true; error.value = ''
  try { Object.assign(config,(await http.put('/settings/local-engine',config)).data); result.value=null; ElMessage.success('Ollama 配置已保存，按用户选择后生效') }
  catch(e) { error.value = errorText(e,'保存失败') }
  finally { saving.value = false }
}
function choose(event: Event) { file.value = (event.target as HTMLInputElement).files?.[0] || null; result.value = null }
async function preview() {
  if (!file.value || !userId.value) return
  testing.value = true; result.value = null; error.value = ''
  const data = new FormData(); data.append('file',file.value)
  try { result.value = (await http.post(`/ledger-users/${userId.value}/image-engine/preview`, data,
    {params:{provider:provider.value},timeout:615000})).data }
  catch(e) { error.value = errorText(e,'测试失败') }
  finally { testing.value = false }
}
watch([userId, provider], () => { result.value = null })
onMounted(load)
</script>
<template>
  <section class="panel p-4 md:p-5">
    <div class="section-heading"><div><h2 class="text-lg font-semibold">本地 Ollama</h2><p class="mt-1 text-sm text-zinc-500">保留独立配置；启用后到用户管理选择引擎，不会自动替换任何用户的 DeepSeek。</p></div><el-button :loading="loading" :disabled="testing" @click="load">刷新</el-button></div>
    <el-alert v-if="error" :title="error" type="error" :closable="false" class="mb-4" />
    <el-form label-position="top" :disabled="!ready || loading || saving || testing" @submit.prevent="save">
      <el-form-item label="允许正式请求使用 Ollama"><el-switch v-model="config.enabled" active-text="启用" inactive-text="关闭" /></el-form-item>
      <p class="mb-4 text-xs text-zinc-500">关闭后，已选择 Ollama 的用户会收到明确错误；不会自动回退到外部模型。</p>
      <div class="grid gap-4 md:grid-cols-2">
        <el-form-item label="服务地址"><el-input v-model="config.base_url" placeholder="http://127.0.0.1:11434" /></el-form-item>
        <el-form-item label="图片识别模型"><el-input v-model="config.model" placeholder="glm-ocr" /></el-form-item>
        <el-form-item label="超时（秒）"><el-input-number v-model="config.timeout_seconds" :min="5" :max="600" /></el-form-item>
        <el-form-item label="上下文长度"><el-input-number v-model="config.num_ctx" :min="16384" :max="131072" :step="4096" /></el-form-item>
      </div>
      <el-button type="primary" :loading="saving" native-type="submit">保存本地引擎配置</el-button>
    </el-form>
    <RouterLink to="/users" class="action-link mt-4 inline-block">前往用户管理切换引擎 →</RouterLink>
    <hr class="my-5" />
    <h3 class="mb-3 font-semibold">账单试识别（不入账）</h3>
    <p class="mb-3 text-sm text-amber-700">模型需能输出结构化账单字段；仅能提取文字的 OCR 模型不等于可直接记账，请先测试。</p>
    <p class="mb-4 text-sm text-zinc-500">使用已保存的配置与所选用户映射，检查 iCost 参数。不保存测试图片、账单或失败日志，不打开 iCost；Ollama 关闭时也可手动试识别。</p>
    <el-form label-position="top" :disabled="!ready || testing || saving" @submit.prevent="preview">
      <div class="grid gap-4 md:grid-cols-2">
        <el-form-item label="映射所属用户"><el-select v-model="userId"><el-option v-for="u in users" :key="u.id" :label="userLabel(u)" :value="u.id" :disabled="!u.enabled" /></el-select></el-form-item>
        <el-form-item label="本次测试引擎"><el-select v-model="provider"><el-option label="本地 Ollama" value="local_ollama" /><el-option label="此用户的 DeepSeek" value="deepseek" /></el-select></el-form-item>
      </div>
      <p v-if="provider === 'deepseek'" class="mb-3 text-sm text-amber-700">此测试会将图片发送至 DeepSeek，使用所选用户的 Key 并可能产生费用。</p>
      <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/bmp" aria-label="测试账单图片" :disabled="testing" @change="choose" />
      <el-button class="ml-3" native-type="submit" :loading="testing" :disabled="!file || !userId || !ready">仅测试，不入账</el-button>
    </el-form>
    <div v-if="result" class="mt-4">
      <el-alert :title="result.success ? '校验通过：已生成测试参数，未保存或入账' : String(result.message || '未通过账单校验')" :type="result.success ? 'success' : 'warning'" :closable="false" />
      <pre class="mt-3 overflow-auto whitespace-pre-wrap rounded bg-zinc-50 p-3 text-xs">{{ JSON.stringify(result, null, 2) }}</pre>
    </div>
  </section>
</template>
