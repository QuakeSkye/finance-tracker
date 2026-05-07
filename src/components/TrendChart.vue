<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'

const props = defineProps<{
  labels: string[]
  values: number[]
}>()

const elRef = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null

function render() {
  if (!elRef.value) {
    return
  }
  if (!chart) {
    chart = echarts.init(elRef.value)
  }
  chart.setOption({
    backgroundColor: 'transparent',
    grid: { left: 30, right: 20, top: 20, bottom: 24 },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: props.labels,
      axisLine: { lineStyle: { color: '#c7c2b7' } },
      axisLabel: { color: '#666' }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#e7e2d8' } },
      axisLabel: { color: '#666' }
    },
    series: [
      {
        type: 'line',
        smooth: true,
        data: props.values,
        lineStyle: { color: '#ef7f45', width: 3 },
        areaStyle: { color: 'rgba(239,127,69,0.16)' },
        itemStyle: { color: '#ef7f45' }
      }
    ]
  })
}

onMounted(() => {
  render()
  window.addEventListener('resize', render)
})

watch(() => [props.labels, props.values], render, { deep: true })

onBeforeUnmount(() => {
  window.removeEventListener('resize', render)
  chart?.dispose()
  chart = null
})
</script>

<template>
  <div ref="elRef" class="h-64 w-full" />
</template>
