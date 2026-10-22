const { chromium } = require('playwright')
const assert = require('node:assert/strict')
;(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  try {
    const page = await browser.newPage()
    await page.route('**/api/v1/**', async route => {
      const path = new URL(route.request().url()).pathname
      const m = path.match(/ledger-users\/(\d+)(.*)/)
      let data = {}, status = 200
      if (path.endsWith('/auth/me')) data = { id: 1, username: 'admin' }
      else if (path === '/api/v1/ledger-users') data = { items: [1,2].map(id => ({ id, display_name: '用户'+id, enabled: true, token_prefix: id===1 ? 'masked' : null, credential: {configured: id===1} })) }
      else if (path === '/api/v1/system/status') data = { failure_count: 1, database_available: true }
      else if (m) {
        const user = Number(m[1]), suffix = m[2]
        const bill = { id: user * 100, ledger_user_id: user, transaction_type: 'expense', amount: '12.30', currency: 'CNY', date: '2026-10-22', merchant: '用户' + user + '专属商家', category: '餐饮', book: '账本' + user, status: 'delivered_to_shortcut' }
        if (!suffix) data = { id: user, display_name: '用户' + user }
        else if (suffix === '/recognition-failures') data = { items: [], total: user === 1 ? 1 : 0 }
        else if (suffix === '/bills') data = { items: [bill], total: 1, totals: [{ currency: 'CNY', expense: '12.30', income: '0.00', transfer: '0.00' }] }
        else if (suffix === '/bills/' + bill.id) data = bill
        else { status = 404; data = { detail: 'RECORD_NOT_FOUND' } }
      }
      await route.fulfill({ status, json: data })
    })
    await page.goto('http://127.0.0.1:5173/')
    const nav = page.getByRole('navigation', { name: '主导航', exact: true })
    assert.deepEqual(await nav.getByRole('link').allTextContents(), ['首页', '账单', '用户管理', '系统设置'])
    await page.getByText('未配置 DeepSeek Key · 未签发 Token', {exact: true}).waitFor()
    await nav.getByRole('link', {name:'账单', exact:true}).click()
    await page.getByText('选择要查看的账单', {exact:true}).waitFor()
    await page.getByRole('link', {name:'查看账单 →', exact:true}).first().click()
    assert.equal(await nav.getByRole('link', {name:'账单', exact:true}).getAttribute('aria-current'), 'page')
    await page.getByText('用户1专属商家', { exact: true }).waitFor()
    await page.getByRole('button', { name: '详情', exact: true }).click()
    await page.getByRole('dialog').getByText('#100', { exact: true }).waitFor()
    await page.reload()
    await page.getByRole('dialog').getByText('#100', { exact: true }).waitFor()
    await page.keyboard.press('Escape')
    await page.waitForURL('**/users/1/bills')
    await page.goto('http://127.0.0.1:5173/users/2/bills')
    await page.getByText('用户2专属商家', { exact: true }).waitFor()
    assert.equal(await page.getByText('用户1专属商家', { exact: true }).count(), 0)
    await page.goto('http://127.0.0.1:5173/users/2/bills/100')
    await page.getByRole('dialog').locator('.el-alert').waitFor()
    assert.equal(await page.getByRole('dialog').getByText('#100', { exact: true }).count(), 0)
    console.log('PASS: independent bill lists, detail, refresh, close, cross-user missing record')
  } finally { await browser.close() }
})().catch(e => { console.error(e); process.exitCode = 1 })
