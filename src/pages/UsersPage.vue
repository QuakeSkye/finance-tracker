<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ledgerApi, type LedgerUser } from '../api/ledger'
import { errorText, isDismissed, userLabel } from '../utils/presentation'

const users = ref<LedgerUser[]>([])
const newName = ref('')
const loading = ref(false)
const busy = ref(false)
const error = ref('')
const selected = ref<LedgerUser | null>(null)
const keyVisible = ref(false)
const apiKey = ref('')
const tokenVisible = ref(false)
const tokenValue = ref('')
const tokenUser = ref('')
const tokenAcknowledged = ref(false)
const query = ref('')
const visibleUsers = computed(() => {
  const text = query.value.trim().toLocaleLowerCase()
  return users.value.filter(user => !text || userLabel(user).toLocaleLowerCase().includes(text) || String(user.id) === text)
})
async function load() {
  loading.value = true
  error.value = ''
  try { users.value = await ledgerApi.list() }
  catch (e) { error.value = errorText(e, '用户列表加载失败，请重试。') }
  finally { loading.value = false }
}
async function perform(action: () => Promise<void>) {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try { await action(); await load() }
  catch (e) { if (!isDismissed(e)) error.value = errorText(e, '操作失败，请重试。') }
  finally { busy.value = false }
}
async function changeEngine(user: LedgerUser, provider: string) {
  await perform(async () => {
    await ledgerApi.selectEngine(user.id, provider)
    ElMessage.success('此用户的识别引擎已切换')
  })
}
async function create() {
  if (!newName.value.trim() || loading.value) return
  await perform(async () => {
    await ledgerApi.create(newName.value.trim())
    newName.value = ''
    ElMessage.success('用户已创建')
  })
}
async function rename(user: LedgerUser) {
  await perform(async () => {
    const result = await ElMessageBox.prompt('请输入用户名称', '修改用户名称', {
      inputValue: userLabel(user), inputValidator: value => Boolean(value?.trim()) && value.trim().length <= 100,
      inputErrorMessage: '用户名称应为 1 至 100 个字符。', confirmButtonText: '保存名称', cancelButtonText: '取消'
    })
    await ledgerApi.update(user.id, { display_name: result.value.trim() })
    ElMessage.success('用户名称已更新')
  })
}
async function rotate(user: LedgerUser) {
  await perform(async () => {
    await ElMessageBox.confirm(
      user.token_prefix ? '轮换后，原 Token 将立即失效，需要更新相关设备上的快捷指令。新 Token 仅显示一次。' : '签发后，新 Token 仅显示一次，请保存并配置到对应用户的快捷指令。',
      user.token_prefix ? '轮换快捷指令 Token' : '签发快捷指令 Token',
      { type: 'warning', confirmButtonText: user.token_prefix ? '确认轮换' : '确认签发', cancelButtonText: '取消' }
    )
    const result = await ledgerApi.rotate(user.id)
    tokenUser.value = userLabel(user)
    tokenValue.value = result.token
    tokenAcknowledged.value = false
    tokenVisible.value = true
  })
}
function configureKey(user: LedgerUser) {
  selected.value = user
  apiKey.value = ''
  error.value = ''
  keyVisible.value = true
}
async function saveKey() {
  if (!selected.value) return
  const id = selected.value.id
  await perform(async () => {
    await ledgerApi.key(id, apiKey.value)
    apiKey.value = ''
    keyVisible.value = false
    ElMessage.success('API Key 已保存，尚未验证')
  })
}
async function deleteKey() {
  if (!selected.value) return
  const id = selected.value.id
  await perform(async () => {
    await ElMessageBox.confirm('删除后，该用户将无法识别图片，直至重新配置 API Key。', '删除 API Key', {
      type: 'warning', confirmButtonText: '删除 API Key', cancelButtonText: '取消'
    })
    await ledgerApi.deleteKey(id)
    apiKey.value = ''
    keyVisible.value = false
    ElMessage.success('API Key 已删除')
  })
}
async function revoke(user: LedgerUser) {
  await perform(async () => {
    await ElMessageBox.confirm('撤销「' + userLabel(user) + '」的 Token 后，相关设备将无法提交新的识别请求，需要重新签发并配置 Token。', '撤销快捷指令 Token', {
      type: 'warning', confirmButtonText: '确认撤销', cancelButtonText: '取消'
    })
    await ledgerApi.revoke(user.id)
    ElMessage.success('Token 已撤销')
  })
}
async function changeEnabled(user: LedgerUser) {
  await perform(async () => {
    const enabled = !user.enabled
    await ElMessageBox.confirm(
      enabled ? '启用后，该用户可使用有效 Token 和已配置的 API Key 提交识别请求。' : '停用「' + userLabel(user) + '」后，将阻止新的识别请求，已发出的请求可能继续完成。用户配置将保留。',
      enabled ? '启用用户' : '停用用户',
      { type: 'warning', confirmButtonText: enabled ? '确认启用' : '确认停用', cancelButtonText: '取消' }
    )
    await ledgerApi.update(user.id, { enabled })
    ElMessage.success(enabled ? '用户已启用' : '用户已停用')
  })
}
function userCommand(command: string, user: LedgerUser) {
  if (command === 'rename') void rename(user)
  else if (command === 'rotate') void rotate(user)
  else if (command === 'revoke') void revoke(user)
  else if (command === 'enabled') void changeEnabled(user)
}
async function copyToken() {
  try { await navigator.clipboard.writeText(tokenValue.value); ElMessage.success('Token 已复制') }
  catch { ElMessage.error('复制失败，请手动选择并复制 Token。') }
}
async function allowTokenClose() {
  if (!tokenVisible.value || tokenAcknowledged.value) return true
  try {
    await ElMessageBox.confirm('完整 Token 仅显示一次。关闭后无法再次查看，未保存时需要重新轮换。', '确认关闭 Token', {
      type: 'warning', confirmButtonText: '仍然关闭', cancelButtonText: '返回保存'
    })
    return true
  } catch { return false }
}
async function closeToken(done: () => void) { if (await allowTokenClose()) done() }
function finishToken() { if (tokenAcknowledged.value) tokenVisible.value = false }
function beforeUnload(event: BeforeUnloadEvent) {
  if (tokenVisible.value && !tokenAcknowledged.value) { event.preventDefault(); event.returnValue = '' }
}
onBeforeRouteLeave(allowTokenClose)
onMounted(() => { void load(); window.addEventListener('beforeunload', beforeUnload) })
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', beforeUnload)
  tokenValue.value = ''
  apiKey.value = ''
})
</script>

<template>
  <div class="grid gap-4">
    <section class="panel p-4 md:p-5">
      <div class="section-heading">
        <div><h2 class="text-lg font-semibold">用户账户</h2><p class="mt-1 text-sm text-zinc-500">按用户管理 API Key、快捷指令 Token 和映射规则。</p></div>
        <el-button :loading="loading" :disabled="busy" @click="load">刷新</el-button>
      </div>
      <el-form class="create-user-form" @submit.prevent="create">
        <el-input v-model="newName" placeholder="请输入用户名称" aria-label="新用户名称" maxlength="100" :disabled="busy" />
        <el-button type="primary" native-type="submit" :loading="busy" :disabled="loading || !newName.trim()">新增用户</el-button>
      </el-form>
      <el-alert v-if="error && !keyVisible" class="mt-4" type="error" :title="error" :closable="false" show-icon>
        <el-button text :disabled="busy" @click="load">重新加载</el-button>
      </el-alert>
    </section>
    <div class="flex items-center justify-between gap-3">
      <span class="shrink-0 text-sm text-zinc-500">共 {{ users.length }} 个用户</span>
      <el-input v-model="query" clearable placeholder="搜索名称或用户编号" aria-label="搜索用户" class="!max-w-xs" />
    </div>
    <div v-if="loading && !users.length" class="panel p-5" aria-label="正在加载用户列表"><el-skeleton :rows="4" animated /></div>
    <el-empty v-else-if="!users.length && !error" description="尚未创建用户，请输入名称后新增用户。" />
    <el-empty v-else-if="users.length && !visibleUsers.length" description="没有符合搜索条件的用户"><el-button @click="query = ''">清除搜索</el-button></el-empty>
    <div v-else class="grid gap-4 lg:grid-cols-2">
      <section v-for="user in visibleUsers" :key="user.id" class="panel p-4 md:p-5">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0"><h3 class="break-words text-lg font-semibold">{{ userLabel(user) }}</h3><p class="mt-1 text-xs text-zinc-500">用户编号 {{ String(user.id).padStart(3, '0') }}</p></div>
          <el-tag :type="user.enabled ? 'success' : 'info'">{{ user.enabled ? '已启用' : '已停用' }}</el-tag>
        </div>
        <dl class="user-credentials">
          <dt>图片识别引擎</dt><dd><el-select :model-value="user.image_provider || 'deepseek'" :disabled="busy || loading" style="width: 190px" @change="changeEngine(user, $event)"><el-option label="DeepSeek（独立 Key）" value="deepseek" /><el-option label="本地 Ollama" value="local_ollama" /></el-select> <RouterLink to="/settings" class="action-link">本地引擎配置</RouterLink></dd>
          <dt>DeepSeek API Key</dt><dd>{{ user.credential.configured ? '已配置，未验证' : '未配置' }} <span class="font-mono">{{ user.credential.masked || '' }}</span></dd>
          <dt>快捷指令 Token</dt><dd class="font-mono">{{ user.token_prefix || '未签发' }}</dd>
        </dl>
        <div class="user-actions">
          <RouterLink :to="'/users/' + user.id + '/bills'" class="action-link">账单</RouterLink>
          <RouterLink :to="'/users/' + user.id + '/recognition-records'" class="action-link">识别失败</RouterLink>
          <RouterLink :to="'/users/' + user.id + '/mappings'" class="action-link">映射规则</RouterLink>
          <el-button :disabled="busy || loading" @click="configureKey(user)">配置 API Key</el-button>
          <el-dropdown trigger="click" :disabled="busy || loading" @command="userCommand($event, user)">
            <el-button :disabled="busy || loading" :aria-label="userLabel(user) + '：更多操作'">更多操作</el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="rename">修改名称</el-dropdown-item>
                <el-dropdown-item command="rotate">{{ user.token_prefix ? '轮换 Token' : '签发 Token' }}</el-dropdown-item>
                <el-dropdown-item command="revoke" :disabled="!user.token_prefix" divided><span class="text-red-700">撤销 Token</span></el-dropdown-item>
                <el-dropdown-item command="enabled"><span :class="user.enabled ? 'text-red-700' : ''">{{ user.enabled ? '停用用户' : '启用用户' }}</span></el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </section>
    </div>
    <el-dialog v-model="keyVisible" :title="(selected ? userLabel(selected) : '用户') + ' · API Key'" width="min(520px, calc(100vw - 32px))"
      :close-on-click-modal="!busy" :close-on-press-escape="!busy" :show-close="!busy" @closed="apiKey = ''; selected = null">
      <p class="mb-4 text-sm text-zinc-500">留空保持原值，保存后仅显示掩码。该用户提交的图片将发送至 DeepSeek。</p>
      <el-form label-position="top" @submit.prevent="saveKey">
        <el-form-item label="DeepSeek API Key" for="user-api-key"><el-input id="user-api-key" v-model="apiKey" type="password" autocomplete="new-password" placeholder="请输入 API Key" :disabled="busy" /></el-form-item>
      </el-form>
      <el-alert v-if="error" class="mt-3" type="error" :title="error" :closable="false" show-icon />
      <template #footer>
        <el-button :disabled="busy || !selected?.credential.configured" type="danger" plain @click="deleteKey">删除 API Key</el-button>
        <el-button :loading="busy" type="primary" @click="saveKey">保存 API Key</el-button>
      </template>
    </el-dialog>
    <el-dialog v-model="tokenVisible" :title="tokenUser + ' · 快捷指令 Token'" width="min(550px, calc(100vw - 32px))" :close-on-click-modal="false" :before-close="closeToken"
      @closed="tokenValue = ''; tokenAcknowledged = false">
      <el-alert title="完整 Token 仅显示一次，请妥善保存。" type="warning" :closable="false" show-icon class="mb-4" />
      <el-input :model-value="tokenValue" readonly aria-label="一次性 Token" />
      <p class="mt-3 text-sm text-zinc-500">Token 默认长期有效，撤销或轮换后失效。请配置到对应用户设备上的快捷指令。</p>
      <el-checkbox v-model="tokenAcknowledged" class="mt-4">我已妥善保存 Token</el-checkbox>
      <template #footer><el-button @click="copyToken">复制 Token</el-button><el-button type="primary" :disabled="!tokenAcknowledged" @click="finishToken">完成</el-button></template>
    </el-dialog>
  </div>
</template>
