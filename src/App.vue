<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const title = computed(() => String(route.meta.title ?? '仪表盘'))

const navItems = [
  { name: 'dashboard', label: '仪表盘', to: '/' },
  { name: 'transactions', label: '流水记录', to: '/transactions' },
  { name: 'categories', label: '分类管理', to: '/categories' },
  { name: 'cleanup', label: '清理中心', to: '/cleanup' },
  { name: 'settings', label: '系统设置', to: '/settings' }
]
</script>

<template>
  <div class="mx-auto flex min-h-screen max-w-[1500px] flex-col px-4 py-4 md:flex-row md:gap-4">
    <aside class="panel reveal mb-4 w-full p-4 md:mb-0 md:w-72 md:p-6">
      <p class="display-font mb-1 text-2xl font-bold">智能记账</p>
      <p class="mb-6 text-sm text-zinc-600">本地自动记账系统</p>
      <nav class="grid gap-2">
        <RouterLink
          v-for="item in navItems"
          :key="item.name"
          :to="item.to"
          class="rounded-xl px-3 py-2 text-sm font-semibold transition"
          :class="route.name === item.name ? 'bg-ink text-white' : 'bg-zinc-100/70 text-zinc-700 hover:bg-zinc-200/80'"
        >
          {{ item.label }}
        </RouterLink>
      </nav>
      <div class="mt-8 rounded-xl bg-deep p-4 text-sm text-white">
        <p class="mb-1 font-semibold">系统状态</p>
        <p class="text-xs text-zinc-200">所有功能已接入后端接口，系统运行正常。</p>
      </div>
    </aside>

    <main class="reveal-2 min-w-0 flex-1">
      <header class="panel mb-4 flex items-center justify-between px-5 py-4">
        <h1 class="display-font text-2xl font-bold md:text-3xl">{{ title }}</h1>
        <div class="rounded-full border border-signal/40 bg-signal/10 px-3 py-1 text-xs font-bold text-signal">
          桌面版
        </div>
      </header>
      <section class="reveal-3">
        <RouterView />
      </section>
    </main>
  </div>
</template>
