import test from 'node:test'
import assert from 'node:assert/strict'
import worker from '../worker.js'
test('proxy preserves auth, body, CSRF and returns secure noncached cookie', async () => {
  const original = globalThis.fetch
  globalThis.fetch = async (request, options) => {
    assert.equal(request.url, 'https://api.coulson-finance.com/api/v1/auth/login')
    assert.equal(request.headers.get('x-csrf-protection'), '1')
    assert.equal(await request.text(), '{"test":true}')
    assert.equal(options.redirect, 'manual')
    return new Response('{}', {headers:{'set-cookie':'admin_session=test; HttpOnly; Path=/'}})
  }
  try {
    const r=await worker.fetch(new Request('https://coulson-finance.com/api/v1/auth/login', {method:'POST',headers:{'x-csrf-protection':'1'},body:'{"test":true}'}),{})
    assert.equal(r.headers.get('cache-control'),'no-store')
    assert.match(r.headers.get('set-cookie'), /; Secure/)
  } finally { globalThis.fetch=original }
})
test('bill deep links use static SPA binding', async () => {
 const r=await worker.fetch(new Request('https://coulson-finance.com/users/1/bills'),{ASSETS:{fetch:async()=>new Response('SPA')}})
 assert.equal(await r.text(),'SPA')
})
test('unknown API never returns HTML', async () => {
 const r=await worker.fetch(new Request('https://coulson-finance.com/api/unknown'),{})
 assert.equal(r.status,404)
})
