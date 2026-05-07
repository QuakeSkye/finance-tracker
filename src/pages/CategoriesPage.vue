<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

import { useCategoriesStore } from '../stores/categories'
import type { Category } from '../api/types'

const store = useCategoriesStore()

const categoryDialog = ref(false)
const editingCategoryId = ref<number | null>(null)
const categoryForm = reactive({
  name: '',
  category_type: 'expense' as 'expense' | 'income',
  color: '#9CA3AF'
})

const ruleDialog = ref(false)
const editingRuleId = ref<number | null>(null)
const ruleForm = reactive({
  category_id: 0,
  keyword: '',
  priority: 100,
  is_enabled: true
})

const selectedCategory = computed(() =>
  store.categories.find((item) => item.id === store.selectedCategoryId) ?? null
)

function resetCategoryForm() {
  categoryForm.name = ''
  categoryForm.category_type = 'expense'
  categoryForm.color = '#9CA3AF'
  editingCategoryId.value = null
}

function resetRuleForm() {
  ruleForm.category_id = selectedCategory.value?.id ?? 0
  ruleForm.keyword = ''
  ruleForm.priority = 100
  ruleForm.is_enabled = true
  editingRuleId.value = null
}

function openCreateCategory() {
  resetCategoryForm()
  categoryDialog.value = true
}

function openEditCategory() {
  if (!selectedCategory.value) return
  editingCategoryId.value = selectedCategory.value.id
  categoryForm.name = selectedCategory.value.name
  categoryForm.category_type = selectedCategory.value.category_type
  categoryForm.color = selectedCategory.value.color ?? '#9CA3AF'
  categoryDialog.value = true
}

async function submitCategory() {
  try {
    if (editingCategoryId.value) {
      await store.updateCategory(editingCategoryId.value, {
        name: categoryForm.name,
        category_type: categoryForm.category_type,
        color: categoryForm.color
      })
      ElMessage.success('分类已更新')
    } else {
      await store.createCategory({
        name: categoryForm.name,
        category_type: categoryForm.category_type,
        color: categoryForm.color
      })
      ElMessage.success('分类已创建')
    }
    categoryDialog.value = false
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : typeof err === 'object' && err !== null && 'message' in err ? String((err as { message: unknown }).message) : '操作失败'
    ElMessage.error(msg)
  }
}

async function removeCategory() {
  if (!selectedCategory.value) return
  await ElMessageBox.confirm(`确认删除分类 ${selectedCategory.value.name}？`, '提示', { type: 'warning' })
  try {
    await store.deleteCategory(selectedCategory.value.id)
    ElMessage.success('分类已删除')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '删除失败')
  }
}

function openCreateRule() {
  resetRuleForm()
  ruleDialog.value = true
}

function openEditRule(rule: { id: number; category_id: number; keyword: string; priority: number; is_enabled: boolean }) {
  editingRuleId.value = rule.id
  ruleForm.category_id = rule.category_id
  ruleForm.keyword = rule.keyword
  ruleForm.priority = rule.priority
  ruleForm.is_enabled = rule.is_enabled
  ruleDialog.value = true
}

async function submitRule() {
  try {
    if (editingRuleId.value) {
      await store.updateRule(editingRuleId.value, {
        category_id: ruleForm.category_id,
        keyword: ruleForm.keyword,
        priority: ruleForm.priority,
        is_enabled: ruleForm.is_enabled
      })
      ElMessage.success('规则已更新')
    } else {
      await store.createRule({
        category_id: ruleForm.category_id,
        keyword: ruleForm.keyword,
        priority: ruleForm.priority,
        is_enabled: ruleForm.is_enabled
      })
      ElMessage.success('规则已创建')
    }
    ruleDialog.value = false
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '规则操作失败')
  }
}

async function toggleRule(id: number, enabled: boolean) {
  try {
    await store.toggleRule(id, enabled)
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '切换失败')
  }
}

async function removeRule(id: number) {
  await ElMessageBox.confirm('确认删除该规则？', '提示', { type: 'warning' })
  await store.deleteRule(id)
  ElMessage.success('规则已删除')
}

function onCategoryRowClick(row: Category) {
  store.selectedCategoryId = row.id
}

function onRuleEnabledChange(ruleId: number, value: string | number | boolean) {
  void toggleRule(ruleId, Boolean(value))
}

onMounted(async () => {
  await store.loadAll()
  if (!store.selectedCategoryId && store.categories.length) {
    store.selectedCategoryId = store.categories[0].id
  }
})
</script>

<template>
  <div class="grid gap-4 overflow-x-auto lg:grid-cols-[1fr_1.4fr]">
    <section class="panel p-4 md:p-6">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-sm font-bold uppercase tracking-[0.16em] text-zinc-500">分类列表</h3>
        <el-button type="primary" @click="openCreateCategory">新增分类</el-button>
      </div>

      <el-table :data="store.categories" height="calc(100vh - 380px)" @row-click="onCategoryRowClick">
        <el-table-column prop="name" label="名称" min-width="120" />
        <el-table-column prop="category_type" label="类型" width="100" />
        <el-table-column prop="color" label="颜色" width="110" />
      </el-table>

      <div class="mt-4 flex gap-2">
        <el-button @click="openEditCategory" :disabled="!selectedCategory">编辑</el-button>
        <el-button type="danger" @click="removeCategory" :disabled="!selectedCategory">删除</el-button>
      </div>
    </section>

    <section class="panel p-4 md:p-6">
      <div class="mb-4 flex items-center justify-between">
        <div>
          <h3 class="text-sm font-bold uppercase tracking-[0.16em] text-zinc-500">关键词规则</h3>
          <p class="mt-1 text-xs text-zinc-500">当前分类：{{ selectedCategory?.name || '未选择' }}</p>
        </div>
        <el-button type="primary" @click="openCreateRule" :disabled="!selectedCategory">新增规则</el-button>
      </div>

      <el-table :data="store.selectedRules" height="calc(100vh - 380px)">
        <el-table-column prop="keyword" label="关键词" min-width="150" />
        <el-table-column prop="priority" label="优先级" width="100" />
        <el-table-column label="启用" width="90">
          <template #default="scope">
            <el-switch :model-value="scope.row.is_enabled" @change="onRuleEnabledChange(scope.row.id, $event)" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="scope">
            <el-button text type="primary" @click="openEditRule(scope.row)">编辑</el-button>
            <el-button text type="danger" @click="removeRule(scope.row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <el-dialog v-model="categoryDialog" :title="editingCategoryId ? '编辑分类' : '新增分类'" width="460px">
      <el-form label-position="top">
        <el-form-item label="分类名称"><el-input v-model="categoryForm.name" /></el-form-item>
        <el-form-item label="分类类型">
          <el-select v-model="categoryForm.category_type" class="w-full">
            <el-option label="支出" value="expense" />
            <el-option label="收入" value="income" />
          </el-select>
        </el-form-item>
        <el-form-item label="颜色"><el-color-picker v-model="categoryForm.color" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="categoryDialog = false">取消</el-button>
        <el-button type="primary" @click="submitCategory">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="ruleDialog" :title="editingRuleId ? '编辑规则' : '新增规则'" width="460px">
      <el-form label-position="top">
        <el-form-item label="所属分类">
          <el-select v-model="ruleForm.category_id" class="w-full">
            <el-option v-for="c in store.categories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词"><el-input v-model="ruleForm.keyword" placeholder="输入要匹配的关键词" /></el-form-item>
        <el-form-item label="优先级"><el-input-number v-model="ruleForm.priority" :min="1" :max="9999" class="w-full" /></el-form-item>
        <el-form-item label="启用状态"><el-switch v-model="ruleForm.is_enabled" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="ruleDialog = false">取消</el-button>
        <el-button type="primary" @click="submitRule">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
