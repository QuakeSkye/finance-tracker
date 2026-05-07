<script setup lang="ts">
import { computed, onMounted } from 'vue'

import KpiCard from '../components/KpiCard.vue'
import TrendChart from '../components/TrendChart.vue'
import { useDashboardStore } from '../stores/dashboard'

const store = useDashboardStore()

const fmt = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' })

const todayAmountText = computed(() => fmt.format(store.todayAmount))
const monthExpenseText = computed(() => fmt.format(store.monthExpense))
const monthIncomeText = computed(() => fmt.format(store.monthIncome))

function availabilityText(value: boolean | undefined) {
  if (value === undefined) {
    return '检测中'
  }
  return value ? '可用' : '不可用'
}

function availabilityClass(value: boolean | undefined) {
  if (value === undefined) {
    return 'bg-zinc-100 text-zinc-600'
  }
  return value ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
}

function formatDateTime(value: string | null) {
  if (!value) {
    return '暂无'
  }
  return new Date(value).toLocaleString('zh-CN')
}

onMounted(() => {
  void store.refresh()
})
</script>

<template>
  <div class="grid gap-4">
    <section class="panel p-5 md:p-7">
      <p class="text-xs uppercase tracking-[0.2em] text-zinc-500">每日概览</p>
      <div class="mt-3 grid gap-3 md:grid-cols-2">
        <h2 class="display-font text-3xl leading-tight md:text-4xl">
          智能记账，
          <span class="text-signal">让财务管理更轻松。</span>
        </h2>
        <p class="text-sm leading-7 text-zinc-600">
          系统已全面接入后端接口：Watcher / OCR / Bark 状态、最近失败原因、待删除数量均实时展示。
        </p>
      </div>
    </section>

    <section class="grid gap-3 overflow-x-auto md:grid-cols-2 xl:grid-cols-5">
      <KpiCard label="今日入账数量" :value="String(store.todayCount)" hint="基于 transactions 实时计算" />
      <KpiCard label="今日入账金额" :value="todayAmountText" />
      <KpiCard label="本月支出" :value="monthExpenseText" />
      <KpiCard label="本月收入" :value="monthIncomeText" />
      <KpiCard label="待删除图片" :value="String(store.pendingDeleteCount)" hint="已进入 pending_confirm" />
    </section>

    <section class="grid gap-4 overflow-x-auto lg:grid-cols-[1.6fr_1fr]">
      <article class="panel p-4 md:p-6">
        <div class="mb-2 flex items-center justify-between">
          <h3 class="text-sm font-bold uppercase tracking-[0.16em] text-zinc-500">近 7 日支出曲线</h3>
          <span class="text-xs text-zinc-500">单位：CNY</span>
        </div>
        <TrendChart :labels="store.trendLabels" :values="store.trendExpenseSeries" />
      </article>

      <article class="panel p-4 md:p-6">
        <h3 class="text-sm font-bold uppercase tracking-[0.16em] text-zinc-500">结构提醒</h3>
        <div class="mt-4 grid gap-3">
          <KpiCard label="未分类流水" :value="String(store.uncategorizedCount)" hint="建议进入分类管理补规则" />
          <div class="rounded-xl border border-zinc-200 bg-white/70 p-4">
            <p class="text-xs uppercase tracking-[0.16em] text-zinc-500">最近失败原因</p>
            <p class="mt-2 text-sm text-zinc-700">
              {{ store.recentFailureReason || '暂无失败记录' }}
            </p>
            <p class="mt-3 text-xs text-zinc-500">
              最近成功时间：{{ formatDateTime(store.lastSuccessTime) }}
            </p>
          </div>
        </div>
      </article>
    </section>

    <section class="grid gap-4 overflow-x-auto lg:grid-cols-[1.5fr_1fr]">
      <article class="panel p-4 md:p-6">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-sm font-bold uppercase tracking-[0.16em] text-zinc-500">最近流水</h3>
          <RouterLink to="/transactions" class="text-xs font-semibold text-deep">查看全部</RouterLink>
        </div>
        <el-table :data="store.recentTransactions" stripe height="300">
          <el-table-column prop="transaction_time" label="时间" min-width="150" />
          <el-table-column prop="merchant_name" label="商家" min-width="150" />
          <el-table-column prop="direction" label="方向" width="90" />
          <el-table-column prop="amount" label="金额" width="120" />
        </el-table>
      </article>

      <article class="grid gap-3">
        <div class="panel p-4">
          <p class="text-sm font-semibold text-zinc-700">Watcher 可用性</p>
          <span class="mt-2 inline-block rounded-full px-2 py-1 text-xs font-semibold" :class="availabilityClass(store.watcherStatus?.available)">
            {{ availabilityText(store.watcherStatus?.available) }}
          </span>
          <p class="mt-2 text-xs text-zinc-500">{{ store.watcherStatus?.message || '检测中' }}</p>
        </div>
        <div class="panel p-4">
          <p class="text-sm font-semibold text-zinc-700">OCR 可用性</p>
          <span class="mt-2 inline-block rounded-full px-2 py-1 text-xs font-semibold" :class="availabilityClass(store.ocrStatus?.available)">
            {{ availabilityText(store.ocrStatus?.available) }}
          </span>
          <p class="mt-2 text-xs text-zinc-500">{{ store.ocrStatus?.message || '检测中' }}</p>
        </div>
        <div class="panel p-4">
          <p class="text-sm font-semibold text-zinc-700">Bark 可用性</p>
          <span class="mt-2 inline-block rounded-full px-2 py-1 text-xs font-semibold" :class="availabilityClass(store.barkStatus?.available)">
            {{ availabilityText(store.barkStatus?.available) }}
          </span>
          <p class="mt-2 text-xs text-zinc-500">{{ store.barkStatus?.message || '检测中' }}</p>
        </div>
      </article>
    </section>
  </div>
</template>
