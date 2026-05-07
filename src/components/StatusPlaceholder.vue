<script setup lang="ts">
defineProps<{
  title: string
  description: string
}>()
</script>

<template>
  <div class="panel border-dashed border-zinc-300 p-4">
    <p class="text-sm font-semibold text-zinc-700">{{ title }}</p>
    <p class="mt-2 text-xs text-zinc-500">{{ description }}</p>
    <span class="mt-3 inline-block rounded-full bg-zinc-200 px-2 py-1 text-[11px] font-semibold text-zinc-600">
      已接入
    </span>
  </div>
</template>
