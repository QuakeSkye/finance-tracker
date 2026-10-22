import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
const router = createRouter({
  history: createWebHistory(), routes: [
    { path: '/login', name: 'login', component: () => import('../pages/LoginPage.vue'), meta: { title: '登录', public: true } },
    { path: '/', name: 'dashboard', component: () => import('../pages/DashboardPage.vue'), meta: { title: '首页' } },
    { path: '/bills', name: 'bills', component: () => import('../pages/BillsPage.vue'), meta: { title: '账单' } },
    { path: '/users', name: 'users', component: () => import('../pages/UsersPage.vue'), meta: { title: '用户管理' } },
    { path: '/users/:userId([1-9]\\d*)/bills/:billId?', name: 'user-bills', component: () => import('../pages/UserBillsPage.vue'), meta: { title: '用户账单' } },
    { path: '/users/:userId([1-9]\\d*)/recognition-records/:failureId?', name: 'user-records', component: () => import('../pages/UserRecordsPage.vue'), meta: { title: '识别失败' } },
    { path: '/users/:userId([1-9]\\d*)/mappings', name: 'user-mappings', component: () => import('../pages/MappingsPage.vue'), meta: { title: '映射规则' } },
    { path: '/settings', name: 'settings', component: () => import('../pages/SettingsPage.vue'), meta: { title: '系统设置' } },
    { path: '/records/:pathMatch(.*)*', name: 'retired-records', component: () => import('../pages/RetiredPage.vue'), meta: { title: '功能已移除' } },
    { path: '/mappings', redirect: '/users' },
    { path: '/:pathMatch(.*)*', redirect: '/users' }
  ]
})
router.beforeEach(async to => {
  const auth = useAuthStore()
  if (!auth.initialized) await auth.checkAuth()
  if (!to.meta.public && !auth.isLoggedIn) return { name: 'login', query: { redirect: to.fullPath } }
  if (to.name === 'login' && auth.isLoggedIn) return '/'
})
router.afterEach(to => { document.title = `iCost Adapter · ${String(to.meta.title ?? '')}` })
export default router
