// Isolated UI regression: every API request is mocked; no real account or credential is modified.
// Windows: set NODE_PATH to the bundled dependencies, then run this file with Node.
// REVIEW_TEST_URL defaults to the local Vite server. REVIEW_BROWSER defaults to msedge.
const { chromium } = require('playwright')
const assert = require('node:assert/strict')
async function main() {
  const browser = await chromium.launch({ channel: process.env.REVIEW_BROWSER || 'msedge', headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  const users = [
    { id: 1, display_name: '我本人', enabled: true, token_prefix: 'test-prefix',
      credential: { configured: false, masked: null, status: '未配置', updated_at: null } },
    { id: 2, display_name: '业务用户乙', enabled: true, token_prefix: null,
      credential: { configured: false, masked: null, status: '未配置', updated_at: null } }
  ]
  const rows = Array.from({ length: 43 }, (_, index) => ({
    id: index + 1, mapping_type: 'category', transaction_type: index % 2 ? 'any' : 'expense',
    local_value: '匹配值' + index, icost_value: '分类' + index, match_keywords: index === 0
      ? [String.raw`\d{1,3}`, '早餐', '午餐', '晚餐', '其他关键词']
      : ['关键词' + index, '另一关键词' + index, '第三关键词' + index],
    match_mode: index === 0 ? 'regex' : 'equals', priority: index, enabled: true, is_default: false
  }))
  const failures = [1, 2].flatMap(id => Array.from({ length: id === 1 ? 21 : 1 }, (_, index) => ({
    id: id === 1 ? index + 1 : 101, ledger_user_id: id, request_id: 'req-' + id + '-' + index,
    created_at: '2026-10-22T07:00:00', error_stage: 'configuration', error_code: 'KEY_MISSING',
    message: id === 1 ? '甲的失败记录' + index : '乙的失败记录', provider_key: 'deepseek', model: 'test', latency_ms: null
  })))
  let loggedIn = false, keySaved = null, lastPayload = null, userUpdates = 0, rotations = 0
  let mappingLoadError = false, switchError = false, switchUpdates = 0
  await page.route('**/api/v1/**', async route => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname
    let status = 200, body = {}
    if (path.endsWith('/auth/me')) { status = loggedIn ? 200 : 401; body = loggedIn ? { id: 1, username: 'admin' } : { detail: 'ADMIN_AUTH_REQUIRED' } }
    else if (path.endsWith('/auth/login')) { loggedIn = true; body = { success: true } }
    else if (path === '/api/v1/ledger-users') body = { items: users }
    else if (path === '/api/v1/system/status') body = { user_count: 2, failure_count: 22, database_available: false }
    else if (path === '/api/v1/settings') body = { model: 'test-model', upload_max_size_bytes: 10485760 }
    else {
      const match = path.match(/^\/api\/v1\/ledger-users\/(\d+)(.*)$/)
      if (!match) { status = 404; body = { detail: 'NOT_FOUND' } }
      else {
        const id = Number(match[1]), user = users.find(item => item.id === id), tail = match[2]
        if (!tail && req.method() === 'PATCH') { userUpdates++; Object.assign(user, req.postDataJSON()); body = user }
        else if (!tail) body = user
        else if (tail === '/mappings' && req.method() === 'GET') {
          status = mappingLoadError ? 503 : 200
          body = mappingLoadError ? { detail: 'SERVICE_UNAVAILABLE' } : { items: rows, total: rows.length }
        } else if (/^\/mappings\/\d+$/.test(tail) && req.method() === 'PATCH') {
          const row = rows.find(item => item.id === Number(tail.split('/').pop()))
          const payload = req.postDataJSON()
          if (Object.keys(payload).length === 1 && 'enabled' in payload) {
            switchUpdates++
            await new Promise(resolve => setTimeout(resolve, 120))
            status = switchError ? 500 : 200
            body = switchError ? { detail: 'UPDATE_FAILED' } : Object.assign(row, payload)
          } else { lastPayload = payload; body = Object.assign(row, payload) }
        } else if (tail === '/recognition-failures') {
          const result = failures.filter(item => item.ledger_user_id === id)
          const offset = Number(url.searchParams.get('offset') || 0), limit = Number(url.searchParams.get('limit') || 20)
          body = { items: result.slice(offset, offset + limit), total: result.length }
        } else if (tail.startsWith('/recognition-failures/')) {
          const record = failures.find(item => item.ledger_user_id === id && item.id === Number(tail.split('/').pop()))
          status = record ? 200 : 404; body = record || { detail: 'RECORD_NOT_FOUND' }
        } else if (tail === '/deepseek-key' && req.method() === 'PUT') {
          assert.equal(req.headers()['x-csrf-protection'], '1')
          keySaved = req.postDataJSON().api_key
          user.credential = { configured: true, masked: '***1234', status: '已配置，未验证', updated_at: null }
          body = user.credential
        } else if (tail === '/token/rotate') { rotations++; body = { token: 'fake-test-token-only' } }
        else { status = 404; body = { detail: 'NOT_FOUND' } }
      }
    }
    await route.fulfill({ status, json: body })
  })
  const base = process.env.REVIEW_TEST_URL || 'http://127.0.0.1:5173'
  const waitFor = async condition => {
    for (let count = 0; count < 100; count++) {
      if (await condition()) return
      await new Promise(resolve => setTimeout(resolve, 30))
    }
    throw new Error('Assertion timed out')
  }
  const userMenu = async () => page.getByRole('button', { name: '用户 001：更多操作', exact: true }).click()
  const popupWidths = [1920, 1440, 1280, 1024, 390, 320]
  // Measure the panel itself: role=dialog on MessageBox is the full-screen overlay.
  const assertPanel = async (selector, width, gutter = 16, centered = true) => {
    const panel = page.locator(selector + ':visible')
    await waitFor(async () => await panel.count() === 1)
    await panel.waitFor({ state: 'visible' })
    const viewport = page.viewportSize().width
    const expected = Math.min(width, viewport - gutter * 2)
    await waitFor(async () => {
      const box = await panel.boundingBox()
      return box && Math.abs(box.width - expected) < 2 && box.x >= gutter - 1 && box.x + box.width <= viewport - gutter + 1 &&
        (!centered || Math.abs(box.x + box.width / 2 - viewport / 2) < 2)
    })
    const geometry = await panel.evaluate(element => ({ width: element.clientWidth, content: element.scrollWidth }))
    assert.ok(geometry.content <= geometry.width + 1, selector + ' content must fit at ' + viewport + 'px')
  }
  try {
    await page.goto(base + '/users/1/recognition-records')
    await page.waitForURL('**/login?redirect=**')
    await page.getByPlaceholder('admin').fill('admin')
    await page.getByPlaceholder('请输入密码').fill('fake-password')
    await page.getByRole('button', { name: '登录', exact: true }).click()
    await page.waitForURL('**/users/1/recognition-records')
    await page.getByText('甲的失败记录0', { exact: true }).waitFor()
    assert.equal(await page.locator('.el-table__body tr').count(), 20)
    await page.getByRole('button', { name: '详情', exact: true }).first().click()
    await page.getByRole('dialog').getByText('#1', { exact: true }).waitFor()
    for (const width of popupWidths) {
      await page.setViewportSize({ width, height: 900 })
      await assertPanel('.el-drawer', 600, 0, false)
    }
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.reload()
    await page.getByRole('dialog').getByText('#1', { exact: true }).waitFor()
    await page.keyboard.press('Escape')
    await page.waitForURL('**/users/1/recognition-records')
    await page.locator('.btn-next').click()
    await page.getByText('甲的失败记录20', { exact: true }).waitFor()
    await page.goto(base + '/users/2/recognition-records')
    await page.getByText('乙的失败记录', { exact: true }).waitFor()
    assert.equal(await page.getByText('甲的失败记录0', { exact: true }).count(), 0)
    await page.goto(base + '/users/2/recognition-records/1')
    await page.getByRole('dialog').getByText('记录不存在、已到期或不属于当前用户。', { exact: true }).waitFor()

    await page.goto(base + '/users')
    await page.getByRole('heading', { name: '用户 001', exact: true }).waitFor()
    assert.equal(await page.getByText('我本人', { exact: true }).count(), 0)
    await page.getByRole('button', { name: '配置 API Key', exact: true }).first().click()
    await page.getByPlaceholder('请输入 API Key').fill('fake-user-key-1234')
    await page.getByRole('button', { name: '保存 API Key', exact: true }).click()
    await page.getByRole('dialog').waitFor({ state: 'hidden' })
    assert.equal(keySaved, 'fake-user-key-1234')
    await page.getByRole('button', { name: '配置 API Key', exact: true }).first().click()
    assert.equal(await page.getByPlaceholder('请输入 API Key').inputValue(), '')
    await page.keyboard.press('Escape')
    await userMenu()
    await page.getByRole('menuitem', { name: '停用用户', exact: true }).click()
    await page.getByRole('button', { name: '取消', exact: true }).click()
    assert.equal(userUpdates, 0)
    await userMenu()
    await page.getByRole('menuitem', { name: '停用用户', exact: true }).click()
    await page.getByRole('button', { name: '确认停用', exact: true }).click()
    await waitFor(() => userUpdates === 1 && users[0].enabled === false)
    await userMenu()
    await page.getByRole('menuitem', { name: '轮换 Token', exact: true }).click()
    await page.getByRole('button', { name: '确认轮换', exact: true }).click()
    const token = page.getByRole('textbox', { name: '一次性 Token' })
    await token.waitFor()
    assert.equal(await token.inputValue(), 'fake-test-token-only')
    for (const width of popupWidths) {
      await page.setViewportSize({ width, height: 900 })
      await assertPanel('.el-dialog', 550)
      await page.keyboard.press('Escape')
      await assertPanel('.el-message-box', 420)
      await page.getByRole('button', { name: '返回保存', exact: true }).click()
      await waitFor(async () => await page.locator('.el-message-box:visible').count() === 0)
    }
    assert.equal(rotations, 1)
    assert.equal(await page.getByRole('button', { name: '完成', exact: true }).isEnabled(), false)
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: '返回保存', exact: true }).click()
    assert.equal(await token.inputValue(), 'fake-test-token-only')
    await page.getByText('我已妥善保存 Token', { exact: true }).click()
    await page.getByRole('button', { name: '完成', exact: true }).click()
    await token.waitFor({ state: 'hidden' })
    assert.equal(await page.locator('input[aria-label="一次性 Token"]').inputValue(), '')

    for (const width of popupWidths) {
      await page.setViewportSize({ width, height: 900 })
      await page.getByRole('button', { name: '配置 API Key', exact: true }).first().click()
      await assertPanel('.el-dialog', 520)
      await page.getByRole('button', { name: '删除 API Key', exact: true }).click()
      await assertPanel('.el-message-box', 420)
      await page.getByRole('button', { name: '取消', exact: true }).click()
      await page.keyboard.press('Escape')
      await waitFor(async () => await page.getByRole('dialog').count() === 0)
      for (const action of ['修改名称', '轮换 Token', '撤销 Token', '启用用户']) {
        await userMenu()
        await page.getByRole('menuitem', { name: action, exact: true }).click()
        await assertPanel('.el-message-box', 420)
        await page.getByRole('button', { name: '取消', exact: true }).click()
        await page.getByRole('dialog').waitFor({ state: 'hidden' })
      }
      // The screenshot's issuance variant uses the same confirmation component.
      await page.getByRole('button', { name: '业务用户乙：更多操作', exact: true }).click()
      await page.getByRole('menuitem', { name: '签发 Token', exact: true }).click()
      await assertPanel('.el-message-box', 420)
      await page.getByRole('button', { name: '取消', exact: true }).click()
      await page.getByRole('dialog').waitFor({ state: 'hidden' })
    }
    assert.equal(rotations, 1, 'layout checks must not issue or rotate additional tokens')
    assert.equal(userUpdates, 1, 'layout checks must not change user settings')
    await page.setViewportSize({ width: 1280, height: 900 })

    await page.goto(base + '/users/1/mappings')
    await page.getByText('共 43 条', { exact: true }).waitFor()
    assert.equal(await page.locator('.el-table__body tr').count(), 20)
    assert.ok(await page.getByRole('navigation', { name: '主导航', exact: true }).getByRole('link', { name: '用户管理' }).getAttribute('aria-current') === 'page')
    assert.ok(await page.locator('.el-table__body tr').first().evaluate(row => row.getBoundingClientRect().height) <= 64)
    await page.getByRole('button', { name: '查看全部 5 个关键词' }).click()
    await page.getByText('其他关键词', { exact: true }).waitFor()
    await page.getByRole('heading', { name: '映射规则', exact: true }).click()
    await page.getByRole('button', { name: '编辑', exact: true }).first().click()
    const editor = page.getByRole('dialog', { name: '编辑映射规则' })
    assert.equal(await editor.getByLabel('优先级', { exact: true }).inputValue(), '0')
    await editor.getByLabel('写入 iCost 的值', { exact: true }).fill('修改后的分类')
    await page.getByRole('button', { name: '保存规则', exact: true }).click()
    await editor.waitFor({ state: 'hidden' })
    assert.equal(lastPayload.priority, 0)
    assert.deepEqual(lastPayload.match_keywords, [String.raw`\d{1,3}`, '早餐', '午餐', '晚餐', '其他关键词'])
    switchError = true
    await page.locator('.el-switch').filter({ has: page.getByRole('switch', { name: '启用规则：修改后的分类' }) }).click()
    await waitFor(async () => switchUpdates === 1 && await page.getByRole('switch', { name: '启用规则：修改后的分类' }).isChecked() && await page.getByRole('switch', { name: '启用规则：修改后的分类' }).isEnabled())
    assert.equal(await page.getByRole('switch', { name: '启用规则：修改后的分类' }).isChecked(), true)
    await page.locator('.btn-next').click()
    await page.getByText('匹配值20 → 分类20', { exact: true }).waitFor()
    await page.getByRole('textbox', { name: '搜索映射规则' }).fill('匹配值42')
    await waitFor(async () => await page.locator('.el-table__body tr').count() === 1)
    await page.getByText('匹配值42 → 分类42', { exact: true }).waitFor()
    await page.getByRole('textbox', { name: '搜索映射规则' }).fill('不存在的分类')
    await page.getByText('没有符合筛选条件的规则', { exact: true }).waitFor()
    await page.getByRole('button', { name: '重置筛选', exact: true }).first().click()

    for (const width of popupWidths) {
      await page.setViewportSize({ width, height: 900 })
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      assert.ok(await page.locator('.el-table__body tr').first().evaluate(row => row.getBoundingClientRect().height) <= 64)
      await page.getByRole('button', { name: '新增规则', exact: true }).first().click()
      const box = await page.getByRole('dialog').boundingBox()
      assert.ok(box.x >= 0 && box.x + box.width <= width + 1)
      await assertPanel('.el-dialog', 620)
      await page.getByLabel('写入 iCost 的值', { exact: true }).fill('未保存的内容')
      await page.getByRole('button', { name: '取消', exact: true }).click()
      await assertPanel('.el-message-box', 420)
      await page.getByRole('button', { name: '放弃修改', exact: true }).click()
      await page.getByRole('dialog', { name: '新增映射规则', exact: true }).waitFor({ state: 'hidden' })
      await page.getByRole('button', { name: '删除', exact: true }).first().click()
      await assertPanel('.el-message-box', 420)
      await page.getByRole('button', { name: '取消', exact: true }).click()
      await page.getByRole('dialog').waitFor({ state: 'hidden' })
    }
    await page.setViewportSize({ width: 390, height: 900 })
    await page.getByRole('button', { name: '新增规则', exact: true }).first().click()
    await page.getByLabel('写入 iCost 的值', { exact: true }).fill('未保存的内容')
    await page.getByRole('button', { name: '取消', exact: true }).click()
    await page.getByRole('button', { name: '继续编辑', exact: true }).click()
    assert.equal(await page.getByLabel('写入 iCost 的值', { exact: true }).inputValue(), '未保存的内容')
    await page.getByRole('button', { name: '取消', exact: true }).click()
    await page.getByRole('button', { name: '放弃修改', exact: true }).click()
    await page.getByRole('dialog', { name: '新增映射规则', exact: true }).waitFor({ state: 'hidden' })
    mappingLoadError = true
    await page.getByRole('button', { name: '刷新', exact: true }).click()
    await page.getByText('映射规则加载失败', { exact: true }).waitFor()
    mappingLoadError = false
    await page.getByRole('button', { name: '重新加载', exact: true }).first().click()
    await page.getByText('匹配值0 → 修改后的分类', { exact: true }).waitFor()
    await page.goto(base + '/users')
    await page.getByRole('heading', { name: '用户 001', exact: true }).waitFor()
    assert.ok((await page.getByRole('heading', { name: '用户管理', exact: true }).boundingBox()).y < 150)
    assert.ok((await page.getByRole('heading', { name: '用户 001', exact: true }).boundingBox()).y < 750)
    await page.goto(base + '/')
    await page.getByText('连接异常', { exact: true }).waitFor()
    await page.goto(base + '/records/1')
    await page.getByRole('heading', { name: '复核及成功记录功能已移除' }).waitFor()
    assert.deepEqual(errors, [])
    console.log('PASS: login return; per-user failures/pagination/deep links; neutral names; write-only Key; stop confirmation; one-time Token guard; priority zero; regex commas; mapping search/pagination; switch rollback; dirty editor; error retry; 1440/1280/1024/390 layouts; retired links')
  } finally { await browser.close() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
