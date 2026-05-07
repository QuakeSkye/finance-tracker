import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: () => import('../pages/DashboardPage.vue'),
      meta: { title: '仪表盘' }
    },
    {
      path: '/transactions',
      name: 'transactions',
      component: () => import('../pages/TransactionsPage.vue'),
      meta: { title: '流水记录' }
    },
    {
      path: '/categories',
      name: 'categories',
      component: () => import('../pages/CategoriesPage.vue'),
      meta: { title: '分类管理' }
    },
    {
      path: '/cleanup',
      name: 'cleanup',
      component: () => import('../pages/CleanupPage.vue'),
      meta: { title: '清理中心' }
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../pages/SettingsPage.vue'),
      meta: { title: '系统设置' }
    }
  ]
})

router.afterEach((to) => {
  document.title = `智能记账 · ${String(to.meta.title ?? '')}`
})

export default router
