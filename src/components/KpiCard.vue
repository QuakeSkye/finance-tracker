<script setup lang="ts">
defineProps<{
  label: string
  value: string
  hint?: string
}>()
</script>

<template>
  <article class="panel p-4">
    <p class="text-xs uppercase tracking-[0.16em] text-zinc-500">{{ label }}</p>
    <p class="display-font mt-2 text-3xl font-bold text-ink">{{ value }}</p>
    <p v-if="hint" class="mt-2 text-xs text-zinc-500">{{ hint }}</p>
  </article>
</template>
