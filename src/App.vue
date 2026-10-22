<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const menuOpen = ref(false)
const title = computed(() => String(route.meta.title ?? '首页'))
const showLayout = computed(() => route.meta.public !== true)
const navItems = [
  { name: 'dashboard', label: '首页', to: '/' },
  { name: 'bills', label: '账单', to: '/bills' },
  { name: 'users', label: '用户管理', to: '/users' },
  { name: 'settings', label: '系统设置', to: '/settings' }
]
function active(name: string) {
  if (name === 'bills') return ['bills', 'user-bills', 'user-records'].includes(String(route.name))
  if (name === 'users') return ['users', 'user-mappings'].includes(String(route.name))
  return route.name === name
}
watch(() => route.path, () => { menuOpen.value = false })
async function handleLogout() {
  await auth.logout()
  await router.push('/login')
}
</script>

<template>
  <RouterView v-if="!showLayout" />
  <div v-else class="app-shell">
    <header class="app-navigation">
      <div class="app-navigation-inner">
        <RouterLink to="/" class="brand">iCost Adapter</RouterLink>
        <nav class="desktop-navigation" aria-label="主导航">
          <RouterLink v-for="item in navItems" :key="item.name" :to="item.to"
            :class="{ active: active(item.name) }" :aria-current="active(item.name) ? 'page' : undefined">
            {{ item.label }}
          </RouterLink>
        </nav>
        <div class="account-navigation">
          <span class="hidden sm:inline">{{ auth.user?.username ?? '管理员' }}</span>
          <el-button text @click="handleLogout">退出登录</el-button>
          <el-button class="mobile-menu-button" :aria-expanded="menuOpen" aria-controls="mobile-navigation" @click="menuOpen = !menuOpen">
            {{ menuOpen ? '收起导航' : '导航菜单' }}
          </el-button>
        </div>
      </div>
      <nav v-if="menuOpen" id="mobile-navigation" class="mobile-navigation" aria-label="移动端导航">
        <RouterLink v-for="item in navItems" :key="item.name" :to="item.to"
          :class="{ active: active(item.name) }" :aria-current="active(item.name) ? 'page' : undefined">{{ item.label }}</RouterLink>
      </nav>
    </header>
    <main class="app-content">
      <header class="page-heading">
        <nav v-if="route.params.userId" class="breadcrumb" aria-label="面包屑">
          <RouterLink v-if="active('bills')" to="/bills">账单</RouterLink><RouterLink v-else to="/users">用户管理</RouterLink><span aria-hidden="true">/</span><span>{{ title }}</span>
        </nav>
        <h1>{{ title }}</h1>
      </header>
      <RouterView :key="route.params.userId ? String(route.params.userId) + String(route.name) : route.name" />
    </main>
  </div>
</template>